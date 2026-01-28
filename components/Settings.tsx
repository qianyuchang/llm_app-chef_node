
import React, { useEffect, useState } from 'react';
import { ChevronLeft, Zap, BrainCircuit, Check, Loader2, History, Image as ImageIcon, Palette, Bot, Upload } from 'lucide-react';
import { useSwipe } from '../hooks/useSwipe';
import { Settings as SettingsType } from '../types';
import { api } from '../services/api';

interface SettingsProps {
  onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Swipe Handler
  const swipeHandlers = useSwipe(onBack);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await api.getSettings();
        setSettings(data);
      } catch (e) {
        console.error("Failed to load settings", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleAiModelChange = async (model: 'gemini-3-flash-preview' | 'gemini-3-pro-preview' | 'gemini-2.5-flash-preview-09-2025' | 'doubao-1-5-pro-32k-250115') => {
    if (isSaving || !settings) return;
    
    // Optimistic Update
    const oldModel = settings.aiModel;
    setSettings({ ...settings, aiModel: model });
    setIsSaving(true);

    try {
      await api.updateSettings({ aiModel: model });
    } catch (e) {
      setSettings({ ...settings, aiModel: oldModel });
      alert('设置保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageModelChange = async (model: 'doubao-seedream-4-5-251128' | 'doubao-seedream-4-0-250828') => {
    if (isSaving || !settings) return;
    
    // Optimistic Update
    const oldModel = settings.imageModel;
    setSettings({ ...settings, imageModel: model });
    setIsSaving(true);

    try {
      await api.updateSettings({ imageModel: model });
    } catch (e) {
      setSettings({ ...settings, imageModel: oldModel });
      alert('设置保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncImages = async () => {
      if (isSyncing) return;
      if (!confirm('这将把所有本地存储的图片上传到 Cloudflare R2 云存储。是否继续？')) return;

      setIsSyncing(true);
      try {
          const res = await api.syncImages();
          alert(`同步完成！\n成功上传: ${res.processed} 张\n失败: ${res.errors} 张`);
      } catch (e: any) {
          alert(`同步失败: ${e.message}`);
      } finally {
          setIsSyncing(false);
      }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#f2f4f6]">
        <Loader2 className="animate-spin text-[#1a472a]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f2f4f6]" {...swipeHandlers}>
      {/* Header */}
      <div className="px-5 py-4 bg-white sticky top-0 z-20 shadow-sm flex items-center gap-2">
        <button onClick={onBack} className="text-gray-600 hover:text-gray-900 transition-colors">
            <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-[#1a472a]">设置</h1>
      </div>

      <div className="p-5 space-y-6 overflow-y-auto pb-32">
        
        {/* Text Model Selection Group */}
        <div>
           <h2 className="text-xs font-bold text-gray-400 mb-2 px-2 uppercase tracking-wide">AI 思考模型</h2>
           <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              
              {/* Flash Model Option */}
              <button 
                onClick={() => handleAiModelChange('gemini-3-flash-preview')}
                className="w-full flex items-center p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors active:bg-gray-100 text-left"
              >
                  <div className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center mr-4 shrink-0">
                      <Zap size={20} fill="currentColor" />
                  </div>
                  <div className="flex-1">
                      <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-800 text-sm">标准模式 (Flash)</h3>
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">推荐</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">响应速度快，适合日常菜单生成与备菜。</p>
                  </div>
                  {settings?.aiModel === 'gemini-3-flash-preview' && (
                      <div className="text-[#1a472a]">
                          {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Check size={20} strokeWidth={3} />}
                      </div>
                  )}
              </button>

              {/* Pro Model Option */}
              <button 
                onClick={() => handleAiModelChange('gemini-3-pro-preview')}
                className="w-full flex items-center p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors active:bg-gray-100 text-left"
              >
                  <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mr-4 shrink-0">
                      <BrainCircuit size={20} />
                  </div>
                  <div className="flex-1">
                      <h3 className="font-bold text-gray-800 text-sm">增强模式 (Pro)</h3>
                      <p className="text-xs text-gray-400 mt-0.5">逻辑推理强，生成的菜单主题更有文化韵味。</p>
                  </div>
                  {settings?.aiModel === 'gemini-3-pro-preview' && (
                      <div className="text-[#1a472a]">
                          {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Check size={20} strokeWidth={3} />}
                      </div>
                  )}
              </button>

              {/* 2.5 Model Option */}
              <button 
                onClick={() => handleAiModelChange('gemini-2.5-flash-preview-09-2025')}
                className="w-full flex items-center p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors active:bg-gray-100 text-left"
              >
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mr-4 shrink-0">
                      <History size={20} />
                  </div>
                  <div className="flex-1">
                      <h3 className="font-bold text-gray-800 text-sm">Gemini 2.5 Flash</h3>
                      <p className="text-xs text-gray-400 mt-0.5">经典的 2.5 版本，速度与质量的平衡。</p>
                  </div>
                  {settings?.aiModel === 'gemini-2.5-flash-preview-09-2025' && (
                      <div className="text-[#1a472a]">
                          {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Check size={20} strokeWidth={3} />}
                      </div>
                  )}
              </button>

              {/* Doubao 1.5 Pro Option */}
              <button 
                onClick={() => handleAiModelChange('doubao-1-5-pro-32k-250115')}
                className="w-full flex items-center p-4 hover:bg-gray-50 transition-colors active:bg-gray-100 text-left"
              >
                  <div className="w-10 h-10 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center mr-4 shrink-0">
                      <Bot size={20} />
                  </div>
                  <div className="flex-1">
                      <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-800 text-sm">Doubao 1.5 Pro</h3>
                          <span className="text-[10px] bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded font-medium">New</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">字节跳动最新旗舰模型，中文理解能力卓越。</p>
                  </div>
                  {settings?.aiModel === 'doubao-1-5-pro-32k-250115' && (
                      <div className="text-[#1a472a]">
                          {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Check size={20} strokeWidth={3} />}
                      </div>
                  )}
              </button>
           </div>
        </div>

        {/* Image Model Selection Group */}
        <div>
           <h2 className="text-xs font-bold text-gray-400 mb-2 px-2 uppercase tracking-wide">AI 绘图模型</h2>
           <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              
              {/* Doubao Seedream 4.5 Option */}
              <button 
                onClick={() => handleImageModelChange('doubao-seedream-4-5-251128')}
                className="w-full flex items-center p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors active:bg-gray-100 text-left"
              >
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mr-4 shrink-0">
                      <Palette size={20} />
                  </div>
                  <div className="flex-1">
                      <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-800 text-sm">Doubao Seedream 4.5</h3>
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">旗舰</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">极致画质，光影真实。需要 2K 分辨率。</p>
                  </div>
                  {(settings?.imageModel === 'doubao-seedream-4-5-251128' || !settings?.imageModel) && (
                      <div className="text-[#1a472a]">
                          {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Check size={20} strokeWidth={3} />}
                      </div>
                  )}
              </button>

              {/* Doubao Seedream 4.0 Option */}
              <button 
                onClick={() => handleImageModelChange('doubao-seedream-4-0-250828')}
                className="w-full flex items-center p-4 hover:bg-gray-50 transition-colors active:bg-gray-100 text-left"
              >
                  <div className="w-10 h-10 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center mr-4 shrink-0">
                      <ImageIcon size={20} />
                  </div>
                  <div className="flex-1">
                      <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-800 text-sm">Doubao Seedream 4.0</h3>
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">省流</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">均衡模式，支持 1K 低分辨率生成，节省流量。</p>
                  </div>
                  {settings?.imageModel === 'doubao-seedream-4-0-250828' && (
                      <div className="text-[#1a472a]">
                          {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Check size={20} strokeWidth={3} />}
                      </div>
                  )}
              </button>
           </div>
        </div>

        {/* Storage Management */}
        <div>
           <h2 className="text-xs font-bold text-gray-400 mb-2 px-2 uppercase tracking-wide">存储管理</h2>
           <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <button 
                onClick={handleSyncImages}
                disabled={isSyncing}
                className="w-full flex items-center p-4 hover:bg-gray-50 transition-colors active:bg-gray-100 text-left disabled:opacity-50"
              >
                  <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mr-4 shrink-0">
                      {isSyncing ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                  </div>
                  <div className="flex-1">
                      <h3 className="font-bold text-gray-800 text-sm">一键同步图片到云端</h3>
                      <p className="text-xs text-gray-400 mt-0.5">将本地 Base64 图片上传到 Cloudflare R2，减少数据库体积。</p>
                  </div>
              </button>
           </div>
        </div>

        {/* App Info Group */}
        <div>
            <h2 className="text-xs font-bold text-gray-400 mb-2 px-2 uppercase tracking-wide">关于应用</h2>
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm p-4">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-800">版本</span>
                    <span className="text-gray-500">v1.2.1</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-3 pt-3 border-t border-gray-50">
                    <span className="text-gray-800">开发者</span>
                    <span className="text-gray-500">ChefNote Team</span>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};
