import express from 'express';
import cors from 'cors';
import db from './db';
import { GoogleGenAI, Type } from "@google/genai";
import path from 'path';
import fs from 'fs';
import { Server } from 'http';
import { Buffer } from 'buffer';

// Global error handlers to prevent silent crashes
(process as any).on('uncaughtException', (err: any) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});
(process as any).on('unhandledRejection', (reason: any, promise: any) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
// Railway requires using the PORT env variable. 
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Initialize Gemini Client
const apiKey = process.env.API_KEY;
console.log('Initializing Gemini Client...');
if (!apiKey) {
  console.warn('WARNING: API_KEY is not set. AI features will be disabled.');
}
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Ark (Volcengine) Config
const ARK_API_KEY = process.env.ARK_API_KEY || '3b42a72d-bd69-412f-bed2-21cc55b03aca';
// CRITICAL: Chat completion requires an Endpoint ID (e.g. ep-2024...), NOT a model name.
const ARK_ENDPOINT_ID = process.env.ARK_ENDPOINT_ID; 

const ARK_IMAGE_URL = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
const ARK_CHAT_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

// Middleware
app.use(cors()); 
app.use(express.json({ limit: '50mb' }) as any);

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- Helpers ---

// Helper to get text model from DB
const getTextModel = () => {
  const settings = db.get('settings').value();
  return settings?.aiModel || 'gemini-3-flash-preview';
};

// Helper to get image model from DB
const getImageModel = () => {
    const settings = db.get('settings').value();
    return settings?.imageModel || 'doubao-seedream-4-5-251128';
};

/**
 * Robust JSON Parser for AI Responses
 */
const safeJsonParse = (text: string) => {
  if (!text) throw new Error("Empty AI response");
  
  try {
    return JSON.parse(text);
  } catch (e) {}

  let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  try {
    return JSON.parse(clean);
  } catch (e) {}

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
    try {
      return JSON.parse(jsonSubstring);
    } catch (e) {
      console.error("Failed to parse extracted JSON substring:", jsonSubstring);
    }
  }

  const preview = text.length > 500 ? text.substring(0, 500) + '...' : text;
  throw new Error(`JSON Parse Failed. Raw Output: ${preview}`);
};

/**
 * Normalizes AI response for menu recommendation.
 */
const normalizeMenuResponse = (parsed: any) => {
    if (Array.isArray(parsed)) {
        return { selectedIds: parsed };
    }
    
    if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.selectedIds)) {
            return parsed;
        }
        const possibleKeys = ['selected_recipes', 'recipes', 'ids', 'dishes', 'menu'];
        for (const key of possibleKeys) {
            if (Array.isArray(parsed[key])) {
                return { ...parsed, selectedIds: parsed[key] };
            }
        }
        const keys = Object.keys(parsed);
        for (const key of keys) {
             const val = parsed[key];
             if (Array.isArray(val) && (val.length === 0 || typeof val[0] === 'string' || typeof val[0] === 'number')) {
                 return { ...parsed, selectedIds: val.map(String) };
             }
        }
    }
    return parsed;
};

// --- Routes ---

app.get('/', (req, res) => {
  res.status(200).send('ChefNote API Server is running.');
});

