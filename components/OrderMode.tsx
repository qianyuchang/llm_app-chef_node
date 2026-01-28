
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ShoppingBag, Sparkles, CheckSquare, Download, X, CheckCircle2, Flame, Share2, Users, Bot, AlertTriangle, Copy, Loader2, Palette } from 'lucide-react';
import { toBlob } from 'html-to-image';
import { Recipe } from '../types';
import { generateMenuTheme, recommendMenu } from '../services/geminiService';
import { ToastType } from './Toast';
import { useSwipe } from '../hooks/useSwipe';
import { PROFICIENCY_TEXT } from '../constants';
import { getOptimizedImageUrl } from '../utils/image';
import { ImageWithSkeleton } from './ImageWithSkeleton';

interface OrderModeProps {
  recipes: Recipe[];
  categories: string[];
  onBack: () => void;
  onShowToast?: (message: string, type: ToastType) => void;
}

interface MenuThemeData {
  title: string;
  description: string;
  idiom: string;
  themeColor: string;
  seasonalPhrase?: string;
}

type MenuThemeChoice = 'auto' | 'new-year' | 'red' | 'green' | 'blue' | 'neutral';

export const OrderMode: React.FC<OrderModeProps> = ({ recipes, categories, onBack, onShowToast }) => {
  const [activeCategory, setActiveCategory] = useState<string>(categories[0] || '全部');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isClickScrolling = useRef(false);

  const [cart, setCart] = useState<Record<string, number>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [prepResult, setPrepResult] = useState<string | null>(null);
  const [menuTheme, setMenuTheme] = useState<MenuThemeData | null>(null);
  const menuCardRef = useRef<HTMLDivElement>(null);
  const [selectedTheme, setSelectedTheme] = useState<MenuThemeChoice>('auto');

  const [showAiModal, setShowAiModal] = useState(false);
  const [peopleCount, setPeopleCount] = useState(2);
  const [isRecommending, setIsRecommending] = useState(false);
  const [aiLoadingText, setAiLoadingText] = useState('思考中...');
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const swipeHandlers = useSwipe(onBack);

  useEffect(() => {
    const handleScroll = () => {
        if (isClickScrolling.current) return;
        if (!scrollContainerRef.current) return;
        const offset = 100;
        let currentCat = categories[0];
        for (const cat of categories) {
            const el = categoryRefs.current[cat];
            if (el && el.offsetTop - scrollContainerRef.current.offsetTop <= scrollContainerRef.current.scrollTop + offset) {
                currentCat = cat;
            }
        }
        if (currentCat !== activeCategory) setActiveCategory(currentCat);
    };
    const container = scrollContainerRef.current;
    if (container) container.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, [categories, activeCategory]);

  const scrollToCategory = (cat: string) => {
      setActiveCategory(cat);
      const el = categoryRefs.current[cat];
      if (el) {
          isClickScrolling.current = true;
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setTimeout(() => { isClickScrolling.current = false; }, 500);
      }
  };

  const isSelected = (id: string): boolean => !!cart[id];

  const toggleSelection = (id: string) => {
    setCart(prev => {
      const newState = { ...prev };
      if (newState[id]) delete newState[id];
      else newState[id] = 1;
      return newState;
    });
  };

  const totalItems = Object.keys(cart).length;
  const selectedRecipeIds = Object.keys(cart);
  const selectedRecipes = recipes.filter(r => selectedRecipeIds.includes(r.id));

  const handleAiRecommendation = async () => {
      setIsRecommending(true);
      setAiLoadingText('思考中...');
      setErrorDetail(null);
      try {
          const result = await recommendMenu(recipes, peopleCount);
          if (result && result.selectedIds) {
              const newCart: Record<string, number> = {};
              result.selectedIds.forEach((id: string) => { newCart[id] = 1; });
              setCart(newCart);
              setAiLoadingText('生成海报中...');
              const themeResult = await generateMenuTheme(recipes, result.selectedIds);
              if (selectedTheme !== 'auto') themeResult.themeColor = selectedTheme;
              setMenuTheme(themeResult);
              setShowAiModal(false);
          }
      } catch (error: any) {
          setErrorDetail(error.message || "未知错误");
          onShowToast?.("AI 推荐失败", 'error');
      } finally {
          setIsRecommending(false);
      }
  };

  const handleGenerateMenu = async () => {
    if (totalItems === 0) return;
    setIsGenerating(true);
    setErrorDetail(null);
    try {
        const result = await generateMenuTheme(recipes, selectedRecipeIds);
        if (selectedTheme !== 'auto') result.themeColor = selectedTheme;
        setMenuTheme(result);
    } catch (error: any) {
        setErrorDetail(error.message || "生成失败");
        onShowToast?.("生成失败", 'error');
    } finally {
        setIsGenerating(false);
    }
  };

  const handlePrepList = () => {
    if (totalItems === 0) return;
    const summary: Record<string, string[]> = {};
    selectedRecipes.forEach(recipe => {
        recipe.ingredients.forEach(ing => {
            const name = ing.name.trim();
            if (!name) return;
            if (!summary[name]) summary[name] = [];
            if (ing.amount?.trim()) summary[name].push(ing.amount);
        });
    });
    let text = "";
    Object.keys(summary).forEach(name => {
        const amounts = summary[name];
        text += amounts.length > 0 ? `• ${name}: ${amounts.join(' + ')}\n` : `• ${name}\n`;
    });
    setPrepResult(text || "没有找到相关食材信息");
  };

  const downloadMenu = async () => {
    if (menuCardRef.current === null) return;
    try {
        const blob = await toBlob(menuCardRef.current, { cacheBust: true, pixelRatio: 3 });
        if (!blob) throw new Error('Failed to generate image');
        const file = new File([blob], `menu-${Date.now()}.png`, { type: 'image/png' });
        if (navigator.share && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: '今日菜单', text: '来看看今天的菜单吧！' });
        } else {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `menu-${Date.now()}.png`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        }
    } catch (err) {
        onShowToast?.("保存/分享图片失败", 'error');
    }
  };

  const groupedMenu = selectedRecipes.reduce((acc, recipe) => {
    if (!acc[recipe.category]) acc[recipe.category] = [];
    acc[recipe.category].push(recipe);
    return acc;
  }, {} as Record<string, Recipe[]>);

  const getThemeStyles = (color: string) => {
    switch (color) {
      case 'new-year':
        return {
          bg: '#941B0C',
          primary: '#FFD700',
          secondary: '#E6B800',
          text: '#FFFFFF',
          divider: '#E6B800',
          isNewYear: true,
          pattern: 'opacity-10 pointer-events-none absolute inset-0 mix-blend-overlay'
        };
      case 'red':
        return { bg: '#fdf2f2', primary: '#c53030', secondary: '#e53e3e', text: '#742a2a', divider: '#fc8181' };
      case 'green':
        return { bg: '#f0fdf4', primary: '#276749', secondary: '#38a169', text: '#22543d', divider: '#9ae6b4' };
       case 'blue':
        return { bg: '#ebf8ff', primary: '#2c5282', secondary: '#4299e1', text: '#2a4365', divider: '#90cdf4' };
       case 'neutral':
       default:
        return { bg: '#F9F7F2', primary: '#8B7E66', secondary: '#B89868', text: '#4A4A4A', divider: '#B89868' };
    }
  };

  const themeStyles = menuTheme ? getThemeStyles(menuTheme.themeColor) : getThemeStyles('neutral');

  const THEMES: { id: MenuThemeChoice, label: string, color: string }[] = [
    { id: 'auto', label: '自动', color: 'bg-gray-200' },
    { id: 'new-year', label: '新年红', color: 'bg-[#941B0C]' },
    { id: 'green', label: '自然绿', color: 'bg-green-600' },
    { id: 'blue', label: '深海蓝', color: 'bg-blue-600' },
    { id: 'neutral', label: '素雅', color: 'bg-[#B89868]' }
  ];

  return (
    <div className="flex flex-col h-full bg-white relative" {...swipeHandlers}>
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 sticky top-0 bg-white z-20">
        <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={24} className="text-gray-800"/></button>
        <h1 className="text-lg font-bold text-gray-800">点菜模式</h1>
        <button onClick={() => setShowAiModal(true)} className="text-[#1a472a] font-bold text-xs flex items-center gap-1 bg-green-50 px-3 py-1.5 rounded-full"><Bot size={16} />AI 帮点</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-24 bg-[#f7f8fa] overflow-y-auto no-scrollbar pb-32 border-r border-gray-100">
          {categories.map(cat => (
            <button key={cat} onClick={() => scrollToCategory(cat)} className={`w-full py-4 text-xs font-medium relative transition-colors ${activeCategory === cat ? 'bg-white text-[#1a472a] font-bold' : 'text-gray-500'}`}>
               {activeCategory === cat && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-[#1a472a] rounded-r-full"></div>}
               {cat}
               {recipes.filter(r => r.category === cat).some(r => isSelected(r.id)) && <div className="absolute top-3 right-2 w-1.5 h-1.5 bg-red-500 rounded-full"></div>}
            </button>
          ))}
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-32 p-4 scroll-smooth">
            {categories.map(cat => {
                const categoryRecipes = recipes.filter(r => r.category === cat);
                if (categoryRecipes.length === 0) return null;
                return (
                    <div key={cat} ref={(el) => { categoryRefs.current[cat] = el; }} className="mb-8 scroll-mt-4">
                        <h2 className="text-xs font-bold text-gray-400 mb-4 pl-1">{cat}</h2>
                        <div className="space-y-6">
                            {categoryRecipes.map(recipe => {
                                const selected = isSelected(recipe.id);
                                return (
                                    <div key={recipe.id} onClick={() => toggleSelection(recipe.id)} className={`flex gap-3 group p-2 rounded-2xl transition-all cursor-pointer border ${selected ? 'bg-[#1a472a]/5 border-[#1a472a]/20' : 'bg-transparent border-transparent'}`}>
                                        <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-100 shadow-sm">
                                            {/* Optimization: Use 400px width (Home page thumbnail) to hit browser cache instantly */}
                                            <ImageWithSkeleton 
                                                src={getOptimizedImageUrl(recipe.coverImage, 400, 80)} 
                                                alt={recipe.title} 
                                                className="w-full h-full object-cover" 
                                                wrapperClassName="absolute inset-0"
                                            />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between py-1">
                                            <h3 className={`font-bold text-sm ${selected ? 'text-[#1a472a]' : 'text-gray-800'}`}>{recipe.title}</h3>
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-xs text-[#1a472a]">{PROFICIENCY_TEXT[recipe.proficiency]}</span>
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${selected ? 'bg-[#1a472a] text-white' : 'border-2 border-gray-200'}`}><CheckCircle2 size={16} /></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      <div className="absolute left-4 right-4 bg-white/95 backdrop-blur-md rounded-3xl shadow-xl p-3 flex flex-col gap-3 z-30 border border-gray-100 bottom-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1a472a] rounded-full flex items-center justify-center text-white relative shadow-md">
                    <ShoppingBag size={18} />
                    {totalItems > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">{totalItems}</span>}
                </div>
                <div className="flex flex-col"><span className="text-[10px] text-gray-500 font-medium">已选菜品</span><span className="font-bold text-gray-900 leading-tight text-sm">{totalItems} 道</span></div>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-full border border-gray-100 overflow-x-auto no-scrollbar max-w-[180px]">
                {THEMES.map(theme => (
                    <button key={theme.id} onClick={() => setSelectedTheme(theme.id)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all whitespace-nowrap ${selectedTheme === theme.id ? 'bg-[#1a472a] text-white' : 'text-gray-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${theme.color} border border-white/20`}></div>{theme.label}
                    </button>
                ))}
            </div>
        </div>
        <div className="flex gap-2">
            <button onClick={handlePrepList} disabled={totalItems === 0 || isGenerating} className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-gray-100 rounded-2xl text-xs font-bold text-gray-600"><CheckSquare size={14} />备菜清单</button>
            <button onClick={handleGenerateMenu} disabled={totalItems === 0 || isGenerating} className="flex-[1.5] flex items-center justify-center gap-1.5 py-3 bg-[#1a472a] text-white rounded-2xl text-xs font-bold shadow-lg">{isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} fill="white" />}生成艺术菜单</button>
        </div>
      </div>

      {showAiModal && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-6">
                <div className="text-center">
                    <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3 text-[#1a472a]"><Bot size={24} /></div>
                    <h3 className="font-bold text-lg text-gray-800">AI 智能点菜</h3>
                    <p className="text-sm text-gray-400 mt-1">根据人数和时令自动搭配一桌好菜</p>
                </div>
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl">
                    <span className="text-gray-700 font-medium flex items-center gap-2"><Users size={18} className="text-gray-400" />用餐人数</span>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold">-</button>
                        <span className="text-xl font-bold min-w-[2rem] text-center">{peopleCount}</span>
                        <button onClick={() => setPeopleCount(Math.min(20, peopleCount + 1))} className="w-8 h-8 rounded-full bg-[#1a472a] text-white flex items-center justify-center font-bold">+</button>
                    </div>
                </div>
                <div className="flex gap-3 pt-2">
                    <button onClick={() => setShowAiModal(false)} className="flex-1 py-3.5 bg-gray-100 rounded-xl font-bold text-gray-600 text-sm">取消</button>
                    <button onClick={handleAiRecommendation} disabled={isRecommending} className="flex-1 py-3.5 bg-[#1a472a] text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2">{isRecommending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} fill="white" />}生成建议</button>
                </div>
           </div>
        </div>
      )}

      {prepResult && (
        <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-6 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl">
                <h3 className="font-bold text-lg mb-4 text-[#1a472a] flex items-center gap-2">📝 备菜汇总</h3>
                <div className="bg-[#f7f8fa] p-5 rounded-2xl text-sm text-gray-700 whitespace-pre-line max-h-80 overflow-y-auto leading-relaxed">{prepResult}</div>
                <button onClick={() => setPrepResult(null)} className="w-full mt-5 py-3.5 bg-[#1a472a] text-white rounded-2xl font-bold text-sm shadow-lg">关闭</button>
            </div>
        </div>
      )}

      {menuTheme && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full h-full max-w-[400px] relative flex flex-col justify-center">
              <button onClick={() => setMenuTheme(null)} className="absolute top-4 right-0 text-white/80 p-2 z-50"><X size={28} /></button>
              <div ref={menuCardRef} className={`relative overflow-hidden shadow-2xl flex flex-col items-center py-12 px-8 min-h-[600px] max-h-[85vh] font-serif transition-colors duration-500 rounded-sm`}
                style={{ backgroundColor: themeStyles.bg }}>
                  {themeStyles.isNewYear && <div className={themeStyles.pattern} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 86c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm76-52c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm-54-9c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM80 80c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM9 36c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")` }} />}
                  <div className="w-full text-center mb-8">
                     <div className="inline-block border-b-2 pb-1 mb-2" style={{ borderColor: themeStyles.secondary }}><span className="tracking-[0.3em] text-xs font-bold uppercase" style={{ color: themeStyles.secondary }}>CHEFNOTE</span></div>
                     <h2 className="text-2xl font-bold tracking-widest" style={{ color: themeStyles.primary }}>{menuTheme.title}</h2>
                     <p className="text-xs mt-2 font-medium opacity-60" style={{ color: themeStyles.primary }}>ChefNote · 私宴专用经典套餐</p>
                  </div>
                  <div className="w-8 h-[1px] mb-8" style={{ backgroundColor: themeStyles.divider }}></div>
                  <div className="w-full flex-1 space-y-6">
                      {categories.map(category => {
                          const courseRecipes = groupedMenu[category];
                          if (!courseRecipes || courseRecipes.length === 0) return null;
                          return (
                              <div key={category} className="w-full text-center">
                                  <h3 className="text-sm font-bold tracking-widest mb-2" style={{ color: themeStyles.secondary }}>♦ {category} ♦</h3>
                                  <div className="space-y-1">
                                      {courseRecipes.map(r => <p key={r.id} className="text-sm font-medium tracking-wide" style={{ color: themeStyles.text }}>{r.title}</p>)}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
                  <div className="w-full flex justify-center mt-12 relative h-24">
                      <div className="flex flex-col items-center gap-3">
                          <p className="text-xs italic font-serif" style={{ color: themeStyles.primary }}>{menuTheme.seasonalPhrase || menuTheme.description}</p>
                          <div className={`w-8 h-8 border rounded-sm flex items-center justify-center bg-white/50 shadow-sm ${themeStyles.isNewYear ? 'border-red-600' : 'border-[#A83838]'}`}>
                              <span className={`${themeStyles.isNewYear ? 'text-red-700' : 'text-[#A83838]'} text-[10px] font-bold`} style={{ writingMode: 'vertical-rl' }}>知味</span>
                          </div>
                      </div>
                      <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none">
                          <span className="text-6xl font-serif writing-vertical-rl" style={{ writingMode: 'vertical-rl', color: themeStyles.secondary }}>{menuTheme.idiom}</span>
                      </div>
                  </div>
                  {themeStyles.isNewYear && <div className="absolute top-4 left-4 border border-white/20 p-1 opacity-20"><div className="text-[8px] text-white">CNY EDITION</div></div>}
              </div>
              <div className="mt-6 flex justify-center w-full">
                  <button onClick={downloadMenu} className="flex items-center gap-2 bg-white text-gray-900 px-8 py-3 rounded-full font-bold shadow-xl active:scale-95 transition-all"><Share2 size={18} />分享菜单图片</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
