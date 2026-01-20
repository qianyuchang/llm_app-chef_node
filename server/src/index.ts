import express from 'express';
import cors from 'cors';
import db from './db';
import { GoogleGenAI, Type } from "@google/genai";
import path from 'path';
import fs from 'fs';
import { Server } from 'http';

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

// Routes

// 1. Health Check - Critical for Railway
app.get('/', (req, res) => {
  res.status(200).send('ChefNote API Server is running.');
});

// 2. Get All Recipes
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

// 3. Create Recipe
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

// 4. Update Recipe
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

// 5. Get Categories
app.get('/api/categories', (req, res) => {
  try {
    const categories = db.get('categories').value();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// 6. Update Categories
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

// 7. Get Settings
app.get('/api/settings', (req, res) => {
  try {
    const settings = db.get('settings').value() || { aiModel: 'gemini-3-flash-preview', imageModel: 'doubao-seedream-4-5-251128' };
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// 8. Update Settings
app.put('/api/settings', (req, res) => {
  try {
    const updates = req.body;
    // Merge updates with existing settings (or defaults)
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
  console.log(`AI Request: Recommend Menu (Model: ${modelName})`);
  const { recipes, peopleCount } = req.body;
  
  if (!recipes || !peopleCount) {
       res.status(400).json({ error: 'Missing recipes or peopleCount' });
       return;
  }

  // Get current season
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

      Return a JSON object containing an array of selected recipe IDs.
      IMPORTANT: Return ONLY valid JSON.
  `;

  try {
      if (modelName.startsWith('doubao')) {
          if (!ARK_API_KEY) { return res.status(503).json({ error: 'Ark API Key not configured' }); }
          
          const arkRes = await fetch(ARK_CHAT_URL, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${ARK_API_KEY}`
              },
              body: JSON.stringify({
                  model: modelName, // e.g. doubao-1-5-pro-32k-250115
                  messages: [{ role: 'user', content: prompt }],
                  response_format: { type: 'json_object' } // Ensure JSON output if supported
              })
          });
          
          if (!arkRes.ok) throw new Error(`Ark API Error: ${arkRes.status}`);
          const data = await arkRes.json();
          const content = data.choices[0].message.content;
          res.json(JSON.parse(content));

      } else {
          // Gemini
          if (!ai) { return res.status(503).json({ error: 'Gemini API Key not configured' }); }
          
          const response = await ai.models.generateContent({
              model: modelName, 
              contents: prompt,
              config: { 
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        selectedIds: { 
                          type: Type.ARRAY, 
                          items: { type: Type.STRING },
                          description: "Array of recipe IDs to add to cart"
                        },
                        reasoning: { type: Type.STRING, description: "Short explanation in Chinese why this menu was chosen." }
                    },
                    required: ["selectedIds"]
                  }
              }
          });
          const json = JSON.parse(response.text || '{}');
          res.json(json);
      }
  } catch (error: any) {
      console.error('AI Recommend Menu Error:', error);
      res.status(500).json({ error: error.message || 'Failed to recommend menu' });
  }
});

app.post('/api/ai/generate-menu', async (req, res) => {
    const modelName = getTextModel();
    console.log(`AI Request: Generate Menu Theme (Model: ${modelName})`);
    const { recipes, selectedIds } = req.body;
    if (!recipes || !selectedIds) {
            res.status(400).json({ error: 'Missing recipes or selectedIds' });
            return;
    }

    const selectedRecipes = recipes.filter((r: any) => selectedIds.includes(r.id));
    const selectedNames = selectedRecipes.map((r: any) => r.title).join(", ");
    const date = new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const prompt = `
        Today is ${date}. 
        I have selected these dishes for a meal: ${selectedNames}.
        Please generate a sophisticated, high-end Chinese banquet menu theme.

        Requirements for 'description':
        - Do NOT describe the dishes or ingredients.
        - It MUST be a poetic, seasonal, or atmospheric sentence reflecting the mood (e.g., "The autumn breeze is refreshing," "A joyful gathering for the New Year," "Simple flavors of home").
        - Keep it elegant and brief (under 20 words).
        
        Return a JSON object.
    `;

    try {
        if (modelName.startsWith('doubao')) {
             if (!ARK_API_KEY) { return res.status(503).json({ error: 'Ark API Key not configured' }); }

             const arkRes = await fetch(ARK_CHAT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ARK_API_KEY}`
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' }
                })
            });
            if (!arkRes.ok) throw new Error(`Ark API Error: ${arkRes.status}`);
            const data = await arkRes.json();
            const content = data.choices[0].message.content;
            res.json(JSON.parse(content));

        } else {
             if (!ai) { return res.status(503).json({ error: 'Gemini API Key not configured' }); }

             const response = await ai.models.generateContent({
                model: modelName, 
                contents: prompt,
                config: { 
                    responseMimeType: "application/json",
                    responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "Theme title (e.g. 'Autumn Feast')" },
                        description: { type: Type.STRING, description: "Seasonal or atmospheric text, NOT dish summary." },
                        idiom: { type: Type.STRING, description: "A 4-character Chinese idiom" },
                        themeColor: { type: Type.STRING, enum: ["red", "green", "blue", "neutral"] }
                    },
                    required: ["title", "description", "idiom", "themeColor"]
                    }
                }
            });
            const json = JSON.parse(response.text || '{}');
            res.json(json);
        }
    } catch (error: any) {
        console.error('AI Generate Menu Error:', error);
        const errorMessage = error.message || 'Failed to generate menu';
        res.status(500).json({ error: errorMessage });
    }
});

app.post('/api/ai/generate-prep', async (req, res) => {
    const modelName = getTextModel();
    console.log(`AI Request: Generate Prep List (Model: ${modelName})`);
    const { recipes, selectedIds } = req.body;
    if (!recipes || !selectedIds) {
            res.status(400).json({ error: 'Missing recipes or selectedIds' });
            return;
    }
    const selectedRecipes = recipes.filter((r: any) => selectedIds.includes(r.id));
    const ingredientsData = selectedRecipes.map((r: any) => 
        `${r.title}: ${r.ingredients.map((i: any) => `${i.name} (${i.amount})`).join(', ')}`
    ).join('\n');
    
    const prompt = `
        Based on these dishes: ${ingredientsData}
        Generate a consolidated shopping/prep list.
        Just return the text content.
    `;

    try {
        if (modelName.startsWith('doubao')) {
             if (!ARK_API_KEY) { return res.status(503).json({ error: 'Ark API Key not configured' }); }
             
             const arkRes = await fetch(ARK_CHAT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ARK_API_KEY}`
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [{ role: 'user', content: prompt }]
                })
            });
            if (!arkRes.ok) throw new Error(`Ark API Error: ${arkRes.status}`);
            const data = await arkRes.json();
            const content = data.choices[0].message.content;
            res.json({ text: content });

        } else {
             if (!ai) { return res.status(503).json({ error: 'Gemini API Key not configured' }); }
             
             const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
            });
            res.json({ text: response.text });
        }
    } catch (error: any) {
        console.error('AI Generate Prep Error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate prep list' });
    }
});

