
import React, { useState } from 'react';
import { ChevronLeft, SquarePen, ExternalLink, Youtube, Camera, X, Trash2, Image as ImageIcon, Check, Loader2, Share2 } from 'lucide-react';
import { Recipe, CookingLog } from '../types';
import { PROFICIENCY_TEXT } from '../constants';
import { ImageCropper } from './ImageCropper';
import { ToastType } from './Toast';
import { useSwipe } from '../hooks/useSwipe';
import { api } from '../services/api';
import { getOptimizedImageUrl } from '../utils/image';
import { ImageWithSkeleton } from './ImageWithSkeleton';

interface RecipeDetailProps {
  recipe: Recipe;
  onBack: () => void;
  onEdit: (recipe: Recipe) => void;
  onUpdate: (recipe: Recipe) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onShowToast: (message: string, type: ToastType) => void;
}

const getSourceInfo = (url: string) => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('xiaohongshu') || lowerUrl.includes('xhslink')) {
    return { name: '小红书', color: 'text-red-500', bg: 'bg-red-50', icon: <span className="font-bold text-xs leading-none">小红书</span> };
  }
  if (lowerUrl.includes('bilibili')) {
    return { name: '哔哩哔哩', color: 'text-pink-400', bg: 'bg-pink-50', icon: <span className="font-bold text-xs leading-none">B站</span> };
  }
  if (lowerUrl.includes('douyin')) {
    return { name: '抖音', color: 'text-black', bg: 'bg-gray-100', icon: <span className="font-bold text-xs leading-none">抖音</span> };
  }
  if (lowerUrl.includes('youtube')) {
    return { name: 'YouTube', color: 'text-red-600', bg: 'bg-red-50', icon: <Youtube size={16} /> };
  }
  return { name: '网页链接', color: 'text-blue-500', bg: 'bg-blue-50', icon: <ExternalLink size={16} /> };
};

