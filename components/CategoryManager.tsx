import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, GripVertical, Loader2, ChevronLeft } from 'lucide-react';
import { useSwipe } from '../hooks/useSwipe';

interface CategoryManagerProps {
  categories: string[];
  onUpdateCategories: (categories: string[]) => Promise<void>;
  onRenameCategory: (oldName: string, newName: string) => Promise<void>;
  onBack: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, onUpdateCategories, onRenameCategory, onBack }) => {
  const [newCategory, setNewCategory] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  // Loading State
  const [isProcessing, setIsProcessing] = useState(false);

  // Swipe Handler
  const swipeHandlers = useSwipe(onBack);

  const handleAdd = async () => {
    if (!newCategory.trim()) return;
    if (categories.includes(newCategory.trim())) {
      alert('分类已存在');
      return;
    }
    
    setIsProcessing(true);
    try {
        await onUpdateCategories([...categories, newCategory.trim()]);
        setNewCategory('');
    } catch (e) {
        // Error handled in App
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDelete = async (index: number) => {
    if (confirm('确定要删除这个分类吗？')) {
      setIsProcessing(true);
      const newCats = [...categories];
      newCats.splice(index, 1);
      try {
        await onUpdateCategories(newCats);
      } catch (e) {
        // Error handled
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(categories[index]);
  };

  const saveEdit = async (index: number) => {
    const trimmedNewName = editValue.trim();
    const oldName = categories[index];

    if (!trimmedNewName) return;
    if (categories.includes(trimmedNewName) && oldName !== trimmedNewName) {
      alert('分类已存在');
      return;
    }
    
    setIsProcessing(true);
    try {
        if (oldName !== trimmedNewName) {
            // Use specific rename function to update recipes as well
            await onRenameCategory(oldName, trimmedNewName);
        }
        setEditingIndex(null);
    } catch (e) {
        // Error handled
    } finally {
        setIsProcessing(false);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (isProcessing) {
        e.preventDefault();
        return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index || isProcessing) return;
    
    const newCats = [...categories];
    const draggedItem = newCats[draggedIndex];
    newCats.splice(draggedIndex, 1);
    newCats.splice(index, 0, draggedItem);
    
    onUpdateCategories(newCats); // Note: Calling API on every drag over is intensive. Ideally debounce or only save on drop.
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#f2f4f6]" {...swipeHandlers}>
      <div className="px-5 py-4 bg-white sticky top-0 z-20 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
            {/* Added explicit back button in header for consistency */}
            <button onClick={onBack} className="text-gray-600 hover:text-gray-900">
                <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-bold text-[#1a472a]">分类管理</h1>
        </div>
        <div className="flex items-center gap-3">
             {isProcessing && <Loader2 className="animate-spin text-[#1a472a]" size={18} />}
             <div className="text-sm text-gray-400">{categories.length} 个分类</div>
        </div>
      </div>

      <div className="p-5 space-y-4 overflow-y-auto pb-32">
        {/* Add New */}
        <div className="bg-white p-4 rounded-2xl shadow-sm flex gap-3 items-center">
          <input
            type="text"
            placeholder="新增分类名称..."
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            disabled={isProcessing}
            className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-base text-gray-900 outline-none focus:ring-2 focus:ring-[#1a472a]/20 transition-all placeholder:text-gray-400 disabled:opacity-50"
          />
          <button 
            onClick={handleAdd}
            disabled={!newCategory.trim() || isProcessing}
            className="bg-[#1a472a] text-white p-3 rounded-xl disabled:opacity-50 hover:bg-[#143620] transition-colors"
          >
            {isProcessing && newCategory.trim() ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
          </button>
        </div>

        {/* List */}
        <div className="space-y-3">
          {categories.map((cat, index) => (
            <div 
                key={cat} 
                draggable={editingIndex === null && !isProcessing}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between group transition-all duration-200 ${draggedIndex === index ? 'opacity-50 scale-95 shadow-none bg-gray-50' : ''}`}
            >
              {editingIndex === index ? (
                <div className="flex-1 flex items-center gap-2 mr-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    disabled={isProcessing}
                    className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-base text-gray-900 outline-none border border-[#1a472a] w-full"
                    autoFocus
                  />
                  <button onClick={() => saveEdit(index)} disabled={isProcessing} className="text-green-600 p-2 bg-green-50 rounded-lg disabled:opacity-50">
                    <Save size={18} />
                  </button>
                  <button onClick={() => setEditingIndex(null)} disabled={isProcessing} className="text-gray-400 p-2 hover:bg-gray-50 rounded-lg disabled:opacity-50">
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 flex-1">
                      <div className={`text-gray-300 p-1 ${isProcessing ? 'cursor-not-allowed opacity-50' : 'cursor-grab active:cursor-grabbing hover:text-gray-500'}`}>
                        <GripVertical size={18} />
                      </div>
                      <span className="font-medium text-gray-800 text-base">{cat}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => startEdit(index)}
                      disabled={isProcessing}
                      className="p-2 text-gray-400 hover:text-[#1a472a] hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(index)}
                      disabled={isProcessing}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};