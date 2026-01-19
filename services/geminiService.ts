import { GoogleGenAI, Type } from "@google/genai";
import { Recipe } from '../types';

export const generateMenuSuggestion = async (recipes: Recipe[], selectedIds: string[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  const selectedRecipes = recipes.filter(r => selectedIds.includes(r.id));
  const selectedNames = selectedRecipes.map(r => r.title).join(", ");

  const prompt = `
    I have selected the following dishes for a meal: ${selectedNames}.
    Please provide a short, fun, and appetizing menu description for this combination. 
    Keep it under 50 words. Use emojis.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating menu:", error);
    return "Could not generate menu description at this time.";
  }
};

export const generatePrepList = async (recipes: Recipe[], selectedIds: string[]) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
    const selectedRecipes = recipes.filter(r => selectedIds.includes(r.id));
    const ingredientsData = selectedRecipes.map(r => 
        `${r.title}: ${r.ingredients.map(i => `${i.name} (${i.amount})`).join(', ')}`
    ).join('\n');
  
    const prompt = `
      Based on these dishes and ingredients:
      ${ingredientsData}
      
      Generate a consolidated shopping/prep list. 
      Combine same ingredients. 
      Format as a simple checklist.
    `;
  
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error("Error generating prep list:", error);
      return "Could not generate prep list.";
    }
};

export const generateMenuTheme = async (recipes: Recipe[], selectedIds: string[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  const selectedRecipes = recipes.filter(r => selectedIds.includes(r.id));
  const selectedNames = selectedRecipes.map(r => r.title).join(", ");
  const date = new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const prompt = `
    Today is ${date}. 
    I have selected these dishes: ${selectedNames}.
    
    Please generate a sophisticated, high-end Chinese banquet menu theme.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error generating menu theme:", error);
    return {
      title: "ChefNote·私宴",
      description: "人间至味是清欢",
      idiom: "知味",
      themeColor: "neutral"
    };
  }
};