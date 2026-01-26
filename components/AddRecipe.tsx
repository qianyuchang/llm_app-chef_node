import React, { useState, useEffect } from 'react';
import { ChevronLeft, Camera, Link as LinkIcon, Plus, Trash2, ChevronRight, Check, ChefHat, Sparkles, Loader2, ClipboardPaste, X } from 'lucide-react';
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
  
  // Smart Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  
  // Loading State
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

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
    e.target.value = '';
  };

  const handleCropComplete = (croppedImage: string) => {
    setCoverImage(croppedImage);
    setIsCropping(false);
    setTempImage(null);
  };

  const handleGenerateCover = async () => {
      if (!title.trim()) {
          onShowToast("请先输入菜名", 'error');
          return;
      }
      setIsGeneratingImage(true);
      try {
          const prompt = `Professional food photography of ${title}, ${category} dish, high resolution, 4k, delicious, appetizing, cinematic lighting, photorealistic.`;
          const image = await api.generateImage(prompt);
          setCoverImage(image);
          onShowToast("封面生成成功", 'success');
      } catch (error: any) {
          console.error(error);
          onShowToast(`生成失败: ${error.message}`, 'error');
      } finally {
          setIsGeneratingImage(false);
      }
  };

  const handleSourceLinkChange = (value: string) => {
      // URL Extraction Logic
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const match = value.match(urlRegex);

      if (match) {
          const extractedUrl = match[0];
          setSourceLink(extractedUrl);

          // If title is empty, try to extract it from the surrounding text
          if (!title.trim()) {
              // Get text before the URL, remove common social media clutter
              let extractedTitle = value.split(extractedUrl)[0].trim();
              if (extractedTitle) {
                  // Clean up common "copy-paste" noise
                  extractedTitle = extractedTitle
                    .replace(/【.+】/g, '')
                    .replace(/复制后打开.+/g, '')
                    .trim();
                  if (extractedTitle) {
                      setTitle(extractedTitle);
                      onShowToast("已自动解析菜名", 'success');
                  }
              }
          }
      } else {
          setSourceLink(value);
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

  const handleSmartImport = () => {
      if (!importText.trim()) {
          setShowImportModal(false);
          return;
      }

      const lines = importText.split('\n');
      const newIngredients: {name: string, amount: string}[] = [];

      lines.forEach(line => {
          let cleanLine = line.trim();
          cleanLine = cleanLine.replace(/^[\d]+\.|^[-•*]\s*/, '').trim();
          if (!cleanLine) return;
          const parts = cleanLine.split(/[\s,，]+/);
          if (parts.length === 1) {
              newIngredients.push({ name: parts[0], amount: '' });
          } else {
              const firstPartIsAmount = /^[\d\.\/]+/.test(parts[0]);
              if (firstPartIsAmount) {
                  newIngredients.push({ amount: parts[0], name: parts.slice(1).join(' ') });
              } else {
                  const lastPart = parts[parts.length - 1];
                  const namePart = parts.slice(0, parts.length - 1).join(' ');
                  newIngredients.push({ name: namePart, amount: lastPart });
              }
          }
      });

      if (newIngredients.length > 0) {
          if (ingredients.length === 1 && !ingredients[0].name && !ingredients[0].amount) {
              setIngredients(newIngredients);
          } else {
              setIngredients([...ingredients, ...newIngredients]);
          }
          onShowToast(`已识别 ${newIngredients.length} 项食材`, 'success');
      }
      setImportText('');
      setShowImportModal(false);
  };

  const handleSave = async () => {
    if (!title.trim()) {
        onShowToast("请输入菜名", 'error');
        return;
    }
    const validIngredients = ingredients.filter(i => i.name.trim());
    const validSteps = steps.filter(s => s.trim());
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
        await onSave({ ...recipeData, id: initialData.id, createdAt: initialData.createdAt, logs: initialData.logs });
      } else {
        await onSave({ ...recipeData, logs: [] });
      }
    } catch (error) {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f2f4f6] pb-10" {...swipeHandlers}>
      <div className="flex items-center justify-between px-4 py-4 sticky top-0 bg-white z-20 shadow-sm">
        <button onClick={onBack} disabled={isSaving} className="flex items-center text-gray-600 text-sm hover:text-gray-900 disabled:opacity-50">
          <ChevronLeft size={20} />
          返回
        </button>
        <h1 className="text-lg font-bold text-gray-800">{initialData ? '编辑菜谱' : '记录新菜'}</h1>
        <div className="w-16 flex justify-end">
            <Button onClick={handleSave} variant="primary" isLoading={isSaving} className="text-xs px-3 py-1.5 min-w-[3.5rem]">保存</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-6 space-y-6">
        <div className="flex flex-col items-center justify-center mb-4 relative">
          <label className={`relative w-32 h-32 rounded-[2rem] bg-white border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:border-[#1a472a]/50 transition-colors group shadow-sm ${isGeneratingImage ? 'opacity-50 pointer-events-none' : ''}`}>
             {coverImage ? <img src={coverImage} alt="Cover" className="w-full h-full object-cover" /> : <><Camera className="text-gray-400 mb-1 group-hover:text-[#1a472a]" size={24} /><input type="file" className="hidden" accept="image/*" onChange={handleImageSelect} /></>}
             {isGeneratingImage && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-[#1a472a]" /></div>}
          </label>
           <div className="flex gap-4 mt-3">
               <label className="text-xs text-gray-500 font-medium cursor-pointer flex items-center gap-1 hover:text-gray-800">
                  <Camera size={14} />{coverImage ? '更换照片' : '上传照片'}<input type="file" className="hidden" accept="image/*" onChange={handleImageSelect} />
               </label>
               <div className="w-[1px] h-4 bg-gray-300"></div>
               <button onClick={handleGenerateCover} disabled={isGeneratingImage || !title} className="text-xs text-[#1a472a] font-bold flex items-center gap-1 hover:text-green-800 disabled:opacity-50"><Sparkles size={14} />AI 生成封面</button>
           </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-gray-500 pl-2">基本信息</p>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-50">
                <span className="font-medium text-gray-800">名称</span>
                <input type="text" placeholder="请输入菜名" value={title} onChange={(e) => setTitle(e.target.value)} className="text-right outline-none text-gray-900 placeholder-gray-300 w-2/3 bg-transparent font-medium" />
            </div>
            <div className="flex items-center justify-between p-4 relative">
                <span className="font-medium text-gray-800">分类</span>
                <div className="flex items-center text-gray-500">
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="appearance-none bg-transparent outline-none text-right pr-6 z-10 absolute right-0 top-0 bottom-0 w-full opacity-0 cursor-pointer">
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <span className="mr-1 text-gray-600">{category}</span>
                    <ChevronRight size={16} />
                </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-6">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center text-[#1a472a]"><ChefHat size={14} /></div>
                <h3 className="font-bold text-gray-800">烹饪细节</h3>
            </div>
            <div>
                <p className="text-xs text-gray-400 mb-2">菜谱来源</p>
                <div className="bg-gray-50 rounded-xl flex items-center px-3 py-3 border border-gray-100 focus-within:border-[#1a472a]/20 transition-colors">
                    <LinkIcon size={16} className="text-gray-400 mr-2" />
                    <input 
                        type="text" 
                        placeholder="粘贴链接或分享文案 (自动解析)" 
                        value={sourceLink}
                        onChange={(e) => handleSourceLinkChange(e.target.value)}
                        className="bg-transparent text-sm w-full outline-none text-gray-700 placeholder-gray-300"
                    />
                </div>
            </div>
            <div>
                <p className="text-xs text-gray-400 mb-2">熟练度</p>
                <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between border border-gray-100">
                    <div>
                        <p className="font-medium text-gray-800 text-sm">当前掌握程度</p>
                        <p className="text-xs text-[#1a472a] mt-0.5 font-medium">{PROFICIENCY_TEXT[proficiency]}</p>
                    </div>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(level => (
                            <button key={level} onClick={() => setProficiency(level)} className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center text-[10px] font-bold ${proficiency >= level ? 'bg-[#1a472a] border-[#1a472a] text-white' : 'bg-white border-gray-200 text-transparent'}`}>{level}</button>
                        ))}
                    </div>
                </div>
            </div>
            <div>
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-400">配料清单</p>
                    <div className="flex gap-2">
                        <button onClick={() => setShowImportModal(true)} className="text-xs font-bold text-gray-600 flex items-center bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg"><ClipboardPaste size={12} className="mr-1"/> 批量/粘贴</button>
                        <button onClick={addIngredient} className="text-xs font-bold text-[#1a472a] flex items-center bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg border border-green-100"><Plus size={12} className="mr-0.5"/> 添加一行</button>
                    </div>
                </div>
                <div className="space-y-2">
                    {ingredients.map((ing, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                            <div className="flex-1 flex items-center bg-gray-50 rounded-lg px-3 py-2 border border-transparent focus-within:bg-white focus-within:border-[#1a472a]/30 transition-all shadow-sm">
                                <span className="text-[#1a472a] mr-2 text-xs font-bold">•</span>
                                <input placeholder="食材名称" value={ing.name} onChange={(e) => updateIngredient(idx, 'name', e.target.value)} className="bg-transparent w-full text-sm outline-none text-gray-800 placeholder-gray-400" />
                                <div className="h-4 w-[1px] bg-gray-200 mx-2"></div>
                                <input placeholder="用量" value={ing.amount} onChange={(e) => updateIngredient(idx, 'amount', e.target.value)} className="bg-transparent w-20 text-sm outline-none text-gray-800 text-right placeholder-gray-400" />
                            </div>
                            {ingredients.length > 1 && <button onClick={() => { const newI = [...ingredients]; newI.splice(idx, 1); setIngredients(newI); }} className="text-gray-300 hover:text-red-400 p-2 rounded-lg"><Trash2 size={16} /></button>}
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-400">烹饪步骤</p>
                    <button onClick={addStep} className="text-xs font-bold text-[#1a472a] flex items-center hover:bg-green-50 px-2 py-1 rounded"><Plus size={12} className="mr-0.5"/> 添加</button>
                </div>
                <div className="space-y-3">
                    {steps.map((step, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                            <div className="flex-1 bg-gray-50 rounded-lg p-3 min-h-[80px] border border-transparent focus-within:bg-white focus-within:border-[#1a472a]/30 transition-all shadow-sm relative">
                                <span className="absolute top-3 left-3 font-bold text-[#1a472a] text-sm bg-green-100 w-5 h-5 rounded-full flex items-center justify-center">{idx + 1}</span>
                                <textarea placeholder="输入步骤，支持 **加粗**" value={step} onChange={(e) => updateStep(idx, e.target.value)} className="bg-transparent w-full text-sm outline-none text-gray-700 ml-7 resize-none h-full leading-relaxed placeholder-gray-400" rows={3} />
                            </div>
                            <button className="mt-3 text-gray-300 hover:text-red-400 p-2 rounded-lg" onClick={() => { const newS = [...steps]; newS.splice(idx, 1); setSteps(newS); }}><Trash2 size={16} /></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <div className="px-2 mt-6 mb-8">
            <Button onClick={handleSave} variant="primary" isLoading={isSaving} fullWidth className="py-4 text-base shadow-xl shadow-green-900/10">保存菜谱</Button>
        </div>
        
        {showImportModal && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-[#1a472a]"><ClipboardPaste size={20} /><h3 className="font-bold text-lg">批量录入食材</h3></div>
                        <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
                    </div>
                    <p className="text-xs text-gray-500">直接粘贴完整的配料表，系统会自动识别名称和用量。<br/>格式示例：<span className="font-mono bg-gray-100 px-1 rounded">鸡蛋 2个</span></p>
                    <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={`鸡蛋 2个\n牛奶 200ml`} className="w-full h-40 bg-gray-50 rounded-xl p-4 text-sm outline-none resize-none text-gray-900 placeholder:text-gray-300 focus:bg-white border border-transparent focus:border-[#1a472a]/20" autoFocus />
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setShowImportModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-gray-600 text-sm">取消</button>
                        <button onClick={handleSmartImport} disabled={!importText.trim()} className="flex-1 py-3 bg-[#1a472a] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"><Sparkles size={16} />智能识别</button>
                    </div>
                </div>
            </div>
        )}

        {isCropping && tempImage && <ImageCropper imageSrc={tempImage} onCropComplete={handleCropComplete} onCancel={() => { setIsCropping(false); setTempImage(null); }} aspect={3/4} />}
      </div>
    </div>
  );
};
