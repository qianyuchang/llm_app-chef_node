import { Recipe } from '../types';

// Use relative URL.
// In production, the frontend is served by the backend, so /api works perfectly regardless of the domain.
// In development, Vite proxy forwards /api to the backend.
export const API_BASE_URL = '/api';

export const api = {
  getRecipes: async (): Promise<Recipe[]> => {
    const response = await fetch(`${API_BASE_URL}/recipes`);
    if (!response.ok) {
      throw new Error('Failed to fetch recipes');
    }
    return response.json();
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
};