import React from 'react';
import { Home, Plus, LayoutList } from 'lucide-react';
import { ViewState } from '../types';

interface NavbarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onChangeView }) => {
  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-50 bottom-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="bg-white/90 backdrop-blur-md rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] px-8 py-2 flex items-center gap-12 border border-white/50">
        <button 
          onClick={() => onChangeView('HOME')}
          className={`p-2 transition-all duration-300 ${currentView === 'HOME' ? 'text-[#1a472a] scale-110' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Home strokeWidth={currentView === 'HOME' ? 2.5 : 2} size={24} />
        </button>

        <button 
          onClick={() => onChangeView('ADD_RECIPE')}
          className="w-12 h-12 bg-[#1a472a] rounded-full flex items-center justify-center text-white shadow-lg shadow-green-900/20 hover:scale-105 transition-transform duration-300 -my-2"
        >
          <Plus strokeWidth={3} size={24} />
        </button>

        <button 
          onClick={() => onChangeView('CATEGORY_MANAGER')}
          className={`p-2 transition-all duration-300 ${currentView === 'CATEGORY_MANAGER' ? 'text-[#1a472a] scale-110' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <LayoutList strokeWidth={currentView === 'CATEGORY_MANAGER' ? 2.5 : 2} size={24} />
        </button>
      </div>
    </div>
  );
};