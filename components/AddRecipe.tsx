import React, { useState, useEffect } from 'react';
import { ChevronLeft, Camera, Link as LinkIcon, Plus, Trash2, ChevronRight, Check, ChefHat, Sparkles, Loader2 } from 'lucide-react';
import { Recipe } from '../types';
import { PROFICIENCY_TEXT } from '../constants';
import { ImageCropper } from './ImageCropper';
import { ToastType } from './Toast';
import { Button } from './Button';
import { useSwipe } from '../hooks/useSwipe';
import { api } from '../services/api';

interface AddRecipeProps {
  categories: string[];
  onBack: () => void;
  onSave: (recipe: Omit<Recipe, 'id' | 'createdAt'> | Recipe) => Promise<void>;
  initialData?: Recipe | null;
  onShowToast: (message: string, type: ToastType) => void;
}

export const AddRecipe: React.FC<AddRecipeProps> = ({ categories, onBack, onSave, initialData, onShowToast }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(categories[0] || '其他');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [proficiency, setProficiency] = useState(1);
  const [sourceLink, setSourceLink] = useState('');
  const [ingredients, setIngredients] = useState<{name: string, amount: string}[]>([{name: '', amount: ''}]);
  const [steps, setSteps] = useState<string[]>(['']);
  
  // Cropper State
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  
  // Loading State
  const [isSaving, setIsSaving] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Swipe Handler
  const swipeHandlers = useSwipe(onBack);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setCategory(initialData.category);
      setCoverImage(initialData.coverImage);
      setProficiency(initialData.proficiency);
      setSourceLink(initialData.sourceLink || '');
      setIngredients(initialData.ingredients.length ? initialData.ingredients : [{name: '', amount: ''}]);
      setSteps(initialData.steps.length ? initialData.steps : ['']);
    }
  }, [initialData]);

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
    // Reset value so same file can be selected again
    e.target.value = '';
  };

  const handleCropComplete = (croppedImage: string) => {
    setCoverImage(croppedImage);
    setIsCropping(false);
    setTempImage(null);
  };

  const handleOptimizeImage = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!coverImage) return;

    setIsOptimizing(true);
    try {
        const optimized = await api.optimizeImage(coverImage);
        setCoverImage(optimized);
        onShowToast("照片已优化为美食大片", 'success');
    } catch (err) {
        console.error(err);
        onShowToast("优化失败，请稍后重试", 'error');
    } finally {
        setIsOptimizing(false);
    }
  };

  const addIngredient = () => setIngredients([...ingredients, {name: '', amount: ''}]);
  const updateIngredient = (index: number, field: 'name' | 'amount', value: string) => {
    const newIngredients = [...ingredients];
    newIngredients[index][field] = value;
    setIngredients(newIngredients);
  };
  
  const addStep = () => setSteps([...steps, '']);
  const updateStep = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
  };

  const handleSave = async () => {
    // 1. Validate Title
    if (!title.trim()) {
        onShowToast("请输入菜名", 'error');
        return;
    }
    
    // 2. Validate Ingredients
    const validIngredients = ingredients.filter(i => i.name.trim());
    if (validIngredients.length === 0) {
        onShowToast("请至少填写一项食材", 'error');
        return;
    }

    // 3. Validate Steps
    const validSteps = steps.filter(s => s.trim());
    if (validSteps.length === 0) {
        onShowToast("请至少填写一个步骤", 'error');
        return;
    }

    setIsSaving(true);

    const recipeData = {
      title: title.trim(),
      category,
      coverImage: coverImage || 'https://picsum.photos/400/400',
      proficiency,
      sourceLink: sourceLink.trim(),
      ingredients: validIngredients,
      steps: validSteps
    };

    try {
      if (initialData) {
        await onSave({ 
          ...recipeData, 
          id: initialData.id, 
          createdAt: initialData.createdAt,
          logs: initialData.logs 
        });
      } else {
        await onSave({
          ...recipeData,
          logs: []
        });
      }
    } catch (error) {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f2f4f6] pb-10" {...swipeHandlers}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 sticky top-0 bg-white z-20 shadow-sm">
        <button onClick={onBack} disabled={isSaving} className="flex items-center text-gray-600 text-sm hover:text-gray-900 transition-colors disabled:opacity-50">
          <ChevronLeft size={20} />
          返回
        </button>
        <h1 className="text-lg font-bold text-gray-800">{initialData ? '编辑菜谱' : '记录新菜'}</h1>
        <div className="w-16 flex justify-end">
            <Button 
              onClick={handleSave} 
              variant="primary"
              isLoading={isSaving}
              className="text-xs px-3 py-1.5 min-w-[3.5rem]"
            >
              保存
            </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-6 space-y-6">
        {/* Image Upload */}
        <div className="flex flex-col items-center justify-center mb-4">
          <label className="relative w-32 h-32 rounded-[2rem] bg-white border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:border-[#1a472a]/50 transition-colors group shadow-sm">
             {coverImage ? (
                 <>
                     <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                     {/* AI Optimization Button Overlay */}
                     <button
                        onClick={handleOptimizeImage}
                        disabled={isOptimizing}
                        className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm text-[#1a472a] p-1.5 rounded-full shadow-sm flex items-center gap-1 hover:bg-white transition-all active:scale-95 disabled:opacity-70 z-10"
                        title="AI 优化"
                     >
                         {isOptimizing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                         <span className="text-[10px] font-bold mr-0.5">AI优化</span>
                     </button>
                 </>
             ) : (
                 <>
                    <Camera className="text-gray-400 mb-1 group-hover:text-[#1a472a] transition-colors" size={24} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageSelect} />
                 </>
             )}
          </label>
           {/* If image exists, allow changing it */}
           {coverImage && (
             <label className="text-xs text-[#1a472a] mt-3 font-medium cursor-pointer">
                更换封面
                <input type="file" className="hidden" accept="image/*" onChange={handleImageSelect} />
             </label>
           )}
           {!coverImage && <span className="text-xs text-[#1a472a] mt-3 font-medium">上传封面</span>}
        </div>

        {/* Basic Info */}
        <div className="space-y-1">
          <p className="text-xs text-gray-500 pl-2">基本信息</p>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-50">
                <span className="font-medium text-gray-800">名称</span>
                <input 
                    type="text" 
                    placeholder="请输入菜名" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-right outline-none text-gray-900 placeholder-gray-300 w-2/3 bg-transparent font-medium"
                />
            </div>
            <div className="flex items-center justify-between p-4 relative">
                <span className="font-medium text-gray-800">分类</span>
                <div className="flex items-center text-gray-500">
                    <select 
                        value={category} 
                        onChange={(e) => setCategory(e.target.value)}
                        className="appearance-none bg-transparent outline-none text-right pr-6 z-10 absolute right-0 top-0 bottom-0 w-full opacity-0 cursor-pointer"
                    >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <span className="mr-1 text-gray-600">{category}</span>
                    <ChevronRight size={16} />
                </div>
            </div>
          </div>
        </div>

        {/* Cooking Details Card */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-6">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center text-[#1a472a]">
                    <ChefHat size={14} />
                </div>
                <h3 className="font-bold text-gray-800">烹饪细节</h3>
            </div>

            {/* Source */}
            <div>
                <p className="text-xs text-gray-400 mb-2">菜谱来源</p>
                <div className="bg-gray-50 rounded-xl flex items-center px-3 py-3 border border-gray-100 focus-within:border-[#1a472a]/20 transition-colors">
                    <LinkIcon size={16} className="text-gray-400 mr-2" />
                    <input 
                        type="text" 
                        placeholder="粘贴小红书/抖音/B站链接" 
                        value={sourceLink}
                        onChange={(e) => setSourceLink(e.target.value)}
                        className="bg-transparent text-sm w-full outline-none text-gray-700 placeholder-gray-300"
                    />
                </div>
            </div>

            {/* Proficiency */}
            <div>
                <p className="text-xs text-gray-400 mb-2">熟练度</p>
                <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between border border-gray-100">
                    <div>
                        <p className="font-medium text-gray-800 text-sm">当前掌握程度</p>
                        <p className="text-xs text-[#1a472a] mt-0.5 font-medium">{PROFICIENCY_TEXT[proficiency]}</p>
                    </div>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(level => (
                            <button 
                                key={level} 
                                onClick={() => setProficiency(level)}
                                className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center text-[10px] font-bold ${
                                    proficiency >= level 
                                        ? 'bg-[#1a472a] border-[#1a472a] text-white' 
                                        : 'bg-white border-gray-200 text-transparent'
                                }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Ingredients */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-400">配料清单</p>
                    <button onClick={addIngredient} className="text-xs font-bold text-[#1a472a] flex items-center hover:bg-green-50 px-2 py-1 rounded transition-colors">
                        <Plus size={12} className="mr-0.5"/> 添加
                    </button>
                </div>
                <div className="space-y-2">
                    {ingredients.map((ing, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                            <div className="flex-1 flex items-center bg-gray-50 rounded-lg px-3 py-2 border border-transparent focus-within:bg-white focus-within:border-[#1a472a]/30 transition-all shadow-sm">
                                <span className="text-[#1a472a] mr-2 text-xs font-bold">•</span>
                                <input 
                                    placeholder="食材名称"
                                    value={ing.name}
                                    onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                                    className="bg-transparent w-full text-sm outline-none text-gray-800 placeholder-gray-400"
                                />
                                <div className="h-4 w-[1px] bg-gray-200 mx-2"></div>
                                <input 
                                    placeholder="用量"
                                    value={ing.amount}
                                    onChange={(e) => updateIngredient(idx, 'amount', e.target.value)}
                                    className="bg-transparent w-20 text-sm outline-none text-gray-800 text-right placeholder-gray-400"
                                />
                            </div>
                            {ingredients.length > 1 && (
                                <button onClick={() => {
                                    const newI = [...ingredients];
                                    newI.splice(idx, 1);
                                    setIngredients(newI);
                                }} className="text-gray-300 hover:text-red-400 p-1">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Steps */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-400">烹饪步骤</p>
                    <button onClick={addStep} className="text-xs font-bold text-[#1a472a] flex items-center hover:bg-green-50 px-2 py-1 rounded transition-colors">
                        <Plus size={12} className="mr-0.5"/> 添加
                    </button>
                </div>
                <div className="space-y-3">
                    {steps.map((step, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                            <div className="flex-1 bg-gray-50 rounded-lg p-3 min-h-[80px] border border-transparent focus-within:bg-white focus-within:border-[#1a472a]/30 transition-all shadow-sm relative">
                                <span className="absolute top-3 left-3 font-bold text-[#1a472a] text-sm bg-green-100 w-5 h-5 rounded-full flex items-center justify-center">{idx + 1}</span>
                                <textarea 
                                    placeholder="输入步骤，支持 **加粗**"
                                    value={step}
                                    onChange={(e) => updateStep(idx, e.target.value)}
                                    className="bg-transparent w-full text-sm outline-none text-gray-700 ml-7 resize-none h-full leading-relaxed placeholder-gray-400"
                                    rows={3}
                                />
                            </div>
                            <button className="mt-3 text-gray-300 hover:text-red-400 p-1" onClick={() => {
                                const newS = [...steps];
                                newS.splice(idx, 1);
                                setSteps(newS);
                            }}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Bottom Action Button for Long Forms */}
        <div className="px-2 mt-6 mb-8">
            <Button 
                onClick={handleSave} 
                variant="primary"
                isLoading={isSaving}
                fullWidth
                className="py-4 text-base shadow-xl shadow-green-900/10"
            >
                保存菜谱
            </Button>
        </div>
        
        {/* Image Cropper Modal */}
        {isCropping && tempImage && (
            <ImageCropper 
                imageSrc={tempImage}
                onCropComplete={handleCropComplete}
                onCancel={() => {
                    setIsCropping(false);
                    setTempImage(null);
                }}
                aspect={3/4}
            />
        )}
      </div>
    </div>
  );
};