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
const ARK_VIDEO_URL = 'https://ark.cn-beijing.volces.com/api/v3/video/generations';
const ARK_TASK_URL = 'https://ark.cn-beijing.volces.com/api/v3/tasks'; // Generic task endpoint check

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
    const settings = db.get('settings').value() || { aiModel: 'gemini-3-flash-preview' };
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
    const current = db.get('settings').value() || { aiModel: 'gemini-3-flash-preview' };
    const newSettings = { ...current, ...updates };
    
    db.set('settings', newSettings).write();
    res.json(newSettings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// --- AI Routes ---

app.post('/api/ai/recommend-menu', async (req, res) => {
  if (!ai) {
      res.status(503).json({ error: 'Server API Key not configured' });
      return;
  }
  try {
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
      `;

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
  } catch (error: any) {
      console.error('AI Recommend Menu Error:', error);
      res.status(500).json({ error: error.message || 'Failed to recommend menu' });
  }
});

app.post('/api/ai/generate-menu', async (req, res) => {
    if (!ai) {
        res.status(503).json({ error: 'Server API Key not configured' });
        return;
    }
    try {
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
        `;

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
    } catch (error: any) {
        console.error('AI Generate Menu Error:', error);
        const errorMessage = error.message || 'Failed to generate menu';
        res.status(500).json({ error: errorMessage });
    }
});

app.post('/api/ai/generate-prep', async (req, res) => {
    if (!ai) {
        res.status(503).json({ error: 'Server API Key not configured' });
        return;
    }
    try {
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
        `;

        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
        });
        res.json({ text: response.text });
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

// --- Doubao (Ark) Video Generation ---
app.post('/api/ai/animate-image', async (req, res) => {
    if (!ARK_API_KEY) {
        res.status(503).json({ error: 'Ark API Key not configured' });
        return;
    }
    
    console.log('Ark Request: Animate Image (doubao-seedance-1-0-lite-i2v-250428)');
    const { image } = req.body;

    if (!image) {
        res.status(400).json({ error: 'Missing image data' });
        return;
    }

    try {
        // 1. Submit Async Task
        const submitResponse = await fetch(ARK_VIDEO_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ARK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'doubao-seedance-1-0-lite-i2v-250428',
                video_source: {
                    image: {
                        type: 'base64',
                        content: image.split(',')[1] || image // Strip prefix if present
                    }
                },
                // Optional: Provide a prompt to guide motion
                prompt: "Cinematic slow motion, appetizing food, steam rising, high quality, 4k",
                ratio: "1:1" // Try to keep square like cover
            })
        });

        if (!submitResponse.ok) {
            const err = await submitResponse.text();
            console.error('Ark Submit Error:', err);
            throw new Error(`Ark API Error: ${submitResponse.status} ${submitResponse.statusText}`);
        }

        const submitData = await submitResponse.json();
        const taskId = submitData.id || (submitData.data && submitData.data.id);
        
        if (!taskId) {
             throw new Error("No Task ID returned from Ark");
        }
        
        console.log(`Ark Task Submitted: ${taskId}, polling for result...`);

        // 2. Poll for Status (Server-side polling to simplify client)
        let attempts = 0;
        const maxAttempts = 30; // 30 * 2s = 60s timeout
        let videoUrl = null;

        while (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 2000)); // Wait 2s
            attempts++;

            const statusResponse = await fetch(`${ARK_TASK_URL}/${taskId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${ARK_API_KEY}`
                }
            });

            if (!statusResponse.ok) continue;

            const statusData = await statusResponse.json();
            // Check status structure (Ark standard: result.status or data.status)
            // Typically: { result: { status: 'SUCCEEDED', output: ... } }
            // Or new API: { status: 'SUCCEEDED', result: ... }
            const status = statusData.status || (statusData.result && statusData.result.status);
            
            console.log(`Polling attempt ${attempts}: ${status}`);

            if (status === 'SUCCEEDED' || status === 'SUCCESS') {
                // Extract video URL
                // Common structure: result.video.url or result.output.video_url
                const result = statusData.result || statusData.data;
                if (result && result.video && result.video.url) {
                    videoUrl = result.video.url;
                } else if (result && result.output && result.output.video_url) {
                     videoUrl = result.output.video_url;
                } else if (result && result.resp && result.resp.video_url) {
                    // Seedance specific output might vary
                    videoUrl = result.resp.video_url;
                }
                break;
            } else if (status === 'FAILED' || status === 'CANCELLED') {
                throw new Error(`Video generation failed: ${JSON.stringify(statusData)}`);
            }
        }

        if (videoUrl) {
            res.json({ videoUrl });
        } else {
            throw new Error("Video generation timed out or returned no URL");
        }

    } catch (error: any) {
        console.error('Ark Animate Error:', error);
        res.status(500).json({ error: error.message || 'Failed to animate image' });
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