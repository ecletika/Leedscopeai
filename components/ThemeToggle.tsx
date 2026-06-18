import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [light, setLight] = useState<boolean>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light')
  );

  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', light);
    try { localStorage.setItem('leadscope_theme', light ? 'light' : 'dark'); } catch { /* ignore */ }
  }, [light]);

  return (
    <button
      onClick={() => setLight((v) => !v)}
      title={light ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
      aria-label="Alternar tema"
      className={`flex items-center justify-center rounded-full border border-gray-700 bg-gray-800 p-2 text-gray-300 transition hover:text-emerald-400 ${className}`}
    >
      {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
