import React, { useState } from 'react';
import { Search, UtensilsCrossed, Clock, ChevronRight, Flame } from 'lucide-react';
import { Recipe } from '../types';
import { PROFICIENCY_TEXT } from '../constants';

interface HomeProps {
  recipes: Recipe[];
  categories: string[];
  onOrderModeClick: () => void;
  onRecipeClick: (recipe: Recipe) => void;
}

export const Home: React.FC<HomeProps> = ({ recipes, categories, onOrderModeClick, onRecipeClick }) => {
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecipes = recipes.filter(r => {
    const matchesCategory = activeCategory === '全部' || r.category === activeCategory;
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-6 pb-2 bg-white sticky top-0 z-10 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] rounded-b-3xl">
        <h1 className="text-xl font-bold text-center mb-4 text-[#1a472a] tracking-tight">ChefNote</h1>
        
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="今天想吃什么？"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50/80 rounded-2xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1a472a]/10 transition-all placeholder:text-gray-400"
            />
          </div>
          <button 
            onClick={onOrderModeClick}
            className="w-11 h-11 bg-[#1a472a] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-900/20 active:scale-95 transition-all"
          >
            <UtensilsCrossed size={18} />
          </button>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 -mx-5 px-5">
          <button
            onClick={() => setActiveCategory('全部')}
            className={`px-4 py-1.5 rounded-full whitespace-nowrap text-xs font-medium transition-all duration-300 ${
              activeCategory === '全部' 
                ? 'bg-[#1a472a] text-white shadow-md shadow-green-900/10' 
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            全部
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full whitespace-nowrap text-xs font-medium transition-all duration-300 ${
                activeCategory === cat 
                  ? 'bg-[#1a472a] text-white shadow-md shadow-green-900/10' 
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Masonry Grid */}
      <div className="p-4 flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="columns-2 gap-4 space-y-4">
          {filteredRecipes.map(recipe => (
            <div 
              key={recipe.id} 
              onClick={() => onRecipeClick(recipe)}
              className="break-inside-avoid bg-white rounded-[20px] overflow-hidden shadow-[0_5px_15px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] transition-all duration-300 active:scale-[0.98] group cursor-pointer"
            >
              <div className="relative">
                <img 
                  src={recipe.coverImage} 
                  alt={recipe.title} 
                  className="w-full object-cover"
                  style={{ aspectRatio: '3/4' }} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Proficiency Badge on Image */}
                <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-lg border border-white/20">
                   <span className="text-[10px] text-white font-medium tracking-wide">
                     {PROFICIENCY_TEXT[recipe.proficiency]}
                   </span>
                </div>
              </div>
              
              <div className="p-3.5">
                <h3 className="font-bold text-gray-800 text-[15px] leading-tight mb-2">{recipe.title}</h3>
                
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                    {recipe.category}
                  </span>
                  
                  {/* Cooking Count */}
                  {recipe.logs && recipe.logs.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-orange-500 font-medium bg-orange-50 px-1.5 py-0.5 rounded-md">
                          <Flame size={10} fill="currentColor" />
                          {recipe.logs.length}次
                      </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Empty State */}
        {filteredRecipes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Search size={48} strokeWidth={1} className="mb-4 opacity-20" />
            <p className="text-sm">没有找到相关菜谱</p>
          </div>
        )}
      </div>
    </div>
  );
};