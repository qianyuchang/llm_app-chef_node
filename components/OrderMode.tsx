import React, { useState, useRef } from 'react';
import { ChevronLeft, ShoppingBag, Sparkles, CheckSquare, Download, X, CheckCircle2, Circle } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Recipe } from '../types';
import { generatePrepList, generateMenuTheme } from '../services/geminiService';
import { ToastType } from './Toast';

interface OrderModeProps {
  recipes: Recipe[];
  categories: string[];
  onBack: () => void;
  onShowToast?: (message: string, type: ToastType) => void;
}

const COURSE_ORDER = ['前菜', '汤羹', '热菜', '主食', '甜品', '其他'];

const mapCategoryToCourse = (category: string): string => {
  if (['凉菜'].includes(category)) return '前菜';
  if (['汤羹'].includes(category)) return '汤羹';
  if (['炒菜', '炖菜', '清蒸'].includes(category)) return '热菜';
  if (['主食', '面点'].includes(category)) return '主食';
  if (['甜品'].includes(category)) return '甜品';
  return '其他';
};

interface MenuThemeData {
  title: string;
  description: string;
  idiom: string;
  themeColor: string;
}

export const OrderMode: React.FC<OrderModeProps> = ({ recipes, categories, onBack, onShowToast }) => {
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  // Use a Set-like logic for selection. Value 1 means selected, 0 means not.
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [prepResult, setPrepResult] = useState<string | null>(null);
  const [menuTheme, setMenuTheme] = useState<MenuThemeData | null>(null);
  const menuCardRef = useRef<HTMLDivElement>(null);

  const isSelected = (id: string): boolean => {
    return !!cart[id];
  };

  const toggleSelection = (id: string) => {
    setCart(prev => {
      const newState = { ...prev };
      if (newState[id]) {
        delete newState[id];
      } else {
        newState[id] = 1;
      }
      return newState;
    });
  };

  const totalItems = Object.keys(cart).length;
  const selectedRecipeIds = Object.keys(cart);
  const selectedRecipes = recipes.filter(r => selectedRecipeIds.includes(r.id));

  const handleGenerateMenu = async () => {
    if (totalItems === 0) return;
    setIsGenerating(true);
    try {
        const result = await generateMenuTheme(recipes, selectedRecipeIds);
        setMenuTheme(result);
    } catch (error) {
        if (onShowToast) onShowToast("生成失败: " + (error as Error).message, 'error');
        console.error(error);
    } finally {
        setIsGenerating(false);
    }
  };

  const handlePrepList = async () => {
    if (totalItems === 0) return;
    setIsGenerating(true);
    try {
        const result = await generatePrepList(recipes, selectedRecipeIds);
        setPrepResult(result || '');
    } catch (error) {
        if (onShowToast) onShowToast("生成失败: " + (error as Error).message, 'error');
        console.error(error);
    } finally {
        setIsGenerating(false);
    }
  };

  const downloadMenu = () => {
    if (menuCardRef.current === null) {
      return;
    }

    toPng(menuCardRef.current, { cacheBust: true, pixelRatio: 3 }) // High res
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `menu-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('oops, something went wrong!', err);
        if (onShowToast) onShowToast("保存图片失败", 'error');
      });
  };

  // Group recipes by category or show filtered list
  const displayRecipes = activeCategory === '全部' 
    ? recipes 
    : recipes.filter(r => r.category === activeCategory);

  // Group selected recipes for menu card
  const groupedMenu = selectedRecipes.reduce((acc, recipe) => {
    const course = mapCategoryToCourse(recipe.category);
    if (!acc[course]) acc[course] = [];
    acc[course].push(recipe);
    return acc;
  }, {} as Record<string, Recipe[]>);

  // Theme Styles Helper
  const getThemeStyles = (color: string) => {
    switch (color) {
      case 'red':
        return {
          bg: '#fdf2f2',
          primary: '#c53030', // Text Title
          secondary: '#e53e3e', // Accents
          text: '#742a2a',
          divider: '#fc8181',
          noiseOpacity: 0.03
        };
      case 'green':
        return {
          bg: '#f0fdf4',
          primary: '#276749',
          secondary: '#38a169',
          text: '#22543d',
          divider: '#9ae6b4',
          noiseOpacity: 0.04
        };
       case 'blue':
        return {
          bg: '#ebf8ff',
          primary: '#2c5282',
          secondary: '#4299e1',
          text: '#2a4365',
          divider: '#90cdf4',
          noiseOpacity: 0.03
        };
       case 'neutral':
       default: // orange/brown default
        return {
          bg: '#F9F7F2',
          primary: '#8B7E66',
          secondary: '#B89868',
          text: '#4A4A4A',
          divider: '#B89868',
          noiseOpacity: 0.05
        };
    }
  };

  const themeStyles = menuTheme ? getThemeStyles(menuTheme.themeColor) : getThemeStyles('neutral');

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 sticky top-0 bg-white z-20">
        <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft size={24} className="text-gray-800"/>
        </button>
        <h1 className="text-lg font-bold text-gray-800">点菜模式</h1>
        <div className="w-8"></div> {/* spacer */}
      </div>

      {/* Main Split View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-24 bg-[#f7f8fa] overflow-y-auto no-scrollbar pb-32 border-r border-gray-100">
          <button
             onClick={() => setActiveCategory('全部')}
             className={`w-full py-4 text-xs font-medium relative transition-colors ${activeCategory === '全部' ? 'bg-white text-[#1a472a] font-bold' : 'text-gray-500'}`}
          >
            {activeCategory === '全部' && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-[#1a472a] rounded-r-full"></div>
            )}
            全部
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`w-full py-4 text-xs font-medium relative transition-colors ${activeCategory === cat ? 'bg-white text-[#1a472a] font-bold' : 'text-gray-500'}`}
            >
               {activeCategory === cat && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-[#1a472a] rounded-r-full"></div>
               )}
              {cat}
              {/* Category Badge */}
              {recipes.filter(r => r.category === cat).some(r => isSelected(r.id)) && (
                <div className="absolute top-3 right-2 w-1.5 h-1.5 bg-red-500 rounded-full"></div>
              )}
            </button>
          ))}
        </div>

        {/* Recipe List */}
        <div className="flex-1 overflow-y-auto pb-32 p-4">
            <h2 className="text-xs font-bold text-gray-400 mb-4 pl-1">{activeCategory}</h2>
            <div className="space-y-6">
                {displayRecipes.map(recipe => {
                    const selected = isSelected(recipe.id);
                    return (
                        <div 
                            key={recipe.id} 
                            onClick={() => toggleSelection(recipe.id)}
                            className={`flex gap-3 group p-2 rounded-2xl transition-all cursor-pointer border ${selected ? 'bg-[#1a472a]/5 border-[#1a472a]/20' : 'bg-transparent border-transparent hover:bg-gray-50'}`}
                        >
                            <img 
                                src={recipe.coverImage} 
                                alt={recipe.title} 
                                className="w-20 h-20 rounded-xl object-cover bg-gray-100 shrink-0 shadow-sm"
                            />
                            <div className="flex-1 flex flex-col justify-between py-1">
                                <div>
                                    <h3 className={`font-bold text-sm ${selected ? 'text-[#1a472a]' : 'text-gray-800'}`}>{recipe.title}</h3>
                                    {/* Mock tags */}
                                    <div className="flex gap-1 mt-1.5">
                                        <span className="text-[10px] bg-white text-gray-400 px-1.5 py-0.5 rounded-md border border-gray-100">
                                        {recipe.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-xs text-gray-400">
                                    难度: {recipe.proficiency}
                                    </span>
                                    
                                    {/* Selection Toggle */}
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${selected ? 'bg-[#1a472a] text-white shadow-md scale-110' : 'border-2 border-gray-200 text-transparent'}`}>
                                        <CheckCircle2 size={16} className={selected ? 'block' : 'hidden'} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      {/* Floating Bottom Bar */}
      <div className="absolute left-4 right-4 bg-white/90 backdrop-blur-md rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-2 pl-3 flex items-center justify-between z-30 border border-white/50 bottom-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1a472a] rounded-full flex items-center justify-center text-white relative shadow-md">
                <ShoppingBag size={18} />
                {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                        {totalItems}
                    </span>
                )}
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 font-medium">已选菜品</span>
                <span className="font-bold text-gray-900 leading-tight text-sm">{totalItems} 道</span>
            </div>
        </div>
        
        <div className="flex gap-2">
            <button 
                onClick={handlePrepList}
                disabled={totalItems === 0 || isGenerating}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
                <CheckSquare size={14} />
                备菜
            </button>
            <button 
                onClick={handleGenerateMenu}
                disabled={totalItems === 0 || isGenerating}
                className="flex items-center gap-1 px-4 py-2 bg-[#1a472a] text-white rounded-full text-xs font-bold hover:bg-[#143620] transition-colors disabled:opacity-50 shadow-md shadow-green-900/10"
            >
                {isGenerating ? (
                   <span className="animate-pulse">生成中...</span>
                ) : (
                    <>
                        <Sparkles size={14} fill="white" />
                        生成菜单
                    </>
                )}
            </button>
        </div>
      </div>

      {/* Prep List Modal */}
      {prepResult && (
        <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl transform transition-all scale-100">
                <h3 className="font-bold text-lg mb-4 text-[#1a472a] flex items-center gap-2">
                    📝 备菜清单
                </h3>
                <div className="bg-[#f7f8fa] p-5 rounded-2xl text-sm text-gray-700 whitespace-pre-line max-h-80 overflow-y-auto custom-scrollbar leading-relaxed">
                    {prepResult}
                </div>
                <button 
                    onClick={() => setPrepResult(null)}
                    className="w-full mt-5 py-3.5 bg-[#1a472a] text-white rounded-2xl font-bold text-sm shadow-lg shadow-green-900/20 active:scale-95 transition-transform"
                >
                    关闭
                </button>
            </div>
        </div>
      )}

      {/* Menu Card Modal (Fullscreen) */}
      {menuTheme && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full h-full max-w-[400px] relative flex flex-col justify-center">
              <button 
                  onClick={() => setMenuTheme(null)}
                  className="absolute top-4 right-0 text-white/80 hover:text-white p-2 z-50"
              >
                  <X size={28} />
              </button>

              {/* The Rendered Menu Card - Reference Style */}
              <div 
                ref={menuCardRef} 
                className="relative overflow-hidden shadow-2xl flex flex-col items-center py-12 px-8 min-h-[600px] max-h-[85vh] font-serif transition-colors duration-500"
                style={{
                    backgroundColor: themeStyles.bg,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='${themeStyles.noiseOpacity}'/%3E%3C/svg%3E")`,
                }}
              >
                  {/* Decorative Header */}
                  <div className="w-full text-center mb-8">
                     <div className="inline-block border-b-2 pb-1 mb-2" style={{ borderColor: themeStyles.secondary }}>
                         <span className="tracking-[0.3em] text-xs font-bold uppercase" style={{ color: themeStyles.secondary }}>CHEFNOTE</span>
                     </div>
                     <h2 className="text-2xl font-bold tracking-widest" style={{ color: themeStyles.primary }}>{menuTheme.title}</h2>
                     <p className="text-xs mt-2 font-medium opacity-60" style={{ color: themeStyles.primary }}>ChefNote · 私宴专用经典套餐</p>
                  </div>

                  {/* Divider */}
                  <div className="w-8 h-[1px] mb-8" style={{ backgroundColor: themeStyles.divider }}></div>

                  {/* Course List */}
                  <div className="w-full flex-1 space-y-6">
                      {COURSE_ORDER.map(course => {
                          const courseRecipes = groupedMenu[course];
                          if (!courseRecipes || courseRecipes.length === 0) return null;
                          
                          return (
                              <div key={course} className="w-full text-center">
                                  <h3 className="text-sm font-bold tracking-widest mb-2 flex items-center justify-center gap-2" style={{ color: themeStyles.secondary }}>
                                      <span className="opacity-50 text-[10px]">♦</span> {course} <span className="opacity-50 text-[10px]">♦</span>
                                  </h3>
                                  <div className="space-y-1">
                                      {courseRecipes.map(r => (
                                          <p key={r.id} className="text-sm font-medium tracking-wide" style={{ color: themeStyles.text }}>
                                              {r.title}
                                          </p>
                                      ))}
                                  </div>
                              </div>
                          );
                      })}
                  </div>

                  {/* Footer Seal & Idiom */}
                  <div className="w-full flex justify-center mt-12 relative h-24">
                      <div className="flex flex-col items-center gap-3">
                          <p className="text-xs italic font-serif" style={{ color: themeStyles.primary }}>
                              {menuTheme.description}
                          </p>
                          {/* Stamp */}
                          <div className="w-8 h-8 border border-[#A83838] rounded-sm flex items-center justify-center bg-white/50 shadow-sm">
                              <span className="text-[#A83838] text-[10px] font-bold writing-vertical-rl" style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}>
                                  知味
                              </span>
                          </div>
                          <p className="text-[10px] uppercase tracking-widest opacity-40" style={{ color: themeStyles.text }}>
                              {new Date().toDateString()}
                          </p>
                      </div>
                      
                       {/* Right side artistic vertical text (Dynamic Idiom) */}
                      <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none">
                          <span className="text-6xl font-serif writing-vertical-rl select-none" style={{ writingMode: 'vertical-rl', color: themeStyles.secondary }}>
                             {menuTheme.idiom || '秋意浓'}
                          </span>
                      </div>
                  </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-center w-full">
                  <button 
                      onClick={downloadMenu}
                      className="flex items-center gap-2 bg-white text-gray-900 px-8 py-3 rounded-full font-bold shadow-xl active:scale-95 transition-all hover:bg-gray-50"
                  >
                      <Download size={18} />
                      保存图片
                  </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};