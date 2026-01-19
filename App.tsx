import React, { useState, useEffect } from 'react';
import { Home } from './components/Home';
import { AddRecipe } from './components/AddRecipe';
import { OrderMode } from './components/OrderMode';
import { Navbar } from './components/Navbar';
import { CategoryManager } from './components/CategoryManager';
import { RecipeDetail } from './components/RecipeDetail';
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

  // Toast State
  const [toast, setToast] = useState<{message: string, type: ToastType} | null>(null);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
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
      } catch (error) {
        console.error('Failed to fetch data:', error);
        showToast('数据加载失败，请刷新重试', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveRecipe = async (recipeData: Omit<Recipe, 'id' | 'createdAt'> | Recipe) => {
    if ('id' in recipeData) {
      // Editing existing recipe
      try {
        const updatedRecipe = await api.updateRecipe(recipeData as Recipe);
        setRecipes(prev => prev.map(r => r.id === updatedRecipe.id ? updatedRecipe : r));
        setSelectedRecipe(updatedRecipe); 
        
        if (currentView === 'ADD_RECIPE') {
             setDirection(1); // Push to detail
             setCurrentView('RECIPE_DETAIL');
        }
        showToast('菜谱更新成功');
      } catch (error) {
        console.error('Failed to update recipe:', error);
        showToast('保存失败: ' + (error as Error).message, 'error');
        throw error; // Re-throw so child component can stop loading
      }
    } else {
      // Creating new recipe
      const newRecipe: Recipe = {
        ...recipeData,
        id: Date.now().toString(),
        createdAt: Date.now(),
        logs: []
      };
      
      try {
        const savedRecipe = await api.createRecipe(newRecipe);
        setRecipes(prev => [savedRecipe, ...prev]);
        setDirection(-1); // Pop back to home
        setCurrentView('HOME');
        showToast('新菜谱已添加');
      } catch (error) {
        console.error('Failed to create recipe:', error);
        showToast('创建失败: ' + (error as Error).message, 'error');
        throw error; // Re-throw so child component can stop loading
      }
    }
  };

  const handleUpdateCategories = async (newCategories: string[]) => {
    try {
      const updatedCategories = await api.updateCategories(newCategories);
      setCategories(updatedCategories);
      showToast('分类已更新');
    } catch (error) {
      console.error('Failed to update categories:', error);
      showToast('分类更新失败', 'error');
      throw error;
    }
  };

  const handleRenameCategory = async (oldName: string, newName: string) => {
    try {
      // 1. Update Category List
      const newCategoryList = categories.map(c => c === oldName ? newName : c);
      await api.updateCategories(newCategoryList);
      setCategories(newCategoryList);

      // 2. Find and Update all recipes that belong to this category
      const recipesToUpdate = recipes.filter(r => r.category === oldName);
      
      // Update them one by one (in a real backend, this might be a batch operation)
      await Promise.all(recipesToUpdate.map(async (recipe) => {
        const updated = { ...recipe, category: newName };
        await api.updateRecipe(updated);
        return updated;
      }));

      // 3. Update local state
      setRecipes(prev => prev.map(r => r.category === oldName ? { ...r, category: newName } : r));
      
      showToast('分类重命名成功');
    } catch (error) {
      console.error('Failed to rename category:', error);
      showToast('重命名失败', 'error');
      throw error;
    }
  };

  const handleRecipeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setDirection(1); // Push
    setCurrentView('RECIPE_DETAIL');
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setDirection(1); // Push
    setCurrentView('ADD_RECIPE');
  };

  const navigateTo = (view: ViewState, dir: number) => {
      setDirection(dir);
      setCurrentView(view);
  };

  const renderViewContent = () => {
    switch (currentView) {
      case 'HOME':
        return (
          <Home 
            recipes={recipes} 
            categories={categories}
            onOrderModeClick={() => navigateTo('ORDER_MODE', 1)}
            onRecipeClick={handleRecipeClick}
          />
        );
      case 'ADD_RECIPE':
        return (
          <AddRecipe 
            categories={categories}
            onBack={() => {
                if (selectedRecipe && currentView === 'ADD_RECIPE') {
                     navigateTo('RECIPE_DETAIL', -1);
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
            onBack={() => {
                setSelectedRecipe(null);
                navigateTo('HOME', -1);
            }}
            onEdit={handleEditRecipe}
            onUpdate={handleSaveRecipe}
            onShowToast={showToast}
          />
        ) : null;
      default:
        return null;
    }
  };

  // Show Navbar on Home and Category Manager views
  const showNavbar = !isLoading && (currentView === 'HOME' || currentView === 'CATEGORY_MANAGER');

  const handleNavbarChangeView = (view: ViewState) => {
      if (view === 'ADD_RECIPE') {
          setSelectedRecipe(null);
      }
      setDirection(1); // Navbar taps usually feel like entering a new context or stack
      setCurrentView(view);
  };

  // Framer Motion Variants for iOS-style Push/Pop
  const variants = {
    initial: (dir: number) => ({
      x: dir > 0 ? '100%' : '-25%', // Enter from right (push) or slightly left (pop)
      opacity: dir > 0 ? 1 : 0.9,
      zIndex: dir > 0 ? 10 : 1
    }),
    animate: {
      x: 0,
      opacity: 1,
      zIndex: 1,
      transition: { 
          type: "spring", 
          stiffness: 260, 
          damping: 30 
      }
    },
    exit: (dir: number) => ({
      x: dir > 0 ? '-25%' : '100%', // Exit to left (push) or right (pop)
      opacity: dir > 0 ? 0.9 : 1,
      zIndex: dir > 0 ? 1 : 10,
      transition: { 
        type: "spring", 
        stiffness: 260, 
        damping: 30 
    }
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
                    key={currentView}
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

      {/* Toast Notification */}
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