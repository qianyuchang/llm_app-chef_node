import { Recipe } from '../types';
import { API_BASE_URL } from './api';

export const generateMenuSuggestion = async (recipes: Recipe[], selectedIds: string[]) => {
    // Legacy function, kept for compatibility but effectively deprecated in this refactor
    return "Menu suggestion feature moved to backend.";
};

export const generatePrepList = async (recipes: Recipe[], selectedIds: string[]) => {
    try {
        // Optimization: Strip heavy fields (images, logs) to reduce payload size
        // The backend only needs title and ingredients for prep list
        const lightweightRecipes = recipes.map(({ id, title, category, ingredients }) => ({
            id, title, category, ingredients
        }));

        const response = await fetch(`${API_BASE_URL}/ai/generate-prep`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipes: lightweightRecipes, selectedIds })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Server error');
        }

        const data = await response.json();
        return data.text;
    } catch (error) {
        console.error("Error generating prep list:", error);
        throw error; // Throw so UI can handle it
    }
};

export const generateMenuTheme = async (recipes: Recipe[], selectedIds: string[]) => {
    try {
        // Optimization: Strip heavy fields (images, logs) to reduce payload size
        // The backend only needs title for menu theme
        const lightweightRecipes = recipes.map(({ id, title, category }) => ({
            id, title, category
        }));

        const response = await fetch(`${API_BASE_URL}/ai/generate-menu`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipes: lightweightRecipes, selectedIds })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Server error');
        }

        return await response.json();
    } catch (error) {
        console.error("Error generating menu theme:", error);
        throw error; // Throw so UI can handle it
    }
};