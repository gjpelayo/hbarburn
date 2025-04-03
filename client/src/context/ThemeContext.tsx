import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = 'light' | 'dark' | 'system';
type TokenTheme = string | null; // Token ID used for theming

interface ThemeContextType {
  theme: Theme;
  tokenTheme: TokenTheme;
  setTheme: (theme: Theme) => void;
  setTokenTheme: (tokenId: TokenTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Load from localStorage
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    return storedTheme || 'system';
  });
  
  const [tokenTheme, setTokenThemeState] = useState<TokenTheme>(() => {
    // Load from localStorage 
    return localStorage.getItem('tokenTheme');
  });

  // Update the HTML data-theme attribute when theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove both classes first
    root.classList.remove('light', 'dark');
    
    // Set the appropriate class based on the theme
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    
    // Persist to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Setup system theme change listener
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(mediaQuery.matches ? 'dark' : 'light');
    };
    
    // Initialize
    handleChange();
    
    // Add listener
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Setup token theme effects
  useEffect(() => {
    if (tokenTheme) {
      // Save to localStorage
      localStorage.setItem('tokenTheme', tokenTheme);
      
      // Generate a consistent HSL color from token ID
      hashString(tokenTheme).then(hash => {
        const hue = Math.abs(hash % 360); // 0-359
        document.documentElement.style.setProperty('--token-hue', hue.toString());
        document.documentElement.style.setProperty('--token-color', `hsl(${hue}, 80%, 50%)`);
        document.documentElement.style.setProperty('--token-color-light', `hsl(${hue}, 80%, 90%)`);
        document.documentElement.style.setProperty('--token-color-dark', `hsl(${hue}, 80%, 30%)`);
      });
    } else {
      // Reset to default purple theme
      localStorage.removeItem('tokenTheme');
      document.documentElement.style.setProperty('--token-hue', '271');
      document.documentElement.style.setProperty('--token-color', 'hsl(271, 80%, 50%)');
      document.documentElement.style.setProperty('--token-color-light', 'hsl(271, 80%, 90%)');
      document.documentElement.style.setProperty('--token-color-dark', 'hsl(271, 80%, 30%)');
    }
  }, [tokenTheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setTokenTheme = (newTokenTheme: TokenTheme) => {
    setTokenThemeState(newTokenTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, tokenTheme, setTokenTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Helper function to hash a string deterministically for color generation
async function hashString(str: string): Promise<number> {
  const msgUint8 = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  // Convert hash to a number (using first 4 bytes)
  return hashArray.slice(0, 4).reduce((acc, value, index) => {
    return acc + (value << (8 * index));
  }, 0);
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}