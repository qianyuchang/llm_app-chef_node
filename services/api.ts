import { Recipe } from '../types';
import { MOCK_RECIPES, INITIAL_CATEGORIES } from '../constants';

const RECIPES_KEY = 'chefnote_recipes';
const CATEGORIES_KEY = 'chefnote_categories';

// Helper to simulate network delay for realistic interaction
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  getRecipes: async (): Promise<Recipe[]> => {
    await delay(300); // Simulate network latency
    const stored = localStorage.getItem(RECIPES_KEY);
    if (!stored) {
      // Initialize with mock data if empty
      // Sort mock data by date descending just to be safe
      const sortedMock = [...MOCK_RECIPES].sort((a, b) => b.createdAt - a.createdAt);
      localStorage.setItem(RECIPES_KEY, JSON.stringify(sortedMock));
      return sortedMock;
    }
    const recipes: Recipe[] = JSON.parse(stored);
    // Ensure we always return sorted by createdAt desc
    return recipes.sort((a, b) => b.createdAt - a.createdAt);
  },

  createRecipe: async (recipe: Recipe): Promise<Recipe> => {
    await delay(300);
    const recipes = await api.getRecipes();
    const newRecipes = [recipe, ...recipes];
    localStorage.setItem(RECIPES_KEY, JSON.stringify(newRecipes));
    return recipe;
  },

  updateRecipe: async (recipe: Recipe): Promise<Recipe> => {
    await delay(300);
    const recipes = await api.getRecipes();
    const index = recipes.findIndex(r => r.id === recipe.id);
    if (index !== -1) {
      recipes[index] = recipe;
      localStorage.setItem(RECIPES_KEY, JSON.stringify(recipes));
      return recipe;
    }
    throw new Error('Recipe not found');
  },

  getCategories: async (): Promise<string[]> => {
    await delay(200);
    const stored = localStorage.getItem(CATEGORIES_KEY);
    if (!stored) {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(INITIAL_CATEGORIES));
      return INITIAL_CATEGORIES;
    }
    return JSON.parse(stored);
  },

  updateCategories: async (categories: string[]): Promise<string[]> => {
    await delay(200);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    return categories;
  },
};