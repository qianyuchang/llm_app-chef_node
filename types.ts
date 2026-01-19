export type Category = string;

export interface Ingredient {
  name: string;
  amount: string;
}

export interface CookingLog {
  id: string;
  date: number;
  image: string; // Base64 or URL
  note: string;
}

export interface Recipe {
  id: string;
  title: string;
  category: string;
  coverImage: string; // Base64 or URL
  proficiency: number; // 1-5
  sourceLink?: string;
  ingredients: Ingredient[];
  steps: string[];
  logs: CookingLog[];
  createdAt: number;
}

export interface CartItem {
  recipeId: string;
  quantity: number;
}

export type ViewState = 'HOME' | 'ADD_RECIPE' | 'ORDER_MODE' | 'CATEGORY_MANAGER' | 'RECIPE_DETAIL';