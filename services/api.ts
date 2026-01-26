import { Recipe, Settings } from '../types';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Check if running on localhost
const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Priority:
// 1. Environment Variable (__API_URL__) - Injected by Vite build 'define'
// 2. Localhost fallback
// 3. Fallback hardcoded production URL (Optional/Legacy)

// Declare global constant injected by Vite
declare const __API_URL__: string;

// Safely access the global constant. 
// If replacement happens, __API_URL__ becomes a string literal.
// If not, typeof check prevents crash.
// @ts-ignore
const envApiUrl = typeof __API_URL__ !== 'undefined' ? __API_URL__ : '';

export const API_BASE_URL = envApiUrl || (isLocal 
  ? 'http://localhost:3001/api' 
  : 'https://llmapp-chefnode-production.up.railway.app/api'); // You can replace this later with your Zeabur Backend URL

export const api = {
  getRecipes: async (): Promise<Recipe[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/recipes`);
      if (!response.ok) {
        throw new Error('Failed to fetch recipes');
      }
      return response.json();
    } catch (error) {
      console.error(`API Error (${API_BASE_URL})`, error);
      throw error;
    }
  },

  createRecipe: async (recipe: Recipe): Promise<Recipe> => {
    const response = await fetch(`${API_BASE_URL}/recipes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(recipe),
    });
    if (!response.ok) {
      throw new Error('Failed to create recipe');
    }
    return response.json();
  },

  updateRecipe: async (recipe: Recipe): Promise<Recipe> => {
    const response = await fetch(`${API_BASE_URL}/recipes/${recipe.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(recipe),
    });
    if (!response.ok) {
      throw new Error('Failed to update recipe');
    }
    return response.json();
  },

  deleteRecipe: async (id: string): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/recipes/${id}`, {
          method: 'DELETE',
      });
      if (!response.ok) {
           throw new Error('Failed to delete recipe');
      }
  },

  getCategories: async (): Promise<string[]> => {
    const response = await fetch(`${API_BASE_URL}/categories`);
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    return response.json();
  },

  updateCategories: async (categories: string[]): Promise<string[]> => {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(categories),
    });
    if (!response.ok) {
      throw new Error('Failed to update categories');
    }
    return response.json();
  },

  getSettings: async (): Promise<Settings> => {
    const response = await fetch(`${API_BASE_URL}/settings`);
    if (!response.ok) {
      throw new Error('Failed to fetch settings');
    }
    return response.json();
  },

  updateSettings: async (settings: Partial<Settings>): Promise<Settings> => {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
      throw new Error('Failed to update settings');
    }
    return response.json();
  },

  optimizeImage: async (base64Image: string): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}/ai/optimize-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Image }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to optimize image');
      }
      const data = await response.json();
      return data.image;
  },

  generateImage: async (prompt: string): Promise<string> => {
      const response = await fetch(`${API_BASE_URL}/ai/generate-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to generate image');
      }
      const data = await response.json();
      return data.image;
  },

  aiSearch: async (query: string, recipes: Recipe[]): Promise<string[]> => {
      // Send lightweight recipe data
      const lightweightRecipes = recipes.map(r => ({
          id: r.id,
          title: r.title,
          category: r.category,
          ingredients: r.ingredients
      }));
      
      const response = await fetch(`${API_BASE_URL}/ai/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, recipes: lightweightRecipes }),
      });
      
      if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Search failed');
      }
      const data = await response.json();
      return data.ids || [];
  }
};