import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
// Restore original imports
import { getTheme, getAvailableThemes, applyThemeToDocument, defaultThemeColors } from '../utils/themeUtils';

const ThemeContext = createContext();

// Define a default theme name
const DEFAULT_THEME_NAME = 'starshine';

export const ThemeProvider = ({ children }) => {
  const [themeName, setThemeName] = useState(() => {
    return localStorage.getItem('appTheme') || DEFAULT_THEME_NAME;
  });
  // Restore state initialization
  const [themeColors, setThemeColors] = useState(defaultThemeColors);
  const [isLoading, setIsLoading] = useState(true); // Start as loading

  // Remove the simplified useEffect that only applied defaults
  // useEffect(() => {
  //   applyThemeToDocument(defaultThemeColors);
  // }, []);

  // --- Restore the original theme loading logic ---
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    console.log(`Attempting to load theme: ${themeName}`); // Add log
    getTheme(themeName).then(colors => {
      if (isMounted) {
        console.log(`Theme loaded successfully: ${themeName}`, colors); // Add log
        setThemeColors(colors);
        applyThemeToDocument(colors);
        setIsLoading(false);
        localStorage.setItem('appTheme', themeName);
      }
    }).catch(error => {
        console.error("Failed to load theme:", error); // Keep error logging
        if (isMounted) {
            // Fallback to default theme if loading fails
            console.log("Falling back to default theme."); // Add log
            applyThemeToDocument(defaultThemeColors);
            setThemeColors(defaultThemeColors);
            setThemeName(DEFAULT_THEME_NAME); // Reset name to default
            localStorage.setItem('appTheme', DEFAULT_THEME_NAME);
            setIsLoading(false);
        }
    });

    // Restore original cleanup
    return () => {
      isMounted = false;
    };
  }, [themeName]); // Run when themeName changes

  // Restore original changeTheme logic
  const changeTheme = useCallback((newThemeName) => {
    console.log(`Changing theme to: ${newThemeName}`); // Add log
    // Just update the name, the useEffect above will handle loading
    setThemeName(newThemeName);
  }, []);

  // Available themes remain the same
  const availableThemes = useMemo(() => getAvailableThemes(), []);

  // Restore original context value
  const value = useMemo(() => ({
    themeName,
    themeColors, // Use the actual themeColors state
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