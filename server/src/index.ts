
import express from 'express';
import cors from 'cors';
import db from './db';
import { GoogleGenAI, Type } from "@google/genai";
import path from 'path';
import fs from 'fs';
import { Server } from 'http';
import { Buffer } from 'buffer';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// 全局错误捕获，防止因异步错误导致进程崩溃
(process as any).on('uncaughtException', (err: any) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});
(process as any).on('unhandledRejection', (reason: any, promise: any) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

/**
 * Cloudflare R2 S3-Compatible 配置
 * 使用您提供的 S3 凭据和专属 Endpoint
 */
const R2_BUCKET = 'chefnote';
const R2_ENDPOINT = 'https://12816f3e935015a228c34426bf75125f.r2.cloudflarestorage.com';
const R2_ACCESS_KEY_ID = 'bcf387260b58c035fe8d3cd298736feb';
const R2_SECRET_ACCESS_KEY = '324ceeb88918f90d46f970ec54403e30d188d1c17d4fcdfae47d5b3a5d9128ec';
const R2_CDN_DOMAIN = 'cdn.yufish.tech';

// 初始化 S3 客户端
const s3Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// 初始化 Gemini 客户端
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.warn('WARNING: API_KEY is not set. AI features will be disabled.');
}
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// 火山引擎 Ark 配置
const ARK_API_KEY = process.env.ARK_API_KEY || '3b42a72d-bd69-412f-bed2-21cc55b03aca';
const ARK_ENDPOINT_ID = process.env.ARK_ENDPOINT_ID; 
const ARK_IMAGE_URL = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
const ARK_CHAT_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

// 中间件配置
app.use(cors()); 
app.use(express.json({ limit: '50mb' }) as any);

/**
 * R2 上传工具函数 (使用 S3 协议)
 * 相比 Management API，S3 协议更适合处理您提供的 Access Key 和 Secret Key。
 */
const uploadToR2 = async (base64Data: string): Promise<string> => {
  try {
    // 处理 Base64 数据
    const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(base64, 'base64');
    
    // 生成唯一文件名
    const fileName = `recipe-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    
    console.log(`[R2] 正在通过 S3 协议上传: ${fileName} (${buffer.length} 字节)`);

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: fileName,
      Body: buffer,
      ContentType: 'image/jpeg',
    });

    await s3Client.send(command);

    const finalUrl = `https://${R2_CDN_DOMAIN}/${fileName}`;
    console.log(`[R2] 上传成功: ${finalUrl}`);
    return finalUrl;
  } catch (err: any) {
    console.error("[R2] S3 上传错误:", err);
    // 针对 403 权限错误给出明确提示
    if (err.name === 'Forbidden' || err.$metadata?.httpStatusCode === 403) {
      throw new Error(`R2 访问拒绝 (403): 请检查您的 S3 访问密钥 (ID/Secret) 是否正确，或 Bucket 名称 "${R2_BUCKET}" 是否存在且具有写权限。`);
    }
    throw err;
  }
};

// --- 下方为 API 路由处理逻辑 ---

app.get('/', (req, res) => res.send('ChefNote API Server is running.'));

// 图片上传接口
app.post('/api/upload', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "缺少图片数据" });
    const url = await uploadToR2(image);
    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "上传失败" });
  }
});

// 获取所有菜谱
app.get('/api/recipes', (req, res) => {
  try {
    const recipes = db.get('recipes').value();
    const sorted = [...recipes].sort((a: any, b: any) => b.createdAt - a.createdAt);
    res.json(sorted);
  } catch (error) {
    res.status(500).json({ error: '获取菜谱失败' });
  }
});

// 创建新菜谱
app.post('/api/recipes', (req, res) => {
  try {
    const newRecipe = req.body;
    db.get('recipes').unshift(newRecipe).write();
    res.status(201).json(newRecipe);
  } catch (error) {
    res.status(500).json({ error: '创建菜谱失败' });
  }
});

