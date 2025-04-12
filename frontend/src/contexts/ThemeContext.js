import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { getTheme, getAvailableThemes, applyThemeToDocument, defaultThemeColors } from '../utils/themeUtils';

const ThemeContext = createContext();

// Define a default theme name
const DEFAULT_THEME_NAME = 'starshine'; // Or pick another default

export const ThemeProvider = ({ children }) => {
  const [themeName, setThemeName] = useState(() => {
    // Attempt to load saved theme from localStorage
    return localStorage.getItem('appTheme') || DEFAULT_THEME_NAME;
  });
  const [themeColors, setThemeColors] = useState(defaultThemeColors); // Initialize with defaults
  const [isLoading, setIsLoading] = useState(true);

  // Load theme colors when themeName changes or on initial load
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    getTheme(themeName).then(colors => {
      if (isMounted) {
        setThemeColors(colors);
        applyThemeToDocument(colors);
        setIsLoading(false);
        localStorage.setItem('appTheme', themeName); // Save selection
      }
    }).catch(error => {
        console.error("Failed to load theme:", error);
        if (isMounted) {
            // Fallback to default theme if loading fails
            applyThemeToDocument(defaultThemeColors);
            setThemeColors(defaultThemeColors);
            setThemeName(DEFAULT_THEME_NAME);
            localStorage.setItem('appTheme', DEFAULT_THEME_NAME);
            setIsLoading(false);
        }
    });

    return () => {
      isMounted = false;
    };
  }, [themeName]);

  const changeTheme = useCallback((newThemeName) => {
    setThemeName(newThemeName);
  }, []);

  const availableThemes = useMemo(() => getAvailableThemes(), []);

  const value = useMemo(() => ({
    themeName,
    themeColors,
    changeTheme,
    availableThemes,
    isLoading
  }), [themeName, themeColors, changeTheme, availableThemes, isLoading]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 