export const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipe, onBack, onEdit, onUpdate, onDelete, onShowToast }) => {
  const sourceInfo = recipe.sourceLink ? getSourceInfo(recipe.sourceLink) : null;
  const [showLogModal, setShowLogModal] = useState(false);
  const [newLogImage, setNewLogImage] = useState<string | null>(null);
  const [newLogNote, setNewLogNote] = useState('');
  
  // Cropper State
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  // Loading State
  const [isSaving, setIsSaving] = useState(false);
  const [processingLogId, setProcessingLogId] = useState<string | null>(null);

  // Swipe Handler
  const swipeHandlers = useSwipe(onBack);

  const handleShare = async () => {
    const ingredientsPreview = recipe.ingredients.slice(0, 3).map(i => i.name).join('、');
    const shareTitle = `👨‍🍳 来看我发现的美味：${recipe.title}`;
    const shareText = `【${recipe.title}】需要食材：${ingredientsPreview}${recipe.ingredients.length > 3 ? '等' : ''}。点击查看完整厨房笔记！`;
    
    // Create direct recipe link using hash routing
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}#/recipe/${recipe.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          onShowToast("分享失败", 'error');
        }
      }
    } else {
      // Fallback: Copy beautiful text to clipboard
      const copyContent = `${shareTitle}\n\n${shareText}\n${shareUrl}\n\n—— 来自 ChefNote 厨房笔记`;
      try {
        await navigator.clipboard.writeText(copyContent);
        onShowToast("已生成分享文案并复制", 'success');
      } catch (err) {
        onShowToast("复制失败", 'error');
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImage(reader.result as string);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleCropComplete = (croppedImage: string) => {
    setNewLogImage(croppedImage);
    setIsCropping(false);
    setTempImage(null);
  };

  const handleSaveLog = async () => {
    if (!newLogImage && !newLogNote.trim()) {
        onShowToast("请上传成品图或填写心得", 'error');
        return;
    }

    setIsSaving(true);
    const newLog: CookingLog = {
      id: Date.now().toString(),
      date: Date.now(),
      image: newLogImage || '',
      note: newLogNote
    };

    const updatedRecipe = {
      ...recipe,
      logs: [newLog, ...(recipe.logs || [])]
    };

    try {
        await onUpdate(updatedRecipe);
        setShowLogModal(false);
        setNewLogImage(null);
        setNewLogNote('');
    } catch (e) {
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (confirm('确定要删除这条记录吗？')) {
      setProcessingLogId(logId);
      const updatedLogs = recipe.logs.filter(l => l.id !== logId);
      try {
        await onUpdate({ ...recipe, logs: updatedLogs });
      } catch (e) {
      } finally {
        setProcessingLogId(null);
      }
    }
  };

  const handleSetCover = async (logId: string, imgUrl: string) => {
      setProcessingLogId(logId);
      try {
        await onUpdate({...recipe, coverImage: imgUrl});
      } catch (e) {
      } finally {
        setProcessingLogId(null);
      }
  };

  const handleDeleteRecipe = async () => {
      if (!onDelete) return;
      if (confirm(`确定要删除 "${recipe.title}" 吗？此操作无法撤销。`)) {
          await onDelete(recipe.id);
      }
  };

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden" {...swipeHandlers}>
      {/* Header Controls (z-30 to stay above everything) */}
      <div className="absolute top-0 left-0 right-0 p-4 z-30 flex justify-between items-start pointer-events-none">
        <button 
          onClick={onBack} 
          className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-gray-800 shadow-sm pointer-events-auto hover:bg-white transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        
        <div className="flex gap-2 pointer-events-auto">
            <button 
                onClick={handleShare}
                className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-[#1a472a] shadow-sm hover:bg-white transition-colors"
            >
                <Share2 size={20} />
            </button>
            {onDelete && (
                <button 
                    onClick={handleDeleteRecipe}
                    className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-red-500 shadow-sm hover:bg-red-50 transition-colors"
                >
                    <Trash2 size={20} />
                </button>
            )}
            <button 
                onClick={() => onEdit(recipe)}
                className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-gray-800 shadow-sm hover:bg-white transition-colors"
            >
                <SquarePen size={20} />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 no-scrollbar">
        {/* Cover Image Wrapper */}
        <div className="relative h-[420px] w-full group bg-black overflow-hidden">
            <ImageWithSkeleton 
                src={getOptimizedImageUrl(recipe.coverImage, 1200)} 
                lowResSrc={getOptimizedImageUrl(recipe.coverImage, 600)} 
                alt={recipe.title} 
                className="w-full h-full object-cover"
                // @ts-ignore
                fetchpriority="high"
                loading="eager"
            />
            {/* Gradient Mask (z-20 to ensure it's above the loaded image) */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white via-white/80 to-transparent z-20 pointer-events-none"></div>
        </div>

        {/* Content Area (z-20 to be at same level as mask) */}
        <div className="px-6 -mt-20 relative z-20">
            {/* Title & Stats */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="px-3 py-1 rounded-full bg-[#f0fdf4] text-[#1a472a] text-[11px] font-bold tracking-wide shadow-sm border border-[#1a472a]/10 flex items-center justify-center leading-none">
                        <span className="pt-[1px]">{recipe.category}</span>
                    </div>
                    {sourceInfo && recipe.sourceLink && (
                        <a 
                            href={recipe.sourceLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${sourceInfo.bg} ${sourceInfo.color} text-[11px] font-medium hover:opacity-80 transition-opacity leading-none`}
                        >
                            {sourceInfo.icon}
                            <span className="pt-[1px]">来源</span>
                        </a>
                    )}
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2 leading-tight">{recipe.title}</h1>
                <div className="flex items-center gap-4 text-gray-500 text-sm mt-3">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                             {[...Array(5)].map((_, i) => (
                                <div key={i} className={`w-2 h-2 rounded-full ${i < recipe.proficiency ? 'bg-[#1a472a]' : 'bg-gray-200'}`} />
                            ))}
                        </div>
                        <span className="text-xs font-bold text-[#1a472a] tracking-tight">{PROFICIENCY_TEXT[recipe.proficiency]}</span>
                    </div>
                </div>
            </div>

            {/* Ingredients */}
            <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-[#1a472a] rounded-full"></span>
                    所需食材
                </h2>
                <div className="bg-[#f7f8fa] rounded-2xl p-5 space-y-3 shadow-sm border border-gray-100">
                    {recipe.ingredients.map((ing, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[15px] border-b border-gray-200/50 last:border-0 pb-2.5 last:pb-0 pt-0.5">
                            <span className="text-gray-700 font-medium">{ing.name}</span>
                            <span className="text-gray-500 font-mono font-medium">{ing.amount}</span>
                        </div>
                    ))}
                    {recipe.ingredients.length === 0 && (
                        <p className="text-gray-400 text-sm italic py-2">暂无食材记录</p>
                    )}
                </div>
            </div>

            {/* Steps */}
            <div className="mb-12">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-[#1a472a] rounded-full"></span>
                    烹饪步骤
                </h2>
                <div className="space-y-7">
                    {recipe.steps.map((step, idx) => (
                        <div key={idx} className="flex gap-4">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1a472a] text-white flex items-center justify-center text-xs font-bold mt-1 shadow-sm shadow-green-900/20">
                                {idx + 1}
                            </div>
                            <p className="text-gray-700 leading-relaxed text-[16px] pt-0.5 whitespace-pre-line flex-1">
                                {step}
                            </p>
                        </div>
                    ))}
                     {recipe.steps.length === 0 && (
                        <p className="text-gray-400 text-sm italic pl-2">暂无步骤记录</p>
                    )}
                </div>
            </div>

            {/* Cooking Logs Section */}
            <div className="mb-12">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-[#1a472a] rounded-full"></span>
                    烹饪记录
                </h2>
                <div className="space-y-4">
                     {(!recipe.logs || recipe.logs.length === 0) ? (
                        <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400 text-sm">
                            还没有记录，点击右下角添加第一次烹饪吧！
                        </div>
                     ) : (
                         recipe.logs.map(log => {
                             const isProcessingThis = processingLogId === log.id;
                             return (
                                <div key={log.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex gap-4 relative overflow-hidden">
                                    {isProcessingThis && (
                                        <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
                                            <Loader2 className="animate-spin text-[#1a472a]" />
                                        </div>
                                    )}
                                    {log.image && (
                                        <div className="relative group shrink-0 w-28 h-28 rounded-xl overflow-hidden bg-gray-100 shadow-inner">
                                            <ImageWithSkeleton 
                                                src={getOptimizedImageUrl(log.image, 300)} 
                                                alt="Log" 
                                                className="w-full h-full object-cover" 
                                            />
                                            <button 
                                                onClick={() => handleSetCover(log.id, log.image)}
                                                disabled={isProcessingThis}
                                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold flex-col gap-1 disabled:pointer-events-none z-10"
                                            >
                                                <ImageIcon size={16} />
                                                设为封面
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex-1 flex flex-col justify-between py-1">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{new Date(log.date).toLocaleDateString()}</span>
                                                <button 
                                                    onClick={() => handleDeleteLog(log.id)} 
                                                    disabled={isProcessingThis}
                                                    className="text-gray-300 hover:text-red-400 p-1 disabled:opacity-50"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{log.note}</p>
                                        </div>
                                    </div>
                                </div>
                             );
                         })
                     )}
                </div>
            </div>
            
            {recipe.sourceLink && (
                 <a 
                    href={recipe.sourceLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-4 bg-gray-50 text-center text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-100 transition-colors border border-gray-100 mb-8"
                >
                    <ExternalLink size={16} />
                    查看原教程
                </a>
            )}
        </div>

      </div>

      {/* Floating Action Button for Cooking Log */}
      <div className="absolute right-6 z-30 bottom-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <button 
            onClick={() => setShowLogModal(true)}
            className="w-14 h-14 bg-[#1a472a] rounded-full flex items-center justify-center text-white shadow-xl shadow-green-900/30 hover:scale-105 active:scale-95 transition-all"
        >
            <Camera size={24} strokeWidth={2.5} />
        </button>
      </div>

      {/* Add Log Modal */}
      {showLogModal && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200">
              <div className="bg-white w-full sm:w-[90%] sm:max-w-sm sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-lg text-gray-800">记录一次烹饪</h3>
                      <button onClick={() => setShowLogModal(false)} disabled={isSaving} className="bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200">
                          <X size={20} />
                      </button>
                  </div>

                  {/* Image Uploader */}
                  <div className="mb-4">
                      <label className={`block w-full h-40 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 hover:border-[#1a472a]/30 transition-all overflow-hidden relative ${isSaving ? 'pointer-events-none opacity-50' : ''}`}>
                          {newLogImage ? (
                              <img src={newLogImage} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                              <>
                                  <Camera className="text-gray-300 mb-2" size={32} />
                                  <span className="text-xs text-gray-400">点击上传成品图</span>
                              </>
                          )}
                          <input type="file" className="hidden" accept="image/*" onChange={handleImageSelect} disabled={isSaving} />
                      </label>
                      {newLogImage && (
                          <div className="text-center mt-2">
                             <button onClick={() => setNewLogImage(null)} className="text-xs text-red-500">重新上传</button>
                          </div>
                      )}
                  </div>

                  {/* Note Input */}
                  <textarea 
                      value={newLogNote}
                      onChange={(e) => setNewLogNote(e.target.value)}
                      placeholder="味道如何？有什么需要改进的？"
                      disabled={isSaving}
                      className="w-full bg-gray-50 rounded-xl p-4 h-32 text-sm outline-none resize-none mb-6 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#1a472a]/10 transition-all disabled:opacity-50"
                  />

                  <button 
                      onClick={handleSaveLog}
                      disabled={isSaving}
                      className="w-full bg-[#1a472a] text-white py-4 rounded-xl font-bold text-base shadow-lg shadow-green-900/20 hover:bg-[#143620] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:bg-[#1a472a]/70 disabled:cursor-wait"
                  >
                      {isSaving ? <Loader2 className="animate-spin" /> : <Check size={20} />}
                      {isSaving ? '保存中...' : '完成记录'}
                  </button>
              </div>
          </div>
      )}
      
      {/* Image Cropper Modal */}
        {isCropping && tempImage && (
            <ImageCropper 
                imageSrc={tempImage}
                onCropComplete={handleCropComplete}
                onCancel={() => {
                    setIsCropping(false);
                    setTempImage(null);
                }}
                aspect={1}
            />
        )}
    </div>
  );
};
