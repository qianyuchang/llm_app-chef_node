import express from 'express';
import cors from 'cors';
import db from './db';
import { GoogleGenAI, Type } from "@google/genai";
import path from 'path';
import fs from 'fs';

// Global error handlers to prevent silent crashes
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
// Railway requires using the PORT env variable. 
// Default to 3001 only for local development.
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Initialize Gemini Client
// Ensure API_KEY is set in your .env or Railway variables
const apiKey = process.env.API_KEY;
console.log('Initializing Gemini Client...');
if (!apiKey) {
  console.warn('WARNING: API_KEY is not set. AI features will be disabled.');
}
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Middleware
app.use(cors()); // Allow all CORS requests for separate deployment
app.use(express.json({ limit: '50mb' }) as any); // Increase limit for Base64 images

// Routes

// 1. Health Check (Useful for deployment platforms)
app.get('/', (req, res) => {
  res.send('ChefNote API Server is running.');
});

// 2. Get All Recipes
app.get('/api/recipes', (req, res) => {
  try {
    console.log('GET /api/recipes');
    const recipes = db.get('recipes').value();
    // Sort by createdAt desc
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
    console.log('POST /api/recipes');
    const newRecipe = req.body;
    
    // Simple validation
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
    console.log(`PUT /api/recipes/${req.params.id}`);
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

// --- AI Routes ---

// 7. Generate Menu Theme
app.post('/api/ai/generate-menu', async (req, res) => {
    if (!ai) {
        res.status(503).json({ error: 'Server API Key not configured' });
        return;
    }
    try {
        console.log('AI Request: Generate Menu');
        const { recipes, selectedIds } = req.body;
        // Add safety check
        if (!recipes || !selectedIds) {
             res.status(400).json({ error: 'Missing recipes or selectedIds' });
             return;
        }

        const selectedRecipes = recipes.filter((r: any) => selectedIds.includes(r.id));
        const selectedNames = selectedRecipes.map((r: any) => r.title).join(", ");
        const date = new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const prompt = `
            Today is ${date}. 
            I have selected these dishes: ${selectedNames}.
            Please generate a sophisticated, high-end Chinese banquet menu theme.
        `;

        // Switch to 'gemini-flash-latest' to avoid "preview" model quota limits
        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest', 
            contents: prompt,
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { 
                    type: Type.STRING, 
                    description: "String (e.g. '甲辰年·中秋家宴', '立冬·暖心私宴')" 
                    },
                    description: { 
                    type: Type.STRING, 
                    description: "String (Poetic description, max 15 words)" 
                    },
                    idiom: { 
                    type: Type.STRING, 
                    description: "String (3-4 characters representing the season/mood, e.g. '秋意浓', '春日宴')" 
                    },
                    themeColor: { 
                    type: Type.STRING, 
                    description: "String (One of: 'red', 'orange', 'green', 'blue', 'neutral')" 
                    }
                },
                required: ["title", "description", "idiom", "themeColor"]
                }
            }
        });

        const json = JSON.parse(response.text || '{}');
        res.json(json);
    } catch (error: any) {
        console.error('AI Generate Menu Error:', error);
        // Better error handling: extract the actual message from Google API
        const errorMessage = error.message || 'Failed to generate menu';
        const status = errorMessage.includes('quota') ? 429 : 500;
        res.status(status).json({ error: errorMessage });
    }
});

// 8. Generate Prep List
app.post('/api/ai/generate-prep', async (req, res) => {
    if (!ai) {
        res.status(503).json({ error: 'Server API Key not configured' });
        return;
    }
    try {
        console.log('AI Request: Generate Prep List');
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
          Based on these dishes and ingredients:
          ${ingredientsData}
          
          Generate a consolidated shopping/prep list. 
          Combine same ingredients. 
          Format as a simple checklist.
        `;

        // Switch to 'gemini-flash-latest' to avoid "preview" model quota limits
        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: prompt,
        });

        res.json({ text: response.text });
    } catch (error: any) {
        console.error('AI Generate Prep Error:', error);
        // Better error handling
        const errorMessage = error.message || 'Failed to generate prep list';
        const status = errorMessage.includes('quota') ? 429 : 500;
        res.status(status).json({ error: errorMessage });
    }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});