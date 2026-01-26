import express from 'express';
import cors from 'cors';
import db from './db';
import { GoogleGenAI, Type } from "@google/genai";
import path from 'path';
import fs from 'fs';
import { Server } from 'http';
import { Buffer } from 'buffer';

// Global error handlers
(process as any).on('uncaughtException', (err: any) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});
(process as any).on('unhandledRejection', (reason: any, promise: any) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Cloudflare R2 Config
const R2_ACCOUNT_ID = '12816f3e935015a228c34426bf75125f';
const R2_BUCKET = 'chefnote';
const R2_TOKEN = '4EuRWRWwkGi7KvbB2Jy22cwh_XTb99U4pScWiiJe';
const R2_CDN_DOMAIN = 'cdn.yufish.tech';

// Initialize Gemini Client
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.warn('WARNING: API_KEY is not set. AI features will be disabled.');
}
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Ark (Volcengine) Config
const ARK_API_KEY = process.env.ARK_API_KEY || '3b42a72d-bd69-412f-bed2-21cc55b03aca';
const ARK_ENDPOINT_ID = process.env.ARK_ENDPOINT_ID; 
const ARK_IMAGE_URL = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
const ARK_CHAT_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

// Middleware
app.use(cors()); 
app.use(express.json({ limit: '50mb' }) as any);

// --- R2 Upload Helper ---
const uploadToR2 = async (base64Data: string): Promise<string> => {
  try {
    // Standardize base64 data extraction
    const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(base64, 'base64');
    
    // Generate unique file name
    const fileName = `chefnote-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    
    // Cloudflare R2 Management API PUT request
    const r2Url = `https://api.cloudflare.com/client/v4/accounts/${R2_ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects/${fileName}`;
    
    console.log(`[R2] Attempting upload: ${fileName} (${buffer.length} bytes)`);

    const response = await fetch(r2Url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${R2_TOKEN}`,
        'Content-Type': 'image/jpeg',
      },
      // Using Uint8Array is safer for cross-environment fetch implementations
      body: new Uint8Array(buffer)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[R2] Upload Failed. Status: ${response.status}. Body: ${errorText}`);
      throw new Error(`Cloudflare R2 API error: ${response.status} ${errorText}`);
    }

    const finalUrl = `https://${R2_CDN_DOMAIN}/${fileName}`;
    console.log(`[R2] Upload Successful: ${finalUrl}`);
    return finalUrl;
  } catch (err) {
    console.error("[R2] Fatal Upload Error:", err);
    throw err;
  }
};

// --- Helpers ---
const getTextModel = () => {
  const settings = db.get('settings').value();
  return settings?.aiModel || 'gemini-3-flash-preview';
};
const getImageModel = () => {
    const settings = db.get('settings').value();
    return settings?.imageModel || 'doubao-seedream-4-5-251128';
};
const safeJsonParse = (text: string) => {
  if (!text) throw new Error("Empty AI response");
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
  throw new Error(`JSON Parse Failed.`);
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

// --- Routes ---
app.get('/', (req, res) => res.send('ChefNote API Server is running.'));

app.post('/api/upload', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "Missing image data" });
    const url = await uploadToR2(image);
    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Upload failed" });
  }
});

app.get('/api/recipes', (req, res) => {
  try {
    const recipes = db.get('recipes').value();
    const sorted = [...recipes].sort((a: any, b: any) => b.createdAt - a.createdAt);
    res.json(sorted);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/recipes', (req, res) => {
  try {
    const newRecipe = req.body;
    db.get('recipes').unshift(newRecipe).write();
    res.status(201).json(newRecipe);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.put('/api/recipes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    db.get('recipes').find({ id }).assign(updates).write();
    const updated = db.get('recipes').find({ id }).value();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.delete('/api/recipes/:id', (req, res) => {
  try {
    db.get('recipes').remove({ id: req.params.id }).write();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/categories', (req, res) => res.json(db.get('categories').value()));
app.put('/api/categories', (req, res) => {
  db.set('categories', req.body).write();
  res.json(req.body);
});
app.get('/api/settings', (req, res) => res.json(db.get('settings').value() || {}));
app.put('/api/settings', (req, res) => {
  const current = db.get('settings').value() || {};
  const newSettings = { ...current, ...req.body };
  db.set('settings', newSettings).write();
  res.json(newSettings);
});

// --- AI Routes ---
app.post('/api/ai/search', async (req, res) => {
  const modelName = getTextModel();
  const { query, recipes } = req.body;
  const prompt = `User Search Query: "${query}"\nAvailable Recipes (JSON): ${JSON.stringify(recipes.map((r: any) => ({ id: r.id, title: r.title })))} Task: Select best match. Return JSON: { "ids": ["id1"] }`;
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
  const prompt = `Select dishes for ${peopleCount} people. Balance meat/veg. Available: ${JSON.stringify(recipes.map((r: any) => ({ id: r.id, title: r.title })))} Return JSON: { "selectedIds": [] }`;
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
  const prompt = `Poetic menu theme for: ${selectedRecipes.map((r: any) => r.title).join(', ')}. Return JSON: { "title": "...", "description": "...", "idiom": "...", "themeColor": "...", "seasonalPhrase": "..." }`;
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
            if (!base64) throw new Error("No image returned");
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

app.listen(PORT, '0.0.0.0', () => console.log(`Backend port ${PORT}`));