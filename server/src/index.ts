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

// Middleware
app.use(cors()); 
app.use(express.json({ limit: '50mb' }) as any);

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

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

// --- AI Routes ---

app.post('/api/ai/generate-menu', async (req, res) => {
    if (!ai) {
        res.status(503).json({ error: 'Server API Key not configured' });
        return;
    }
    try {
        console.log('AI Request: Generate Menu');
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
            model: 'gemini-3-flash-preview', 
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
          Based on these dishes: ${ingredientsData}
          Generate a consolidated shopping/prep list.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        res.json({ text: response.text });
    } catch (error: any) {
        console.error('AI Generate Prep Error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate prep list' });
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