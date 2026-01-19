import React, { useState } from 'react';
import { ChevronLeft, SquarePen, ExternalLink, Youtube, Camera, X, Trash2, Image as ImageIcon, Check } from 'lucide-react';
import { Recipe, CookingLog } from '../types';
import { PROFICIENCY_TEXT } from '../constants';
import { ImageCropper } from './ImageCropper';
import { ToastType } from './Toast';

interface RecipeDetailProps {
  recipe: Recipe;
  onBack: () => void;
  onEdit: (recipe: Recipe) => void;
  onUpdate: (recipe: Recipe) => void;
  onShowToast: (message: string, type: ToastType) => void;
}

const getSourceInfo = (url: string) => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('xiaohongshu') || lowerUrl.includes('xhslink')) {
    return { name: '小红书', color: 'text-red-500', bg: 'bg-red-50', icon: <span className="font-bold text-xs">小红书</span> };
  }
  if (lowerUrl.includes('bilibili')) {
    return { name: '哔哩哔哩', color: 'text-pink-400', bg: 'bg-pink-50', icon: <span className="font-bold text-xs">B站</span> };
  }
  if (lowerUrl.includes('douyin')) {
    return { name: '抖音', color: 'text-black', bg: 'bg-gray-100', icon: <span className="font-bold text-xs">抖音</span> };
  }
  if (lowerUrl.includes('youtube')) {
    return { name: 'YouTube', color: 'text-red-600', bg: 'bg-red-50', icon: <Youtube size={16} /> };
  }
  return { name: '网页链接', color: 'text-blue-500', bg: 'bg-blue-50', icon: <ExternalLink size={16} /> };
};

