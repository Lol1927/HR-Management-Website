// src/ThemeContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { themes, themeKeys } from './themes';

const ThemeContext = createContext();

const STORAGE_KEY = 'hr-app-theme';

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && themes[saved] ? saved : 'dashboardPro';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, themeName);
  }, [themeName]);

  const theme = themes[themeName];

  const setTheme = (name) => {
    if (themes[name]) {
      setThemeName(name);
    }
  };

  const cycleTheme = () => {
    const currentIdx = themeKeys.indexOf(themeName);
    const nextIdx = (currentIdx + 1) % themeKeys.length;
    setThemeName(themeKeys[nextIdx]);
  };

  return (
    <ThemeContext.Provider value={{ theme, themeName, setTheme, cycleTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
