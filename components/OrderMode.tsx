import React, { useState, useRef } from 'react';
import { ChevronLeft, ShoppingBag, Sparkles, CheckSquare, Download, X, CheckCircle2, Flame, Share2, Users, Bot, AlertTriangle, Copy } from 'lucide-react';
import { toBlob } from 'html-to-image';
import { Recipe } from '../types';
import { generateMenuTheme, recommendMenu } from '../services/geminiService';
import { ToastType } from './Toast';
import { useSwipe } from '../hooks/useSwipe';
import { PROFICIENCY_TEXT } from '../constants';

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
}

export const OrderMode: React.FC<OrderModeProps> = ({ recipes, categories, onBack, onShowToast }) => {
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [prepResult, setPrepResult] = useState<string | null>(null);
  const [menuTheme, setMenuTheme] = useState<MenuThemeData | null>(null);
  const menuCardRef = useRef<HTMLDivElement>(null);

  // AI Recommendation State
  const [showAiModal, setShowAiModal] = useState(false);
  const [peopleCount, setPeopleCount] = useState(2);
  const [isRecommending, setIsRecommending] = useState(false);
  const [aiLoadingText, setAiLoadingText] = useState('思考中...');
  
  // Debug/Error Modal State
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  // Swipe Handler
  const swipeHandlers = useSwipe(onBack);

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

  // --- AI Logic ---
  const handleAiRecommendation = async () => {
      setIsRecommending(true);
      setAiLoadingText('思考中...');
      setErrorDetail(null); // Clear previous errors

      try {
          // 1. Get Recommendations
          const result = await recommendMenu(recipes, peopleCount);
          if (result && result.selectedIds) {
              // 2. Update Cart
              const newCart: Record<string, number> = {};
              result.selectedIds.forEach((id: string) => {
                  newCart[id] = 1;
              });
              setCart(newCart);
              
              setAiLoadingText('生成海报中...');

              // 3. Auto-generate Menu Theme (Poster)
              try {
                 const themeResult = await generateMenuTheme(recipes, result.selectedIds);
                 setMenuTheme(themeResult);
              } catch (themeError) {
                 console.error("Theme generation failed", themeError);
                 if (onShowToast) onShowToast("海报生成失败，但菜品已选择", 'error');
              }

              setShowAiModal(false);
          }
      } catch (error: any) {
          // Instead of just a toast, show the error modal so user can see raw output
          setErrorDetail(error.message || "未知错误");
          if (onShowToast) onShowToast("AI 推荐失败，请查看详情", 'error');
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
        setMenuTheme(result);
    } catch (error: any) {
        setErrorDetail(error.message || "生成失败");
        if (onShowToast) onShowToast("生成失败，请查看详情", 'error');
    } finally {
        setIsGenerating(false);
    }
  };

  // Local Prep List Aggregation
  const handlePrepList = () => {
    if (totalItems === 0) return;
    
    // Aggregation Logic
    const summary: Record<string, string[]> = {};

    selectedRecipes.forEach(recipe => {
        recipe.ingredients.forEach(ing => {
            const name = ing.name.trim();
            if (!name) return;
            if (!summary[name]) {
                summary[name] = [];
            }
            if (ing.amount && ing.amount.trim()) {
                summary[name].push(ing.amount);
            }
        });
    });

    // Formatting output
    let text = "";
    Object.keys(summary).forEach(name => {
        const amounts = summary[name];
        if (amounts.length > 0) {
            text += `• ${name}: ${amounts.join(' + ')}\n`;
        } else {
            text += `• ${name}\n`;
        }
    });

    if (!text) text = "没有找到相关食材信息";
    setPrepResult(text);
  };

  const downloadMenu = async () => {
    if (menuCardRef.current === null) {
      return;
    }

    try {
        const blob = await toBlob(menuCardRef.current, { cacheBust: true, pixelRatio: 3 });
        if (!blob) throw new Error('Failed to generate image');

        // PWA / Mobile Sharing Strategy
        // If navigator.share is supported (standard on iOS/Android), use it to share the file directly.
        // This is much more reliable in PWA mode than a download link.
        if (navigator.share && navigator.canShare) {
            const file = new File([blob], `menu-${Date.now()}.png`, { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: '今日菜单',
                    text: '来看看今天的菜单吧！'
                });
                return;
            }
        }

        // Fallback for Desktop / Non-Share browsers
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `menu-${Date.now()}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);

    } catch (err) {
        console.error('Download failed', err);
        if (onShowToast) onShowToast("保存/分享图片失败", 'error');
    }
  };

  // Group recipes by category or show filtered list
  const displayRecipes = activeCategory === '全部' 
    ? recipes 
    : recipes.filter(r => r.category === activeCategory);

  // Group selected recipes by their ACTUAL category
  const groupedMenu = selectedRecipes.reduce((acc, recipe) => {
    if (!acc[recipe.category]) acc[recipe.category] = [];
    acc[recipe.category].push(recipe);
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
    <div className="flex flex-col h-full bg-white relative" {...swipeHandlers}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 sticky top-0 bg-white z-20">
        <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft size={24} className="text-gray-800"/>
        </button>
        <h1 className="text-lg font-bold text-gray-800">点菜模式</h1>
        <button 
            onClick={() => setShowAiModal(true)}
            className="text-[#1a472a] font-bold text-xs flex items-center gap-1 bg-green-50 px-3 py-1.5 rounded-full hover:bg-green-100 transition-colors"
        >
            <Bot size={16} />
            AI 帮点
        </button>
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
                    const cookCount = recipe.logs ? recipe.logs.length : 0;
                    
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
                                    {/* Mock tags - Fixed vertical alignment */}
                                    <div className="flex gap-1 mt-1.5">
                                        <span className="inline-flex items-center justify-center text-[10px] bg-white text-gray-400 px-1.5 py-0.5 rounded-md border border-gray-100 leading-none">
                                            <span className="pt-[1px]">{recipe.category}</span>
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-xs text-[#1a472a]">
                                            {PROFICIENCY_TEXT[recipe.proficiency]}
                                        </span>
                                        {cookCount > 0 && (
                                            <span className="flex items-center text-[10px] text-orange-500 font-bold bg-orange-50 px-1.5 py-0.5 rounded-md border border-orange-100">
                                                <Flame size={10} fill="currentColor" className="mr-0.5" />
                                                {cookCount}
                                            </span>
                                        )}
                                    </div>
                                    
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

      {/* AI Recommendation Modal */}
      {showAiModal && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-6">
                <div className="text-center">
                    <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3 text-[#1a472a]">
                        <Bot size={24} />
                    </div>
                    <h3 className="font-bold text-lg text-gray-800">AI 智能点菜</h3>
                    <p className="text-sm text-gray-400 mt-1">根据人数和时令自动搭配一桌好菜</p>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl">
                        <span className="text-gray-700 font-medium flex items-center gap-2">
                            <Users size={18} className="text-gray-400" />
                            用餐人数
                        </span>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}
                                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 font-bold active:scale-90 transition-transform"
                            >
                                -
                            </button>
                            <span className="text-xl font-bold min-w-[2rem] text-center text-black">{peopleCount}</span>
                            <button 
                                onClick={() => setPeopleCount(Math.min(20, peopleCount + 1))}
                                className="w-8 h-8 rounded-full bg-[#1a472a] text-white flex items-center justify-center font-bold active:scale-90 transition-transform shadow-sm"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button 
                        onClick={() => setShowAiModal(false)}
                        className="flex-1 py-3.5 bg-gray-100 rounded-xl font-bold text-gray-600 text-sm"
                    >
                        取消
                    </button>
                    <button 
                        onClick={handleAiRecommendation}
                        disabled={isRecommending}
                        className="flex-1 py-3.5 bg-[#1a472a] text-white rounded-xl font-bold text-sm shadow-lg shadow-green-900/20 flex items-center justify-center gap-2"
                    >
                        {isRecommending ? (
                            <>
                                <Sparkles size={16} className="animate-spin" />
                                {aiLoadingText}
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} fill="white" />
                                开始生成
                            </>
                        )}
                    </button>
                </div>
           </div>
        </div>
      )}

      {/* Error Details Modal */}
      {errorDetail && (
        <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
           <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl flex flex-col max-h-[80vh]">
                <div className="flex items-center gap-3 mb-4 text-red-600">
                    <AlertTriangle size={24} />
                    <h3 className="font-bold text-lg">生成失败</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto bg-red-50 p-4 rounded-xl mb-4 border border-red-100">
                    <p className="text-xs font-mono text-red-900 break-words whitespace-pre-wrap">
                        {errorDetail}
                    </p>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(errorDetail);
                            if (onShowToast) onShowToast("错误信息已复制", 'success');
                        }}
                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                    >
                        <Copy size={16} />
                        复制
                    </button>
                    <button 
                        onClick={() => setErrorDetail(null)}
                        className="flex-1 py-3 bg-[#1a472a] text-white rounded-xl font-bold text-sm shadow-lg shadow-green-900/20"
                    >
                        关闭
                    </button>
                </div>
           </div>
        </div>
      )}

      {/* Prep List Modal */}
      {prepResult && (
        <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl transform transition-all scale-100">
                <h3 className="font-bold text-lg mb-4 text-[#1a472a] flex items-center gap-2">
                    📝 备菜汇总
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

                  {/* Course List - using Actual Categories */}
                  <div className="w-full flex-1 space-y-6">
                      {categories.map(category => {
                          const courseRecipes = groupedMenu[category];
                          if (!courseRecipes || courseRecipes.length === 0) return null;
                          
                          return (
                              <div key={category} className="w-full text-center">
                                  <h3 className="text-sm font-bold tracking-widest mb-2 flex items-center justify-center gap-2" style={{ color: themeStyles.secondary }}>
                                      <span className="opacity-50 text-[10px]">♦</span> {category} <span className="opacity-50 text-[10px]">♦</span>
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
                      {/* Show Share icon on mobile if likely supported, else download */}
                      {navigator.share ? <Share2 size={18} /> : <Download size={18} />}
                      {navigator.share ? '保存/分享图片' : '下载图片'}
                  </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};