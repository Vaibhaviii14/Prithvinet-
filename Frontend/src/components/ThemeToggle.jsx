import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
    const { isDarkMode, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
            className="relative p-2 rounded-xl transition-all duration-300 flex items-center justify-center"
            style={{
                backgroundColor: isDarkMode ? 'rgba(51,65,85,0.8)' : 'rgba(209,250,229,0.9)',
                border: isDarkMode ? '1px solid rgba(100,116,139,0.4)' : '1px solid rgba(16,185,129,0.35)',
                color: isDarkMode ? '#fbbf24' : '#059669',
                boxShadow: isDarkMode
                    ? '0 0 12px rgba(251,191,36,0.15)'
                    : '0 0 12px rgba(16,185,129,0.20)'
            }}
        >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
    );
};

export default ThemeToggle;
