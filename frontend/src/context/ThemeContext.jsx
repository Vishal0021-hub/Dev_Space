import { createContext, useContext, useEffect, useState } from "react";

const THEME_STORAGE_KEY = "devspace-theme";
export const THEMES = {
  DAYLIGHT: "daylight",
  WARM_DARK: "warm-dark",
};

const ThemeContext = createContext({
  theme: THEMES.WARM_DARK,
  setTheme: () => {},
  toggleTheme: () => {},
  isDark: true,
});

function getInitialTheme() {
  if (typeof window === "undefined") return THEMES.WARM_DARK;

  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === THEMES.DAYLIGHT || saved === THEMES.WARM_DARK) {
      return saved;
    }

    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return THEMES.WARM_DARK;
    }
  } catch {
    // Fallback if localStorage or matchMedia is restricted
  }

  return THEMES.DAYLIGHT;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  // Apply theme to <html> and <body> and persist to localStorage
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.setAttribute("data-theme", theme);
    if (body) body.setAttribute("data-theme", theme);

    if (theme === THEMES.WARM_DARK) {
      root.classList.add("dark", "theme-warm-dark");
      root.classList.remove("theme-daylight-light");
      if (body) {
        body.classList.add("theme-warm-dark");
        body.classList.remove("theme-daylight-light");
      }
    } else {
      root.classList.add("theme-daylight-light");
      root.classList.remove("dark", "theme-warm-dark");
      if (body) {
        body.classList.add("theme-daylight-light");
        body.classList.remove("theme-warm-dark");
      }
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore localStorage write failures
    }
  }, [theme]);

  // Listen to OS scheme changes if user hasn't explicitly set a preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (!saved) {
        setThemeState(e.matches ? THEMES.WARM_DARK : THEMES.DAYLIGHT);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);

  const setTheme = (newTheme) => {
    if (newTheme === THEMES.DAYLIGHT || newTheme === THEMES.WARM_DARK) {
      setThemeState(newTheme);
    }
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === THEMES.WARM_DARK ? THEMES.DAYLIGHT : THEMES.WARM_DARK));
  };

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === THEMES.WARM_DARK,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export default ThemeContext;
