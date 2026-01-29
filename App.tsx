
import React, { useState, useEffect, useRef } from 'react';
import { Home } from './components/Home';
import { AddRecipe } from './components/AddRecipe';
import { OrderMode } from './components/OrderMode';
import { Navbar } from './components/Navbar';
import { CategoryManager } from './components/CategoryManager';
import { RecipeDetail } from './components/RecipeDetail';
import { Settings } from './components/Settings';
import { Recipe, ViewState } from './types';
import { api } from './services/api';
import { Loader2 } from 'lucide-react';
import { Toast, ToastType } from './components/Toast';
import { AnimatePresence, motion } from 'framer-motion';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('HOME');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Navigation Direction (1 = push, -1 = pop)
  const [direction, setDirection] = useState(0);
  const [homeScrollTop, setHomeScrollTop] = useState(0);

  // Toast State
  const [toast, setToast] = useState<{message: string, type: ToastType} | null>(null);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  };

  // --- Router Logic ---
  const syncStateWithHash = (recipesList: Recipe[]) => {
    const hash = window.location.hash;
    
    if (!hash || hash === '#/') {
      setCurrentView('HOME');
      setSelectedRecipe(null);
    } else if (hash.startsWith('#/recipe/')) {
      // Improved parsing to handle both #/recipe/[id] and #/recipe/[id]/edit
      const pathParts = hash.replace('#/recipe/', '').split('/');
      const id = pathParts[0];
      const isEdit = pathParts[1] === 'edit';
      
      const recipe = recipesList.find(r => r.id === id);
      if (recipe) {
        setSelectedRecipe(recipe);
        setCurrentView(isEdit ? 'ADD_RECIPE' : 'RECIPE_DETAIL');
      } else {
        window.location.hash = '#/';
      }
    } else if (hash === '#/add') {
      setSelectedRecipe(null);
      setCurrentView('ADD_RECIPE');
    } else if (hash === '#/order') {
      setCurrentView('ORDER_MODE');
    } else if (hash === '#/categories') {
      setCurrentView('CATEGORY_MANAGER');
    } else if (hash === '#/settings') {
      setCurrentView('SETTINGS');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedRecipes, fetchedCategories] = await Promise.all([
          api.getRecipes(),
          api.getCategories()
        ]);
        setRecipes(fetchedRecipes);
        setCategories(fetchedCategories);
        syncStateWithHash(fetchedRecipes);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        showToast('数据加载失败，请刷新重试', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();

    const handleHashChange = () => {
      syncStateWithHash(recipes);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [recipes.length]);

  const updateHash = (view: ViewState, recipe?: Recipe | null) => {
    let newHash = '#/';
    switch (view) {
      case 'RECIPE_DETAIL': newHash = `#/recipe/${recipe?.id}`; break;
      case 'ADD_RECIPE': newHash = recipe ? `#/recipe/${recipe.id}/edit` : '#/add'; break;
      case 'ORDER_MODE': newHash = '#/order'; break;
      case 'CATEGORY_MANAGER': newHash = '#/categories'; break;
      case 'SETTINGS': newHash = '#/settings'; break;
      default: newHash = '#/';
    }
    if (window.location.hash !== newHash) {
      window.location.hash = newHash;
    }
  };

  const navigateTo = (view: ViewState, dir: number, recipe?: Recipe | null) => {
      setDirection(dir);
      setCurrentView(view);
      setSelectedRecipe(recipe || null);
      updateHash(view, recipe);
  };

  const handleSaveRecipe = async (recipeData: Omit<Recipe, 'id' | 'createdAt'> | Recipe) => {
    if ('id' in recipeData) {
      try {
        const updatedRecipe = await api.updateRecipe(recipeData as Recipe);
        setRecipes(prev => prev.map(r => r.id === updatedRecipe.id ? updatedRecipe : r));
        navigateTo('RECIPE_DETAIL', 1, updatedRecipe);
        showToast('菜谱更新成功');
      } catch (error) {
        showToast('保存失败: ' + (error as Error).message, 'error');
        throw error;
      }
    } else {
      const newRecipe: Recipe = {
        ...recipeData,
        id: Date.now().toString(),
        createdAt: Date.now(),
        logs: []
      };
      try {
        const savedRecipe = await api.createRecipe(newRecipe);
        setRecipes(prev => [savedRecipe, ...prev]);
        navigateTo('HOME', -1);
        showToast('新菜谱已添加');
      } catch (error) {
        showToast('创建失败: ' + (error as Error).message, 'error');
        throw error;
      }
    }
  };

  const handleDeleteRecipe = async (id: string) => {
      if (confirm('确定要删除吗？')) {
          try {
              await api.deleteRecipe(id);
              setRecipes(prev => prev.filter(r => r.id !== id));
              navigateTo('HOME', -1);
              showToast('菜谱已删除');
          } catch (error) {
              showToast('删除失败', 'error');
          }
      }
  };

  const handleUpdateCategories = async (newCategories: string[]) => {
    try {
      const updatedCategories = await api.updateCategories(newCategories);
      setCategories(updatedCategories);
      showToast('分类已更新');
    } catch (error) {
      showToast('分类更新失败', 'error');
      throw error;
    }
  };

  const handleRenameCategory = async (oldName: string, newName: string) => {
    try {
      const newCategoryList = categories.map(c => c === oldName ? newName : c);
      await api.updateCategories(newCategoryList);
      setCategories(newCategoryList);
      setRecipes(prev => prev.map(r => r.category === oldName ? { ...r, category: newName } : r));
      showToast('分类重命名成功');
    } catch (error) {
      showToast('重命名失败', 'error');
      throw error;
    }
  };

  const renderViewContent = () => {
    switch (currentView) {
      case 'HOME':
        return (
          <Home 
            recipes={recipes} 
            categories={categories}
            initialScrollTop={homeScrollTop}
            onScroll={(top) => setHomeScrollTop(top)}
            onOrderModeClick={() => navigateTo('ORDER_MODE', 1)}
            onRecipeClick={(r) => navigateTo('RECIPE_DETAIL', 1, r)}
            onSettingsClick={() => navigateTo('SETTINGS', 1)}
          />
        );
      case 'ADD_RECIPE':
        return (
          <AddRecipe 
            categories={categories}
            onBack={() => {
                if (selectedRecipe) {
                     navigateTo('RECIPE_DETAIL', -1, selectedRecipe);
                } else {
                     navigateTo('HOME', -1);
                }
            }} 
            onSave={handleSaveRecipe}
            initialData={selectedRecipe} 
            onShowToast={showToast}
          />
        );
      case 'ORDER_MODE':
        return (
          <OrderMode 
            recipes={recipes}
            categories={categories}
            onBack={() => navigateTo('HOME', -1)} 
            onShowToast={showToast}
          />
        );
      case 'CATEGORY_MANAGER':
        return (
          <CategoryManager 
            categories={categories}
            onUpdateCategories={handleUpdateCategories}
            onRenameCategory={handleRenameCategory}
            onBack={() => navigateTo('HOME', -1)}
          />
        );
      case 'RECIPE_DETAIL':
        return selectedRecipe ? (
          <RecipeDetail 
            recipe={selectedRecipe} 
            onBack={() => navigateTo('HOME', -1)}
            onEdit={(r) => navigateTo('ADD_RECIPE', 1, r)}
            onUpdate={handleSaveRecipe}
            onDelete={handleDeleteRecipe}
            onShowToast={showToast}
          />
        ) : null;
      case 'SETTINGS':
        return (
          <Settings 
            onBack={() => navigateTo('HOME', -1)}
          />
        );
      default:
        return null;
    }
  };

  const showNavbar = !isLoading && (currentView === 'HOME' || currentView === 'CATEGORY_MANAGER');

  const handleNavbarChangeView = (view: ViewState) => {
      navigateTo(view, 1, null);
  };

  const variants = {
    initial: (dir: number) => ({
      x: dir > 0 ? '100%' : '-25%',
      opacity: dir > 0 ? 1 : 0.9,
      zIndex: dir > 0 ? 10 : 1
    }),
    animate: {
      x: 0,
      opacity: 1,
      zIndex: 1,
      transition: { type: "spring", stiffness: 260, damping: 30 }
    },
    exit: (dir: number) => ({
      x: dir > 0 ? '-25%' : '100%',
      opacity: dir > 0 ? 0.9 : 1,
      zIndex: dir > 0 ? 1 : 10,
      transition: { type: "spring", stiffness: 260, damping: 30 }
    })
  };

  return (
    <div className="max-w-md mx-auto h-[100dvh] pt-[env(safe-area-inset-top)] bg-[#f2f4f6] flex flex-col relative overflow-hidden sm:border-x sm:border-gray-200 shadow-2xl">
      <div className="flex-1 relative overflow-hidden h-full w-full">
         {isLoading ? (
            <div className="flex items-center justify-center h-full">
               <Loader2 className="animate-spin text-[#1a472a]" size={32} />
            </div>
         ) : (
            <AnimatePresence initial={false} custom={direction} mode='popLayout'>
                <motion.div
                    key={currentView + (selectedRecipe?.id || '')}
                    custom={direction}
                    variants={variants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="absolute inset-0 w-full h-full bg-[#f2f4f6] shadow-2xl"
                >
                    {renderViewContent()}
                </motion.div>
            </AnimatePresence>
         )}
      </div>
      
      {showNavbar && (
        <Navbar currentView={currentView} onChangeView={handleNavbarChangeView} />
      )}

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
};

export default App;
