import React, { useState } from 'react';
import { Search, UtensilsCrossed, Flame, Sparkles, Settings } from 'lucide-react';
import { Recipe } from '../types';
import { PROFICIENCY_TEXT } from '../constants';

interface HomeProps {
  recipes: Recipe[];
  categories: string[];
  onOrderModeClick: () => void;
  onRecipeClick: (recipe: Recipe) => void;
  onSettingsClick: () => void;
}

export const Home: React.FC<HomeProps> = ({ recipes, categories, onOrderModeClick, onRecipeClick, onSettingsClick }) => {
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecipes = recipes.filter(r => {
    const matchesCategory = activeCategory === '全部' || r.category === activeCategory;
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate stats
  const masterScore = recipes.reduce((acc, r) => acc + (r.logs ? r.logs.length : 0), 0);

  // Split recipes into two columns for a robust masonry layout on mobile
  const leftColRecipes = filteredRecipes.filter((_, idx) => idx % 2 === 0);
  const rightColRecipes = filteredRecipes.filter((_, idx) => idx % 2 !== 0);

  const renderRecipeCard = (recipe: Recipe) => (
    <div 
      key={recipe.id} 
      onClick={() => onRecipeClick(recipe)}
      className="bg-white rounded-[20px] overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.03)] border border-gray-100/50 group cursor-pointer relative mb-4"
      style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' }}
    >
      {/* Touch Feedback Overlay */}
      <div className="absolute inset-0 z-20 bg-black opacity-0 active:opacity-5 transition-opacity duration-200 pointer-events-none" />

      <div className="relative">
        <img 
          src={recipe.coverImage} 
          alt={recipe.title} 
          className="w-full object-cover bg-gray-50 block"
          style={{ aspectRatio: '3/4' }} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        
        {/* Proficiency Badge */}
        <div className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm flex items-center justify-center">
           <span className="text-[10px] text-[#385c44] font-bold tracking-wide leading-none pt-[1px]">
             {PROFICIENCY_TEXT[recipe.proficiency]}
           </span>
        </div>

        {/* Cooking Count Overlay */}
        {recipe.logs && recipe.logs.length > 0 && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] text-white font-bold bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10">
                <Flame size={10} fill="currentColor" className="text-orange-400" />
                {recipe.logs.length}
            </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-[15px] leading-snug mb-2 line-clamp-2">{recipe.title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
            {recipe.category}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#f2f4f6]">
      {/* Header Area */}
      <div className="px-6 pt-2 pb-2 bg-[#f2f4f6] sticky top-0 z-10">
        
        {/* App Title & Settings */}
        <div className="relative py-3 flex items-center justify-center">
             <h1 className="text-[17px] font-bold text-[#1a472a] tracking-tight">ChefNote</h1>
             <button 
                onClick={onSettingsClick}
                className="absolute right-0 p-2 text-gray-400 hover:text-[#1a472a] transition-colors active:scale-90"
             >
                 <Settings size={20} />
             </button>
        </div>

        {/* Search Bar & Order Button Row */}
        <div className="flex gap-3 mb-5 items-center">
          <div className="flex-1 relative shadow-sm rounded-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-[#385c44] transition-colors" />
            <input 
              type="text"
              placeholder="今天想吃什么？"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white rounded-full text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#385c44]/10 transition-all placeholder:text-gray-400"
            />
          </div>
          <button 
            onClick={onOrderModeClick}
            className="w-[46px] h-[46px] bg-[#385c44] rounded-full flex items-center justify-center text-white shadow-xl shadow-[#385c44]/20 active:scale-95 transition-all flex-shrink-0"
          >
            <UtensilsCrossed size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Title Section */}
        <div className="mb-6 px-1">
            <h2 className="text-[28px] font-bold text-[#1f1f1f] leading-tight mb-1.5 tracking-tight">我的厨房日记</h2>
            <p className="text-[13px] text-gray-400 font-normal tracking-wide">
                已收录 {recipes.length} 道美味，大师之路 {masterScore}
            </p>
        </div>

        {/* Categories */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6">
          <button
            onClick={() => setActiveCategory('全部')}
            className={`px-5 py-2 rounded-full whitespace-nowrap text-[13px] font-bold transition-all duration-300 ${
              activeCategory === '全部' 
                ? 'bg-[#385c44] text-white shadow-lg shadow-[#385c44]/20' 
                : 'bg-white text-gray-600 shadow-sm hover:bg-gray-50'
            }`}
          >
            全部
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full whitespace-nowrap text-[13px] font-bold transition-all duration-300 ${
                activeCategory === cat 
                  ? 'bg-[#385c44] text-white shadow-lg shadow-[#385c44]/20' 
                  : 'bg-white text-gray-600 shadow-sm hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Masonry Grid with 2-Column Flexbox for maximum stability */}
      <div className="px-4 flex-1 overflow-y-auto no-scrollbar pb-32 bg-[#f2f4f6]">
        {filteredRecipes.length > 0 ? (
          <div className="flex gap-4">
            <div className="flex-1">
              {leftColRecipes.map(renderRecipeCard)}
            </div>
            <div className="flex-1">
              {rightColRecipes.map(renderRecipeCard)}
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center pt-24 text-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
                <Sparkles size={32} className="text-[#385c44]/40" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-3">没有找到相关菜谱</h3>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              也许它正等着你亲自下厨<br />
              <span className="text-[#385c44] font-medium mt-1 inline-block">去创造第一个定义美味的人吧！</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
