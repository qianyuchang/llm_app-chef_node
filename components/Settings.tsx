import React, { useEffect, useState } from 'react';
import { ChevronLeft, Zap, BrainCircuit, Check, Loader2, History } from 'lucide-react';
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

  const handleModelChange = async (model: 'gemini-3-flash-preview' | 'gemini-3-pro-preview' | 'gemini-2.5-flash-preview-09-2025') => {
    if (isSaving || !settings) return;
    
    // Optimistic Update
    const oldModel = settings.aiModel;
    setSettings({ ...settings, aiModel: model });
    setIsSaving(true);

    try {
      await api.updateSettings({ aiModel: model });
    } catch (e) {
      // Revert on failure
      setSettings({ ...settings, aiModel: oldModel });
      alert('设置保存失败');
    } finally {
      setIsSaving(false);
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
        
        {/* Model Selection Group */}
        <div>
           <h2 className="text-xs font-bold text-gray-400 mb-2 px-2 uppercase tracking-wide">AI 思考模型</h2>
           <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              
              {/* Flash Model Option */}
              <button 
                onClick={() => handleModelChange('gemini-3-flash-preview')}
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
                onClick={() => handleModelChange('gemini-3-pro-preview')}
                className="w-full flex items-center p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors active:bg-gray-100 text-left"
              >
                  <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mr-4 shrink-0">
                      <BrainCircuit size={20} />
                  </div>
                  <div className="flex-1">
                      <h3 className="font-bold text-gray-800 text-sm">增强模式 (Pro)</h3>
                      <p className="text-xs text-gray-400 mt-0.5">逻辑推理强，生成的菜单主题更有文化韵味，但速度稍慢。</p>
                  </div>
                  {settings?.aiModel === 'gemini-3-pro-preview' && (
                      <div className="text-[#1a472a]">
                          {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Check size={20} strokeWidth={3} />}
                      </div>
                  )}
              </button>

              {/* 2.5 Model Option */}
              <button 
                onClick={() => handleModelChange('gemini-2.5-flash-preview-09-2025')}
                className="w-full flex items-center p-4 hover:bg-gray-50 transition-colors active:bg-gray-100 text-left"
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
           </div>
           <p className="text-[10px] text-gray-400 px-2 mt-2">
              Gemini Pro 模型在处理复杂文化内容时表现更佳。
           </p>
        </div>

        {/* App Info Group */}
        <div>
            <h2 className="text-xs font-bold text-gray-400 mb-2 px-2 uppercase tracking-wide">关于应用</h2>
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm p-4">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-800">版本</span>
                    <span className="text-gray-500">v1.1.0</span>
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