export const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipe, onBack, onEdit, onUpdate, onShowToast }) => {
  const sourceInfo = recipe.sourceLink ? getSourceInfo(recipe.sourceLink) : null;
  const [showLogModal, setShowLogModal] = useState(false);
  const [newLogImage, setNewLogImage] = useState<string | null>(null);
  const [newLogNote, setNewLogNote] = useState('');
  
  // Cropper State
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);

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

  const handleSaveLog = () => {
    if (!newLogImage && !newLogNote.trim()) {
        onShowToast("请上传成品图或填写心得", 'error');
        return;
    }

    const newLog: CookingLog = {
      id: Date.now().toString(),
      date: Date.now(),
      image: newLogImage || '',
      note: newLogNote
    };

    const updatedRecipe = {
      ...recipe,
      logs: [newLog, ...(recipe.logs || [])] // Prepend new log
    };

    onUpdate(updatedRecipe);
    setShowLogModal(false);
    setNewLogImage(null);
    setNewLogNote('');
  };

  const handleDeleteLog = (logId: string) => {
    if (confirm('确定要删除这条记录吗？')) {
      const updatedLogs = recipe.logs.filter(l => l.id !== logId);
      onUpdate({ ...recipe, logs: updatedLogs });
    }
  };

  const handleSetCover = (imgUrl: string) => {
      onUpdate({...recipe, coverImage: imgUrl});
  };

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      {/* Sticky Header */}
      <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-start pointer-events-none">
        <button 
          onClick={onBack} 
          className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-gray-800 shadow-sm pointer-events-auto hover:bg-white transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <button 
            onClick={() => onEdit(recipe)}
            className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-gray-800 shadow-sm pointer-events-auto hover:bg-white transition-colors"
        >
            <SquarePen size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Cover Image */}
        <div className="relative h-96 w-full group">
            <img 
                src={recipe.coverImage} 
                alt={recipe.title} 
                className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent"></div>
        </div>

        <div className="px-6 -mt-10 relative z-10">
            {/* Title & Stats */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 rounded-full bg-[#f0fdf4] text-[#1a472a] text-xs font-bold tracking-wide shadow-sm border border-[#1a472a]/10">
                        {recipe.category}
                    </span>
                    {sourceInfo && recipe.sourceLink && (
                        <a 
                            href={recipe.sourceLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${sourceInfo.bg} ${sourceInfo.color} text-xs font-medium hover:opacity-80 transition-opacity`}
                        >
                            {sourceInfo.icon}
                            <span>来源</span>
                        </a>
                    )}
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2 leading-tight">{recipe.title}</h1>
                <div className="flex items-center gap-4 text-gray-500 text-sm mt-3">
                    <div className="flex items-center gap-1.5">
                        <div className="flex gap-0.5">
                             {[...Array(5)].map((_, i) => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < recipe.proficiency ? 'bg-[#1a472a]' : 'bg-gray-200'}`} />
                            ))}
                        </div>
                        <span className="text-xs font-medium text-[#1a472a]">{PROFICIENCY_TEXT[recipe.proficiency]}</span>
                    </div>
                </div>
            </div>

            {/* Ingredients */}
            <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-1 h-5 bg-[#1a472a] rounded-full"></span>
                    所需食材
                </h2>
                <div className="bg-[#f7f8fa] rounded-2xl p-5 space-y-3 shadow-sm border border-gray-100">
                    {recipe.ingredients.map((ing, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-200/50 last:border-0 pb-2 last:pb-0">
                            <span className="text-gray-700 font-medium">{ing.name}</span>
                            <span className="text-gray-500 font-mono">{ing.amount}</span>
                        </div>
                    ))}
                    {recipe.ingredients.length === 0 && (
                        <p className="text-gray-400 text-sm italic">暂无食材记录</p>
                    )}
                </div>
            </div>

            {/* Steps */}
            <div className="mb-12">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-1 h-5 bg-[#1a472a] rounded-full"></span>
                    烹饪步骤
                </h2>
                <div className="space-y-6">
                    {recipe.steps.map((step, idx) => (
                        <div key={idx} className="flex gap-4">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1a472a] text-white flex items-center justify-center text-xs font-bold mt-0.5 shadow-sm shadow-green-900/20">
                                {idx + 1}
                            </div>
                            <p className="text-gray-700 leading-relaxed text-[15px] pt-0.5 whitespace-pre-line">
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
                    <span className="w-1 h-5 bg-[#1a472a] rounded-full"></span>
                    烹饪记录
                </h2>
                <div className="space-y-4">
                     {(!recipe.logs || recipe.logs.length === 0) ? (
                        <div className="text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400 text-sm">
                            还没有记录，点击右下角添加第一次烹饪吧！
                        </div>
                     ) : (
                         recipe.logs.map(log => (
                             <div key={log.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex gap-3">
                                 {log.image && (
                                     <div className="relative group shrink-0">
                                        <img src={log.image} alt="Log" className="w-24 h-24 rounded-xl object-cover bg-gray-100" />
                                        <button 
                                            onClick={() => handleSetCover(log.image)}
                                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl text-white text-[10px] font-bold flex-col gap-1"
                                        >
                                            <ImageIcon size={16} />
                                            设为封面
                                        </button>
                                     </div>
                                 )}
                                 <div className="flex-1 flex flex-col">
                                     <div className="flex justify-between items-start mb-1">
                                         <span className="text-xs text-gray-400 font-medium">{new Date(log.date).toLocaleDateString()}</span>
                                         <button onClick={() => handleDeleteLog(log.id)} className="text-gray-300 hover:text-red-400 p-1">
                                             <Trash2 size={14} />
                                         </button>
                                     </div>
                                     <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap flex-1">{log.note}</p>
                                 </div>
                             </div>
                         ))
                     )}
                </div>
            </div>
            
            {recipe.sourceLink && (
                 <a 
                    href={recipe.sourceLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-4 bg-gray-50 text-center text-gray-500 text-sm rounded-xl hover:bg-gray-100 transition-colors border border-gray-100 mb-8"
                >
                    <ExternalLink size={16} />
                    查看原教程
                </a>
            )}
        </div>

      </div>

      {/* Floating Action Button for Cooking Log */}
      <div className="absolute bottom-6 right-6 z-30">
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
                      <button onClick={() => setShowLogModal(false)} className="bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200">
                          <X size={20} />
                      </button>
                  </div>

                  {/* Image Uploader */}
                  <div className="mb-4">
                      <label className="block w-full h-40 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 hover:border-[#1a472a]/30 transition-all overflow-hidden relative">
                          {newLogImage ? (
                              <>
                                <img src={newLogImage} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-white font-medium">更换图片</div>
                              </>
                          ) : (
                              <>
                                  <Camera className="text-gray-300 mb-2" size={32} />
                                  <span className="text-xs text-gray-400">点击上传成品图</span>
                              </>
                          )}
                          <input type="file" className="hidden" accept="image/*" onChange={handleImageSelect} />
                      </label>
                  </div>

                  {/* Note Input */}
                  <textarea 
                      value={newLogNote}
                      onChange={(e) => setNewLogNote(e.target.value)}
                      placeholder="味道如何？有什么需要改进的？"
                      className="w-full bg-gray-50 rounded-xl p-4 h-32 text-sm outline-none resize-none mb-6 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#1a472a]/10 transition-all"
                  />

                  <button 
                      onClick={handleSaveLog}
                      className="w-full bg-[#1a472a] text-white py-4 rounded-xl font-bold text-base shadow-lg shadow-green-900/20 hover:bg-[#143620] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                      <Check size={20} />
                      完成记录
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
                aspect={1} // 1:1 for logs usually looks good, or could be 3/4
            />
        )}
    </div>
  );
};