app.get('/api/recipes', (req, res) => {
  try {
    const recipes = db.get('recipes').value();
    const sorted = [...recipes].sort((a: any, b: any) => b.createdAt - a.createdAt);
    res.json(sorted);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

app.post('/api/recipes', (req, res) => {
  try {
    const newRecipe = req.body;
    if (!newRecipe.title || !newRecipe.id) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    db.get('recipes').unshift(newRecipe).write();
    res.status(201).json(newRecipe);
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

app.put('/api/recipes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const existing = db.get('recipes').find({ id }).value();
    if (!existing) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }
    db.get('recipes').find({ id }).assign(updates).write();
    const updated = db.get('recipes').find({ id }).value();
    res.json(updated);
  } catch (error) {
    console.error('Error updating recipe:', error);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

app.get('/api/categories', (req, res) => {
  try {
    const categories = db.get('categories').value();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.put('/api/categories', (req, res) => {
  try {
    const newCategories = req.body;
    if (!Array.isArray(newCategories)) {
      res.status(400).json({ error: 'Categories must be an array' });
      return;
    }
    db.set('categories', newCategories).write();
    res.json(newCategories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update categories' });
  }
});

app.get('/api/settings', (req, res) => {
  try {
    const settings = db.get('settings').value() || { aiModel: 'gemini-3-flash-preview', imageModel: 'doubao-seedream-4-5-251128' };
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const updates = req.body;
    const current = db.get('settings').value() || { aiModel: 'gemini-3-flash-preview', imageModel: 'doubao-seedream-4-5-251128' };
    const newSettings = { ...current, ...updates };
    db.set('settings', newSettings).write();
    res.json(newSettings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// --- AI Routes ---

app.post('/api/ai/recommend-menu', async (req, res) => {
  const modelName = getTextModel();
  const { recipes, peopleCount } = req.body;
  
  if (!recipes || !peopleCount) {
       res.status(400).json({ error: 'Missing recipes or peopleCount' });
       return;
  }

  const month = new Date().getMonth() + 1;
  let season = 'Winter';
  if (month >= 3 && month <= 5) season = 'Spring';
  else if (month >= 6 && month <= 8) season = 'Summer';
  else if (month >= 9 && month <= 11) season = 'Autumn';

  const prompt = `
      I have a list of recipes (JSON). 
      I need to select dishes for a meal for ${peopleCount} people.
      Current Season: ${season}.

      Rules for selection:
      1. Quantity: Usually number of dishes = people count + 1 (or -1 if small eaters), ensure it's enough but not wasteful.
      2. Balance: Mix of meat, vegetables, and soup if available.
      3. Seasonality: Prefer dishes suitable for ${season}.
      4. Variety: Try not to repeat main ingredients too much.

      Available Recipes: 
      ${JSON.stringify(recipes.map((r: any) => ({ id: r.id, title: r.title, category: r.category, ingredients: r.ingredients })))}

      Return JSON format: { "selectedIds": ["id1", "id2", ...] }
      IMPORTANT: Return ONLY valid JSON.
  `;

  try {
      if (modelName.startsWith('doubao')) {
          if (!ARK_API_KEY) { return res.status(503).json({ error: 'Ark API Key not configured' }); }
          const targetModel = ARK_ENDPOINT_ID || modelName;
          const arkRes = await fetch(ARK_CHAT_URL, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${ARK_API_KEY}`
              },
              body: JSON.stringify({
                  model: targetModel,
                  temperature: 0.7, // Add temperature for variety
                  messages: [
                    { role: 'system', content: 'You are an expert chef assistant helping users select balanced and seasonal meals.' },
                    { role: 'user', content: prompt }
                  ],
                  response_format: { type: 'json_object' } 
              })
          });
          if (!arkRes.ok) throw new Error(`Ark API Error: ${arkRes.status}`);
          const data = await arkRes.json();
          const content = data.choices[0].message.content;
          let parsed = safeJsonParse(content);
          parsed = normalizeMenuResponse(parsed);
          res.json(parsed);
      } else {
          if (!ai) { return res.status(503).json({ error: 'Gemini API Key not set' }); }
          const response = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: { 
                systemInstruction: 'You are an expert chef assistant helping users select balanced and seasonal meals.',
                responseMimeType: 'application/json' 
              }
          });
          const parsed = safeJsonParse(response.text || '{}');
          res.json(normalizeMenuResponse(parsed));
      }
  } catch (error: any) {
      console.error('Recommendation Error:', error);
      res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/generate-menu', async (req, res) => {
  const modelName = getTextModel();
  const { recipes, selectedIds } = req.body;
  const selectedRecipes = recipes.filter((r: any) => selectedIds.includes(r.id));

  // Determine season for poetic context
  const month = new Date().getMonth() + 1;
  let season = 'Winter';
  if (month >= 3 && month <= 5) season = 'Spring';
  else if (month >= 6 && month <= 8) season = 'Summer';
  else if (month >= 9 && month <= 11) season = 'Autumn';

  const prompt = `
      Create a highly poetic and visually distinct menu theme for these dishes: ${selectedRecipes.map((r: any) => r.title).join(', ')}.
      Current Season: ${season}.
      
      Required Fields:
      - title: A poetic 4-character Chinese name for the meal (e.g. 荷塘月色, 岁晚林深).
      - description: A short, elegant description in Chinese (approx 15 words).
      - idiom: A 3-character artistic phrase or idiom that captures the soul of the meal (e.g. 寻味集, 慢生活, 悦己食).
      - themeColor: You MUST choose the most appropriate color based on the actual ingredients.
      - seasonalPhrase: A very concise, highly artistic and poetic Chinese sentence (max 12 characters) reflecting the CURRENT SEASON (${season}) and mood. It will be placed at the bottom of the menu. (e.g. "晚来天欲雪，能饮一杯无", "人间至味是清欢", "且将新火试新茶").
      
      CRITICAL COLOR RULES:
      - "red": Spicy (chili), bold meats, festive, or hot pots.
      - "green": Vegetable-heavy, healthy, organic, or light spring/summer vibes.
      - "blue": Seafood, chilled dishes, modern fusion, or summer cool.
      - "neutral": ONLY for classic comfort food, home stews, or earthy brown dishes.
      
      IMPORTANT: 
      - DO NOT default to "neutral". Be creative.
      - If there is seafood, prioritize "blue".
      - If there is spice, prioritize "red".
      
      Return JSON format: { "title": "...", "description": "...", "idiom": "...", "themeColor": "...", "seasonalPhrase": "..." }
      IMPORTANT: Return ONLY valid JSON.
      
      Random Seed: ${Math.random()}
  `;

  try {
      if (modelName.startsWith('doubao')) {
          console.log(`Using Doubao Model: ${ARK_ENDPOINT_ID || modelName}`);
          if (!ARK_API_KEY) { return res.status(503).json({ error: 'Ark API Key not configured' }); }
          const targetModel = ARK_ENDPOINT_ID || modelName;
          
          const arkRes = await fetch(ARK_CHAT_URL, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${ARK_API_KEY}`
              },
              body: JSON.stringify({
                  model: targetModel,
                  temperature: 0.95, // Higher temperature for varied style
                  messages: [
                    { role: 'system', content: 'You are a creative artistic director for high-end restaurants. You MUST generate varied and distinct themes. Avoid using the same style repeatedly.' },
                    { role: 'user', content: prompt }
                  ],
                  response_format: { type: 'json_object' } 
              })
          });
          
          if (!arkRes.ok) {
              const errText = await arkRes.text();
              console.error("Ark API Error Body:", errText);
              throw new Error(`Ark API Error: ${arkRes.status} - ${errText}`);
          }
          
          const data = await arkRes.json();
          console.log("Ark Raw Response:", JSON.stringify(data, null, 2));
          
          const content = data.choices[0].message.content;
          res.json(safeJsonParse(content));
      } else {
          if (!ai) { return res.status(503).json({ error: 'Gemini API Key not set' }); }
          const response = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: { 
                systemInstruction: 'You are a creative artistic director for high-end restaurants. You MUST generate varied and distinct themes.',
                responseMimeType: 'application/json' 
              }
          });
          res.json(safeJsonParse(response.text || '{}'));
      }
  } catch (error: any) {
      console.error('Menu Generation Error:', error);
      res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/generate-prep', async (req, res) => {
    const modelName = getTextModel();
    const { recipes, selectedIds } = req.body;
    const selectedRecipes = recipes.filter((r: any) => selectedIds.includes(r.id));

    const prompt = `
        Based on these recipes, generate a categorized prep list for a home cook.
        Combine similar ingredients.
        
        Recipes:
        ${JSON.stringify(selectedRecipes.map((r: any) => ({ title: r.title, ingredients: r.ingredients })))}

        Return a concise markdown list of ingredients to buy/prepare.
    `;

    try {
        if (modelName.startsWith('doubao')) {
            const targetModel = ARK_ENDPOINT_ID || modelName;
            const arkRes = await fetch(ARK_CHAT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ARK_API_KEY}` },
                body: JSON.stringify({ 
                  model: targetModel, 
                  messages: [
                    { role: 'system', content: 'You are a helpful kitchen assistant specializing in ingredient management.' },
                    { role: 'user', content: prompt }
                  ] 
                })
            });
            const data = await arkRes.json();
            res.json({ text: data.choices[0].message.content });
        } else {
            if (!ai) { return res.status(503).json({ error: 'Gemini API Key not set' }); }
            const response = await ai.models.generateContent({ 
              model: modelName, 
              contents: prompt,
              config: {
                systemInstruction: 'You are a helpful kitchen assistant specializing in ingredient management.'
              }
            });
            // Fix TS Error: Ensure string assignment
            res.json({ text: response.text || '' });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ai/generate-image', async (req, res) => {
    const modelName = getImageModel();
    const { prompt } = req.body;
    console.log(`Image Generation: ${prompt} (Model: ${modelName})`);

    try {
        if (modelName.startsWith('doubao')) {
            const arkRes = await fetch(ARK_IMAGE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ARK_API_KEY}` },
                body: JSON.stringify({
                    model: modelName,
                    prompt: prompt,
                    size: '2K', // Supported preset
                    response_format: 'b64_json', // Explicitly request base64
                    watermark: false // Disable watermark
                })
            });
            if (!arkRes.ok) {
                const errText = await arkRes.text();
                console.error("Doubao T2I Error:", errText);
                throw new Error(`Doubao Image Error: ${arkRes.status} - ${errText}`);
            }
            
            const data = await arkRes.json();
            
            // Log usage if available
            if (data.usage) {
                console.log("Doubao Usage:", JSON.stringify(data.usage));
            }

            // Strict response parsing based on user feedback
            const base64 = data.data?.[0]?.b64_json;
            if (!base64) {
                 console.error("Doubao response missing image data:", JSON.stringify(data));
                 throw new Error("Doubao returned no image data (b64_json is empty)");
            }
            res.json({ image: `data:image/png;base64,${base64}` });
        } else {
            if (!ai) { return res.status(503).json({ error: 'Gemini API Key not set' }); }
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: prompt,
                config: { imageConfig: { aspectRatio: "3:4" } },
            });
            let base64 = "";
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    // Fix TS Error: Ensure string assignment
                    base64 = part.inlineData.data || "";
                    break;
                }
            }
            if (!base64) throw new Error("No image data returned from Gemini");
            res.json({ image: `data:image/png;base64,${base64}` });
        }
    } catch (error: any) {
        console.error('Image Gen Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ai/optimize-image', async (req, res) => {
    const { image } = req.body;
    const modelName = getImageModel();
    console.log(`Image Optimization (Filter) requested. Model choice: ${modelName}`);

    const base64Data = image.split(',')[1] || image;
    const mimeType = image.split(';')[0].split(':')[1] || 'image/jpeg';

    try {
        if (modelName.startsWith('doubao')) {
            // Doubao (Volcengine) Image-to-Image implementation
            console.log("Using Doubao Img2Img...");
            
            const arkRes = await fetch(ARK_IMAGE_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${ARK_API_KEY}` 
                },
                body: JSON.stringify({
                    model: modelName,
                    // Use Chinese prompt for Doubao as it works better natively
                    prompt: "保持原有构图和食物主体，优化光影、色调和质感，使其具有高级美食摄影风格，增加暖色调和光泽感（锅气）。锐化细节，提升食欲感。",
                    // Note: 'image' must include the Data URI scheme header (e.g. data:image/png;base64,...)
                    image: image, 
                    size: '2K', 
                    strength: 0.65,
                    response_format: 'b64_json', // Explicitly request base64
                    watermark: false // Disable watermark
                })
            });

            if (!arkRes.ok) {
                const errText = await arkRes.text();
                console.error("Doubao Img2Img Error:", errText);
                throw new Error(`Doubao Optimize Error: ${arkRes.status} - ${errText}`);
            }

            const data = await arkRes.json();
            
            // Log usage if available
            if (data.usage) {
                console.log("Doubao Usage:", JSON.stringify(data.usage));
            }

            // Strict response parsing based on user feedback
            const resultBase64 = data.data?.[0]?.b64_json;
            
            if (!resultBase64) {
                 console.error("Doubao response missing image data:", JSON.stringify(data));
                 throw new Error("Doubao returned no image data (b64_json is empty)");
            }
            
            res.json({ image: `data:image/png;base64,${resultBase64}` });

        } else {
            // Fallback to Gemini
            if (!ai) { return res.status(503).json({ error: 'Gemini API Key not set' }); }
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { data: base64Data, mimeType: mimeType } },
                        { text: 'Retouch this food image to match the style of high-end social media food photography (like XiaoHongShu). Apply a "Warm & Glossy" filter: boost warm tones (golden/orange), increase contrast for depth, enhance the oily gloss ("锅气") on the food surface, and apply soft cinematic lighting. Sharpen details. CRITICAL: Keep the original food structure and plating 100% unchanged. Do not add or remove items. Return the image with these enhancements.' },
                    ],
                },
            });

            let resultBase64 = "";
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    resultBase64 = part.inlineData.data || "";
                    break;
                }
            }
            if (!resultBase64) throw new Error("Optimization failed - no image returned");
            res.json({ image: `data:image/png;base64,${resultBase64}` });
        }

    } catch (error: any) {
        console.error('Image Optimization Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ChefNote Backend running on port ${PORT}`);
  console.log(`API Base URL: http://0.0.0.0:${PORT}/api`);
});