// 更新菜谱
app.put('/api/recipes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    db.get('recipes').find({ id }).assign(updates).write();
    const updated = db.get('recipes').find({ id }).value();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '更新菜谱失败' });
  }
});

// 删除菜谱
app.delete('/api/recipes/:id', (req, res) => {
  try {
    db.get('recipes').remove({ id: req.params.id }).write();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: '删除菜谱失败' });
  }
});

// 分类管理接口
app.get('/api/categories', (req, res) => res.json(db.get('categories').value()));
app.put('/api/categories', (req, res) => {
  db.set('categories', req.body).write();
  res.json(req.body);
});

// 设置管理接口
app.get('/api/settings', (req, res) => res.json(db.get('settings').value() || {}));
app.put('/api/settings', (req, res) => {
  const current = db.get('settings').value() || {};
  const newSettings = { ...current, ...req.body };
  db.set('settings', newSettings).write();
  res.json(newSettings);
});

// --- AI 助手相关路由 ---

app.post('/api/ai/search', async (req, res) => {
  const modelName = getTextModel();
  const { query, recipes } = req.body;
  const prompt = `用户搜索意图: "${query}"\n现有菜谱列表 (JSON): ${JSON.stringify(recipes.map((r: any) => ({ id: r.id, title: r.title })))} 请根据意图选出最匹配的菜谱。返回 JSON: { "ids": ["id1"] }`;
  try {
      let resultText = "";
      if (modelName.startsWith('doubao')) {
          const arkRes = await fetch(ARK_CHAT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ARK_API_KEY}` },
              body: JSON.stringify({ model: ARK_ENDPOINT_ID || modelName, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } })
          });
          const data = await arkRes.json();
          resultText = data.choices[0].message.content;
      } else {
          const response = await ai!.models.generateContent({ model: modelName, contents: prompt, config: { responseMimeType: 'application/json' } });
          resultText = response.text || "{}";
      }
      res.json(safeJsonParse(resultText));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/ai/recommend-menu', async (req, res) => {
  const modelName = getTextModel();
  const { recipes, peopleCount } = req.body;
  const prompt = `为 ${peopleCount} 个人推荐一桌菜，注意荤素搭配。可选菜谱: ${JSON.stringify(recipes.map((r: any) => ({ id: r.id, title: r.title })))} 返回 JSON 格式: { "selectedIds": [] }`;
  try {
      let resultText = "";
      if (modelName.startsWith('doubao')) {
          const arkRes = await fetch(ARK_CHAT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ARK_API_KEY}` },
              body: JSON.stringify({ model: ARK_ENDPOINT_ID || modelName, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } })
          });
          const data = await arkRes.json();
          resultText = data.choices[0].message.content;
      } else {
          const response = await ai!.models.generateContent({ model: modelName, contents: prompt, config: { responseMimeType: 'application/json' } });
          resultText = response.text || "{}";
      }
      res.json(normalizeMenuResponse(safeJsonParse(resultText)));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/ai/generate-menu', async (req, res) => {
  const modelName = getTextModel();
  const { recipes, selectedIds } = req.body;
  const selectedRecipes = recipes.filter((r: any) => selectedIds.includes(r.id));
  const prompt = `为这几道菜拟定一个具有诗意的菜单主题: ${selectedRecipes.map((r: any) => r.title).join(', ')}。返回 JSON: { "title": "...", "description": "...", "idiom": "...", "themeColor": "...", "seasonalPhrase": "..." }`;
  try {
      let resultText = "";
      if (modelName.startsWith('doubao')) {
          const arkRes = await fetch(ARK_CHAT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ARK_API_KEY}` },
              body: JSON.stringify({ model: ARK_ENDPOINT_ID || modelName, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } })
          });
          const data = await arkRes.json();
          resultText = data.choices[0].message.content;
      } else {
          const response = await ai!.models.generateContent({ model: modelName, contents: prompt, config: { responseMimeType: 'application/json' } });
          resultText = response.text || "{}";
      }
      res.json(safeJsonParse(resultText));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/ai/generate-image', async (req, res) => {
    const modelName = getImageModel();
    const { prompt } = req.body;
    try {
        if (modelName.startsWith('doubao')) {
            const arkRes = await fetch(ARK_IMAGE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ARK_API_KEY}` },
                body: JSON.stringify({ model: modelName, prompt, size: '2K', response_format: 'b64_json', watermark: false })
            });
            const data = await arkRes.json();
            const base64 = data.data?.[0]?.b64_json;
            if (!base64) throw new Error("生成图片失败，无数据返回");
            res.json({ image: base64 }); 
        } else {
            const response = await ai!.models.generateContent({ model: 'gemini-2.5-flash-image', contents: prompt, config: { imageConfig: { aspectRatio: "3:4" } } });
            let base64 = "";
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) { base64 = part.inlineData.data || ""; break; }
            }
            res.json({ image: base64 });
        }
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/ai/optimize-image', async (req, res) => {
    const { image } = req.body;
    const modelName = getImageModel();
    try {
        if (modelName.startsWith('doubao')) {
            const arkRes = await fetch(ARK_IMAGE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ARK_API_KEY}` },
                body: JSON.stringify({ model: modelName, prompt: "Artistic food photography style", image, size: '2K', strength: 0.65, response_format: 'b64_json', watermark: false })
            });
            const data = await arkRes.json();
            const base64 = data.data?.[0]?.b64_json;
            res.json({ image: `data:image/png;base64,${base64}` });
        } else {
            const response = await ai!.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [{ inlineData: { data: image.split(',')[1], mimeType: 'image/jpeg' } }, { text: 'retouch food photography style' }] } });
            let base64 = "";
            for (const part of response.candidates?.[0]?.content?.parts || []) if (part.inlineData) { base64 = part.inlineData.data || ""; break; }
            res.json({ image: `data:image/png;base64,${base64}` });
        }
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// 模型名称工具函数
const getTextModel = () => {
  const settings = db.get('settings').value();
  return settings?.aiModel || 'gemini-3-flash-preview';
};
const getImageModel = () => {
    const settings = db.get('settings').value();
    return settings?.imageModel || 'doubao-seedream-4-5-251128';
};

// JSON 解析辅助函数
const safeJsonParse = (text: string) => {
  if (!text) throw new Error("AI 返回内容为空");
  try { return JSON.parse(text); } catch (e) {}
  let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  try { return JSON.parse(clean); } catch (e) {}
  const firstOpenBrace = clean.indexOf('{');
  const firstOpenBracket = clean.indexOf('[');
  let startIndex = -1;
  let endIndex = -1;
  if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
      startIndex = firstOpenBrace;
      endIndex = clean.lastIndexOf('}');
  } else if (firstOpenBracket !== -1) {
      startIndex = firstOpenBracket;
      endIndex = clean.lastIndexOf(']');
  }
  if (startIndex !== -1 && endIndex !== -1) {
    const jsonSubstring = clean.substring(startIndex, endIndex + 1);
    try { return JSON.parse(jsonSubstring); } catch (e) {}
  }
  throw new Error(`JSON 解析失败`);
};

const normalizeMenuResponse = (parsed: any) => {
    if (Array.isArray(parsed)) return { selectedIds: parsed };
    if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.selectedIds)) return parsed;
        const possibleKeys = ['selected_recipes', 'recipes', 'ids', 'dishes', 'menu'];
        for (const key of possibleKeys) if (Array.isArray(parsed[key])) return { ...parsed, selectedIds: parsed[key] };
        const keys = Object.keys(parsed);
        for (const key of keys) {
             const val = parsed[key];
             if (Array.isArray(val) && (val.length === 0 || typeof val[0] === 'string' || typeof val[0] === 'number')) return { ...parsed, selectedIds: val.map(String) };
        }
    }
    return parsed;
};

app.listen(PORT, '0.0.0.0', () => console.log(`Backend is running on port ${PORT}`));
