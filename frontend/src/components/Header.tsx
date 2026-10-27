import { useLocation } from 'react-router-dom';
import { Sun, Moon, Menu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const routeNames: Record<string, string> = {
  '/': 'Dashboard',
  '/expenses': 'Expenses',
  '/stocks': 'Stocks',
  '/mutual-funds': 'Mutual Funds',
  '/fds': 'Fixed Deposits',
};

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const title = routeNames[location.pathname] || 'YouFlow';

  return (
    <header className="sticky top-0 z-10 px-4 md:px-6 py-4 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border-b border-white/30 dark:border-slate-700/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl hover:bg-white/60 dark:hover:bg-slate-700/60 transition-all"
          >
            <Menu size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl glass-card hover:scale-105 transition-all duration-200"
          aria-label="Toggle theme"
        >
          {theme === 'light'
            ? <Moon size={18} className="text-indigo-600" />
            : <Sun size={18} className="text-amber-400" />}
        </button>
      </div>
    </header>
  );
}
