import React, { useState, useRef, useEffect } from 'react';
import { Search, UtensilsCrossed, Flame, Sparkles, Settings, TrendingUp, History, Loader2, X } from 'lucide-react';
import { Recipe } from '../types';
import { PROFICIENCY_TEXT } from '../constants';
import { api } from '../services/api';

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
  
  // AI Search State
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [aiRecipeIds, setAiRecipeIds] = useState<string[] | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter Logic
  const filteredRecipes = recipes.filter(r => {
    // 1. Category Filter
    const matchesCategory = activeCategory === '全部' || r.category === activeCategory;
    
    // 2. Search Filter (Hybrid: AI Result OR Local Match)
    let matchesSearch = true;
    
    if (aiRecipeIds !== null) {
        // If AI search is active, strictly follow its result
        matchesSearch = aiRecipeIds.includes(r.id);
    } else if (searchQuery.trim()) {
        // Fallback to local filtering
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
      setAiRecipeIds(null); // Clear previous results while loading

      try {
          const ids = await api.aiSearch(query, recipes);
          setAiRecipeIds(ids);
      } catch (error) {
          console.error("AI Search failed", error);
          // Fallback to local search is automatic if aiRecipeIds is null, 
          // but we alert the user
      } finally {
          setIsAiSearching(false);
      }
  };

  const clearSearch = () => {
      setSearchQuery('');
      setAiRecipeIds(null);
      setIsAiSearching(false);
  };

  // Calculate stats
  const masterScore = recipes.reduce((acc, r) => acc + (r.logs ? r.logs.length : 0), 0);

  // Split recipes into two columns for a robust masonry layout on mobile
  const leftColRecipes = filteredRecipes.filter((_, idx) => idx % 2 === 0);
  const rightColRecipes = filteredRecipes.filter((_, idx) => idx % 2 !== 0);

  const renderRecipeCard = (recipe: Recipe) => (
    <div 
      key={recipe.id} 
      onClick={() => onRecipeClick(recipe)}
      className="bg-white rounded-[20px] overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.03)] border border-gray-100/50 group cursor-pointer relative mb-4 transition-transform duration-200 active:scale-[0.98]"
    >
      {/* Touch Feedback Overlay */}
      <div className="absolute inset-0 z-20 bg-black opacity-0 active:opacity-5 transition-opacity duration-200 pointer-events-none" />

      <div className="relative w-full overflow-hidden bg-gray-50" style={{ aspectRatio: '3/4' }}>
        <img 
          src={recipe.coverImage} 
          alt={recipe.title} 
          className="w-full h-full object-cover block transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        
        {/* Proficiency Badge */}
        <div className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm flex items-center justify-center z-10">
           <span className="text-[10px] text-[#385c44] font-bold tracking-wide leading-none pt-[1px]">
             {PROFICIENCY_TEXT[recipe.proficiency]}
           </span>
        </div>

        {/* Cooking Count Overlay */}
        {recipe.logs && recipe.logs.length > 0 && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] text-white font-bold bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10 z-10">
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
      <div className="px-6 pt-2 pb-2 bg-[#f2f4f6] sticky top-0 z-30">
        
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
        <div className="flex gap-3 mb-5 items-start relative z-50">
          {/* Search Container with Dropdown */}
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
                      // If user clears input, reset AI state
                      if (!e.target.value) {
                          setAiRecipeIds(null);
                      }
                  }}
                  onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                          handleAiSearch(searchQuery);
                      }
                  }}
                  className="w-full pl-10 pr-10 py-3 bg-transparent rounded-2xl text-sm text-gray-800 focus:outline-none placeholder:text-gray-400"
                />
                {/* Clear/Loading Icon */}
                <div className="absolute right-3 top-3.5 text-gray-400">
                    {isAiSearching ? (
                        <Loader2 className="animate-spin w-4 h-4 text-[#385c44]" />
                    ) : searchQuery ? (
                        <button onClick={clearSearch}>
                            <X className="w-4 h-4 hover:text-gray-600" />
                        </button>
                    ) : null}
                </div>
            </div>

            {/* Smart Suggestions Dropdown */}
            {isSearchFocused && !isAiSearching && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <Sparkles size={12} className="text-[#385c44]" />
                        <span>AI 猜你想找</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {RECOMMENDED_QUERIES.map((query) => (
                            <button
                                key={query}
                                onClick={() => handleAiSearch(query)}
                                className="px-3 py-1.5 bg-gray-50 hover:bg-[#385c44]/10 hover:text-[#385c44] rounded-lg text-xs text-gray-600 transition-colors font-medium active:scale-95"
                            >
                                {query}
                            </button>
                        ))}
                    </div>
                    
                    {searchQuery.length > 1 && (
                         <div className="mt-4 pt-3 border-t border-gray-50">
                             <button 
                                onClick={() => handleAiSearch(searchQuery)}
                                className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-sm text-[#385c44] font-bold"
                             >
                                 <Search size={14} />
                                 AI 搜索 "{searchQuery}"
                             </button>
                         </div>
                    )}
                </div>
            )}
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

      {/* Masonry Grid with 2-Column Flexbox */}
      <div className="px-4 flex-1 overflow-y-auto no-scrollbar pb-32 bg-[#f2f4f6]">
        {/* Search Status & AI Loading */}
        {isAiSearching && (
             <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
                 <div className="relative">
                    <Loader2 size={36} className="text-[#385c44] animate-spin" />
                    <Sparkles size={16} className="text-yellow-400 absolute -top-1 -right-2 animate-pulse" />
                 </div>
                 <p className="mt-4 text-sm text-gray-500 font-medium">AI 正在翻阅菜谱...</p>
                 <div className="flex gap-3 mt-6 w-full max-w-xs opacity-50">
                    <div className="flex-1 h-32 bg-gray-200 rounded-2xl animate-pulse"></div>
                    <div className="flex-1 h-24 bg-gray-200 rounded-2xl animate-pulse"></div>
                 </div>
             </div>
        )}

        {/* Active Search Filters */}
        {!isAiSearching && aiRecipeIds !== null && (
             <div className="mb-4 flex items-center justify-between px-1">
                 <div className="flex items-center gap-1.5 text-xs font-bold text-[#385c44] bg-[#385c44]/10 px-3 py-1.5 rounded-full">
                     <Sparkles size={12} />
                     AI 筛选结果: {filteredRecipes.length} 个
                 </div>
                 <button onClick={clearSearch} className="text-xs text-gray-400 hover:text-gray-600 px-2">
                     清除筛选
                 </button>
             </div>
        )}

        {/* Results */}
        {!isAiSearching && (
            filteredRecipes.length > 0 ? (
              <div className="flex gap-4 items-start">
                <div className="flex-1 min-w-0 flex flex-col gap-4">
                  {leftColRecipes.map(renderRecipeCard)}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-4">
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
                  {aiRecipeIds !== null ? "AI 挠破了头也没找到..." : "也许它正等着你亲自下厨"}
                  <br />
                  <span className="text-[#385c44] font-medium mt-1 inline-block">去创造第一个定义美味的人吧！</span>
                </p>
              </div>
            )
        )}
      </div>
    </div>
  );
};
