import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, GripVertical } from 'lucide-react';

interface CategoryManagerProps {
  categories: string[];
  onUpdateCategories: (categories: string[]) => void;
  onBack: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, onUpdateCategories, onBack }) => {
  const [newCategory, setNewCategory] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleAdd = () => {
    if (!newCategory.trim()) return;
    if (categories.includes(newCategory.trim())) {
      alert('分类已存在');
      return;
    }
    onUpdateCategories([...categories, newCategory.trim()]);
    setNewCategory('');
  };

  const handleDelete = (index: number) => {
    if (confirm('确定要删除这个分类吗？')) {
      const newCats = [...categories];
      newCats.splice(index, 1);
      onUpdateCategories(newCats);
    }
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(categories[index]);
  };

  const saveEdit = (index: number) => {
    if (!editValue.trim()) return;
    if (categories.includes(editValue.trim()) && categories[index] !== editValue.trim()) {
      alert('分类已存在');
      return;
    }
    const newCats = [...categories];
    newCats[index] = editValue.trim();
    onUpdateCategories(newCats);
    setEditingIndex(null);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // Transparent drag image or default
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newCats = [...categories];
    const draggedItem = newCats[draggedIndex];
    newCats.splice(draggedIndex, 1);
    newCats.splice(index, 0, draggedItem);
    
    onUpdateCategories(newCats);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#f2f4f6]">
      <div className="px-5 py-4 bg-white sticky top-0 z-20 shadow-sm flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#1a472a]">分类管理</h1>
        <div className="text-sm text-gray-400">{categories.length} 个分类</div>
      </div>

      <div className="p-5 space-y-4 overflow-y-auto pb-32">
        {/* Add New */}
        <div className="bg-white p-4 rounded-2xl shadow-sm flex gap-3 items-center">
          <input
            type="text"
            placeholder="新增分类名称..."
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-base text-gray-900 outline-none focus:ring-2 focus:ring-[#1a472a]/20 transition-all placeholder:text-gray-400"
          />
          <button 
            onClick={handleAdd}
            disabled={!newCategory.trim()}
            className="bg-[#1a472a] text-white p-3 rounded-xl disabled:opacity-50 hover:bg-[#143620] transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* List */}
        <div className="space-y-3">
          {categories.map((cat, index) => (
            <div 
                key={cat} // Use cat as key for smoother reordering if unique, or index if swapping
                draggable={editingIndex === null}
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
                    className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-base text-gray-900 outline-none border border-[#1a472a] w-full"
                    autoFocus
                  />
                  <button onClick={() => saveEdit(index)} className="text-green-600 p-2 bg-green-50 rounded-lg">
                    <Save size={18} />
                  </button>
                  <button onClick={() => setEditingIndex(null)} className="text-gray-400 p-2 hover:bg-gray-50 rounded-lg">
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 flex-1">
                      <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 p-1">
                        <GripVertical size={18} />
                      </div>
                      <span className="font-medium text-gray-800 text-base">{cat}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => startEdit(index)}
                      className="p-2 text-gray-400 hover:text-[#1a472a] hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(index)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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