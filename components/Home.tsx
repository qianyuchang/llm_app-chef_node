
import React, { useState, useRef, useEffect } from 'react';
import { Search, UtensilsCrossed, Flame, Sparkles, Settings, Loader2, X } from 'lucide-react';
import { Recipe } from '../types';
import { PROFICIENCY_TEXT } from '../constants';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { getOptimizedImageUrl } from '../utils/image';
import { ImageWithSkeleton } from './ImageWithSkeleton';

interface HomeProps {
  recipes: Recipe[];
  categories: string[];
  onOrderModeClick: () => void;
  onRecipeClick: (recipe: Recipe) => void;
  onSettingsClick: () => void;
}

const RECOMMENDED_QUERIES = [
    "下饭神菜",
    "低卡减脂餐",
    "快手早餐",
    "暖胃汤羹",
    "适合发朋友圈",
    "周末硬菜",
    "清淡饮食"
];

export const Home: React.FC<HomeProps> = ({ recipes, categories, onOrderModeClick, onRecipeClick, onSettingsClick }) => {
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [aiRecipeIds, setAiRecipeIds] = useState<string[] | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const categoryTabContainerRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const allCategories = ['全部', ...categories];

  useEffect(() => {
    const activeTab = categoryRefs.current[activeCategory];
    if (activeTab && categoryTabContainerRef.current) {
        activeTab.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
        });
    }
  }, [activeCategory]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredRecipes = recipes.filter(r => {
    const matchesCategory = activeCategory === '全部' || r.category === activeCategory;
    let matchesSearch = true;
    
    if (aiRecipeIds !== null) {
        matchesSearch = aiRecipeIds.includes(r.id);
    } else if (searchQuery.trim()) {
        matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        r.ingredients.some(i => i.name.includes(searchQuery));
    }
    return matchesCategory && matchesSearch;
  });

  const handleAiSearch = async (query: string) => {
      if (!query.trim()) return;
      setSearchQuery(query);
      setIsSearchFocused(false);
      setIsAiSearching(true);
      setAiRecipeIds(null);
      try {
          const ids = await api.aiSearch(query, recipes);
          setAiRecipeIds(ids);
      } catch (error) {
          console.error("AI Search failed", error);
      } finally {
          setIsAiSearching(false);
      }
  };

  const clearSearch = () => {
      setSearchQuery('');
      setAiRecipeIds(null);
      setIsAiSearching(false);
  };

  const masterScore = recipes.reduce((acc, r) => acc + (r.logs ? r.logs.length : 0), 0);

  const leftColRecipes = filteredRecipes.filter((_, idx) => idx % 2 === 0);
  const rightColRecipes = filteredRecipes.filter((_, idx) => idx % 2 !== 0);

  const renderRecipeCard = (recipe: Recipe) => (
    <div 
      key={recipe.id} 
      onClick={() => onRecipeClick(recipe)}
      className="bg-white rounded-[20px] overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-gray-100/50 group cursor-pointer relative mb-4 transition-all duration-200 active:scale-[0.98] active:shadow-none"
    >
      {/* 比例容器 */}
      <div className="relative w-full overflow-hidden bg-gray-100" style={{ aspectRatio: '3/4' }}>
        <ImageWithSkeleton 
          src={getOptimizedImageUrl(recipe.coverImage, 600)} 
          alt={recipe.title} 
          className="transition-transform duration-700 group-hover:scale-105"
          wrapperClassName="absolute inset-0"
          loading="lazy"
        />
        
        {/* 覆盖层组件 */}
        <div className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-full shadow-sm z-10">
           <span className="text-[10px] text-[#385c44] font-bold tracking-tight leading-none pt-[1px]">
             {PROFICIENCY_TEXT[recipe.proficiency]}
           </span>
        </div>
        {recipe.logs && recipe.logs.length > 0 && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] text-white font-bold bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10 z-10">
                <Flame size={10} fill="currentColor" className="text-orange-400" />
                {recipe.logs.length}
            </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-[14px] leading-snug mb-2 line-clamp-2">{recipe.title}</h3>
        <div className="flex items-center">
            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
            {recipe.category}
            </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#f2f4f6]">
      <div className="px-6 pt-2 pb-2 bg-[#f2f4f6] sticky top-0 z-30">
        <div className="relative py-3 flex items-center justify-center">
             <h1 className="text-[17px] font-bold text-[#1a472a] tracking-tight">ChefNote</h1>
             <button onClick={onSettingsClick} className="absolute right-0 p-2 text-gray-400 hover:text-[#1a472a] transition-colors">
                 <Settings size={20} />
             </button>
        </div>

        <div className="flex gap-3 mb-5 items-start relative z-50">
          <div className="flex-1 relative group" ref={searchContainerRef}>
            <div className={`relative shadow-sm rounded-2xl bg-white transition-all duration-300 ${isSearchFocused ? 'shadow-lg ring-2 ring-[#385c44]/10' : ''}`}>
                <Search className={`absolute left-4 top-3.5 text-gray-400 w-4 h-4 transition-colors ${isSearchFocused ? 'text-[#385c44]' : ''}`} />
                <input 
                  type="text"
                  placeholder="今天想吃什么？"
                  value={searchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (!e.target.value) setAiRecipeIds(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiSearch(searchQuery)}
                  className="w-full pl-10 pr-10 py-3 bg-transparent rounded-2xl text-sm text-gray-800 focus:outline-none"
                />
                <div className="absolute right-3 top-3.5 text-gray-400">
                    {isAiSearching ? <Loader2 className="animate-spin w-4 h-4 text-[#385c44]" /> : searchQuery && <button onClick={clearSearch}><X className="w-4 h-4" /></button>}
                </div>
            </div>

            {isSearchFocused && !isAiSearching && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
                        <Sparkles size={12} className="text-[#385c44]" />
                        <span>AI 猜你想找</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {RECOMMENDED_QUERIES.map(query => (
                            <button key={query} onClick={() => handleAiSearch(query)} className="px-3 py-1.5 bg-gray-50 hover:bg-[#385c44]/10 hover:text-[#385c44] rounded-lg text-xs text-gray-600 transition-colors">
                                {query}
                            </button>
                        ))}
                    </div>
                </div>
            )}
          </div>

          <button onClick={onOrderModeClick} className="w-[46px] h-[46px] bg-[#385c44] rounded-full flex items-center justify-center text-white shadow-xl shadow-[#385c44]/20 active:scale-95 transition-all flex-shrink-0">
            <UtensilsCrossed size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="mb-6 px-1">
            <h2 className="text-[28px] font-bold text-[#1f1f1f] leading-tight mb-1.5">我的厨房日记</h2>
            <p className="text-[13px] text-gray-400">已收录 {recipes.length} 道美味，大师之路 {masterScore}</p>
        </div>

        <div ref={categoryTabContainerRef} className="flex gap-3 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6 scroll-smooth">
          {allCategories.map(cat => (
            <button
              key={cat}
              ref={el => { categoryRefs.current[cat] = el; }}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full whitespace-nowrap text-[13px] font-bold transition-all duration-300 ${
                activeCategory === cat ? 'bg-[#385c44] text-white shadow-lg' : 'bg-white text-gray-600 shadow-sm'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 flex-1 overflow-y-auto no-scrollbar pb-32 bg-[#f2f4f6]">
        <AnimatePresence mode="wait">
            <motion.div 
                key={activeCategory + (aiRecipeIds ? 'search' : '')}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
            >
                {isAiSearching ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 size={36} className="text-[#385c44] animate-spin" />
                        <p className="mt-4 text-sm text-gray-500">AI 正在翻阅菜谱...</p>
                    </div>
                ) : filteredRecipes.length > 0 ? (
                    <div className="flex gap-4 items-start">
                        <div className="flex-1 flex flex-col">{leftColRecipes.map(renderRecipeCard)}</div>
                        <div className="flex-1 flex flex-col">{rightColRecipes.map(renderRecipeCard)}</div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center pt-24 text-center">
                        <Sparkles size={32} className="text-gray-200 mb-6" />
                        <h3 className="text-lg font-bold text-gray-800 mb-2">没有相关菜谱</h3>
                        <p className="text-sm text-gray-400">去创造第一个定义美味的人吧！</p>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
