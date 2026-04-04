import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
      className="fixed right-3 top-1/2 z-[70] -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full border border-gray-200/90 bg-white/95 text-amber-600 shadow-lg backdrop-blur-sm transition hover:scale-105 dark:border-gray-600 dark:bg-gray-800/95 dark:text-amber-300"
    >
      {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
    </button>
  );
}
