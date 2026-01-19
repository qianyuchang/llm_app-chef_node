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

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('HOME');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
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
             setCurrentView('RECIPE_DETAIL');
        }
        showToast('菜谱更新成功');
      } catch (error) {
        console.error('Failed to update recipe:', error);
        showToast('保存失败: ' + (error as Error).message, 'error');
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
        setCurrentView('HOME');
        showToast('新菜谱已添加');
      } catch (error) {
        console.error('Failed to create recipe:', error);
        showToast('创建失败: ' + (error as Error).message, 'error');
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
    }
  };

  const handleRecipeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setCurrentView('RECIPE_DETAIL');
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setCurrentView('ADD_RECIPE');
  };

  const renderView = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="animate-spin text-[#1a472a]" size={32} />
        </div>
      );
    }

    switch (currentView) {
      case 'HOME':
        return (
          <Home 
            recipes={recipes} 
            categories={categories}
            onOrderModeClick={() => setCurrentView('ORDER_MODE')}
            onRecipeClick={handleRecipeClick}
          />
        );
      case 'ADD_RECIPE':
        return (
          <AddRecipe 
            categories={categories}
            onBack={() => {
                if (selectedRecipe && currentView === 'ADD_RECIPE') {
                     setCurrentView('RECIPE_DETAIL');
                } else {
                     setCurrentView('HOME');
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
            onBack={() => setCurrentView('HOME')} 
          />
        );
      case 'CATEGORY_MANAGER':
        return (
          <CategoryManager 
            categories={categories}
            onUpdateCategories={handleUpdateCategories}
            onBack={() => setCurrentView('HOME')}
          />
        );
      case 'RECIPE_DETAIL':
        return selectedRecipe ? (
          <RecipeDetail 
            recipe={selectedRecipe} 
            onBack={() => {
                setSelectedRecipe(null);
                setCurrentView('HOME');
            }}
            onEdit={handleEditRecipe}
            onUpdate={handleSaveRecipe}
            onShowToast={showToast}
          />
        ) : <Home 
              recipes={recipes} 
              categories={categories}
              onOrderModeClick={() => setCurrentView('ORDER_MODE')}
              onRecipeClick={handleRecipeClick}
            />;
      default:
        return (
          <Home 
            recipes={recipes} 
            categories={categories}
            onOrderModeClick={() => setCurrentView('ORDER_MODE')}
            onRecipeClick={handleRecipeClick}
          />
        );
    }
  };

  // Show Navbar on Home and Category Manager views
  const showNavbar = !isLoading && (currentView === 'HOME' || currentView === 'CATEGORY_MANAGER');

  const handleNavbarChangeView = (view: ViewState) => {
      if (view === 'ADD_RECIPE') {
          setSelectedRecipe(null);
      }
      setCurrentView(view);
  };

  return (
    <div className="max-w-md mx-auto h-screen bg-[#f2f4f6] flex flex-col relative overflow-hidden sm:border-x sm:border-gray-200 shadow-2xl">
      <div className="flex-1 overflow-hidden h-full">
        {renderView()}
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