app.post('/api/ai/optimize-image', async (req, res) => {
  if (!ai) {
      res.status(503).json({ error: 'Server API Key not configured' });
      return;
  }
  try {
      console.log('AI Request: Optimize Image (Model: gemini-2.5-flash-image)');
      const { image } = req.body; // Base64 string
      if (!image) {
           res.status(400).json({ error: 'Missing image data' });
           return;
      }

      // Robust base64 parsing
      let base64Data = image;
      let mimeType = 'image/jpeg'; // Default

      if (image.includes(',')) {
          const parts = image.split(',');
          base64Data = parts[1];
          const match = parts[0].match(/:(.*?);/);
          if (match) {
              mimeType = match[1];
          }
      }

      console.log(`Optimizing image type: ${mimeType}, length: ${base64Data.length}`);

      const prompt = "Enhance this food photo. Make it look like professional high-end food photography with warm lighting, appetizing glossy texture, and studio quality. Significantly improve the color grading, contrast and sharpness to make it mouth-watering.";

      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image', // Fixed model for image editing
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType,
                },
              },
              {
                text: prompt,
              },
            ],
          },
      });
      
      let newImageBase64 = '';
      if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
              if (part.inlineData && part.inlineData.data) {
                  newImageBase64 = part.inlineData.data;
                  break;
              }
          }
      }

      if (newImageBase64) {
          res.json({ image: `data:image/png;base64,${newImageBase64}` });
      } else {
          // If no image part, check for text (refusal or error explanation)
          let refusalText = '';
          if (response.candidates?.[0]?.content?.parts) {
              for (const part of response.candidates[0].content.parts) {
                  if (part.text) refusalText += part.text;
              }
          }
          console.warn("AI returned no image. Text:", refusalText);
          throw new Error(refusalText || "AI Model returned no image (Safety filter or unknown error)");
      }

  } catch (error: any) {
      console.error('AI Optimize Image Error:', error);
      res.status(500).json({ error: error.message || 'Failed to optimize image' });
  }
});

// --- Doubao (Ark) Image Generation ---
app.post('/api/ai/generate-image', async (req, res) => {
    if (!ARK_API_KEY) {
        res.status(503).json({ error: 'Ark API Key not configured' });
        return;
    }
    
    const imageModel = getImageModel();
    console.log(`Ark Request: Generate Image (Model: ${imageModel})`);
    const { prompt } = req.body;

    if (!prompt) {
        res.status(400).json({ error: 'Missing prompt' });
        return;
    }

    try {
        const response = await fetch(ARK_IMAGE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ARK_API_KEY}`
            },
            body: JSON.stringify({
                model: imageModel, // doubao-seedream-4-5-251128
                prompt: prompt,
                sequential_image_generation: "disabled",
                response_format: "url", // We fetch this URL backend-side
                size: "2K",
                stream: false,
                watermark: true
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('Ark Generate Image Error:', err);
            throw new Error(`Ark API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        // Ark Image response structure: { data: [{ url: "..." }] }
        const imageUrl = data.data?.[0]?.url;

        if (!imageUrl) {
            throw new Error("No image URL returned from Ark");
        }

        console.log("Image URL received, fetching content...");

        // Fetch the image content to convert to base64
        const imageRes = await fetch(imageUrl);
        const arrayBuffer = await imageRes.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = imageRes.headers.get('content-type') || 'image/png';

        res.json({ image: `data:${mimeType};base64,${base64}` });

    } catch (error: any) {
        console.error('Ark Generate Image Error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate image' });
    }
});

// Start Server with Graceful Shutdown
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at http://0.0.0.0:${PORT}/`);
});

// Handle SIGTERM (Railway/Docker stop signal)
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});