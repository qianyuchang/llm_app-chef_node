import express from 'express';
import cors from 'cors';
import db from './db';

const app = express();
const PORT = 3001;

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
      return res.status(400).json({ error: 'Missing required fields' });
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
      return res.status(404).json({ error: 'Recipe not found' });
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
      return res.status(400).json({ error: 'Categories must be an array' });
    }

    db.set('categories', newCategories).write();
    res.json(newCategories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update categories' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});