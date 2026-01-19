import { Recipe } from '../types';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Check if running on localhost to switch API URL automatically
const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// 1. 本地开发: http://localhost:3001/api
// 2. 生产环境: 使用 Railway URL
export const API_BASE_URL = isLocal 
  ? 'http://localhost:3001/api' 
  : 'https://llmapp-chefnode-production.up.railway.app/api';

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
  }
};