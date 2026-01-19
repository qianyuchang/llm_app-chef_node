import express from 'express';
import cors from 'cors';
import db from './db';
import { GoogleGenAI, Type } from "@google/genai";
import path from 'path';

const app = express();
// Railway requires using the PORT env variable. 
// Default to 3001 only for local development.
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Initialize Gemini Client
// Ensure API_KEY is set in your .env or Railway variables
const apiKey = process.env.API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }) as any); // Increase limit for Base64 images

// Routes

// 1. Get All Recipes
app.get('/api/recipes', (req, res) => {
  try {
    const recipes = db.get('recipes').value();
    // Sort by createdAt desc
    const sorted = [...recipes].sort((a, b) => b.createdAt - a.createdAt);
    res.json(sorted);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// 2. Create Recipe
app.post('/api/recipes', (req, res) => {
  try {
    const newRecipe = req.body;
    
    // Simple validation
    if (!newRecipe.title || !newRecipe.id) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    db.get('recipes').unshift(newRecipe).write();
    res.status(201).json(newRecipe);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

// 3. Update Recipe
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
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

// 4. Get Categories
app.get('/api/categories', (req, res) => {
  try {
    const categories = db.get('categories').value();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// 5. Update Categories
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

// 6. Generate Menu Theme
app.post('/api/ai/generate-menu', async (req, res) => {
    if (!ai) {
        res.status(503).json({ error: 'Server API Key not configured' });
        return;
    }
    try {
        const { recipes, selectedIds } = req.body;
        const selectedRecipes = recipes.filter((r: any) => selectedIds.includes(r.id));
        const selectedNames = selectedRecipes.map((r: any) => r.title).join(", ");
        const date = new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const prompt = `
            Today is ${date}. 
            I have selected these dishes: ${selectedNames}.
            Please generate a sophisticated, high-end Chinese banquet menu theme.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Updated to gemini-3-pro-preview for complex creative tasks
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
    } catch (error) {
        console.error('AI Generate Menu Error:', error);
        res.status(500).json({ error: 'Failed to generate menu' });
    }
});

// 7. Generate Prep List
app.post('/api/ai/generate-prep', async (req, res) => {
    if (!ai) {
        res.status(503).json({ error: 'Server API Key not configured' });
        return;
    }
    try {
        const { recipes, selectedIds } = req.body;
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

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview', // Updated to gemini-3-flash-preview for basic text tasks
            contents: prompt,
        });

        res.json({ text: response.text });
    } catch (error) {
        console.error('AI Generate Prep Error:', error);
        res.status(500).json({ error: 'Failed to generate prep list' });
    }
});

// --- Serve Static Files (Frontend) ---
// Serve static files from the React frontend app
// When built, frontend is in root/dist, server is in server/dist
// So relative path from server/dist/index.js to root/dist is ../../dist
const staticPath = path.join(__dirname, '../../dist');
app.use(express.static(staticPath));

// Handle React Routing, return all requests to React app
app.get('*', (req: express.Request, res: express.Response) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

// Start Server
// Must listen on 0.0.0.0 for Docker containers
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});