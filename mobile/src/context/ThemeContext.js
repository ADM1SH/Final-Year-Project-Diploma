import { createContext, useContext, useCallback, useMemo } from "react";
import { COLORS } from "../utils/constants";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // Theme is currently static — isDarkMode is kept as a constant so future
    // dark-mode support can be added without restructuring the context API.
    const isDarkMode = false;

    // Stable reference — avoids re-creating a new function on every render
    const toggleTheme = useCallback(() => {
        // TODO: wire up to a useState / AsyncStorage toggle when dark mode is implemented
    }, []);

    // Memoised value object so consumers only re-render when the theme actually changes
    const value = useMemo(
        () => ({ isDarkMode, toggleTheme, colors: COLORS }),
        [isDarkMode, toggleTheme],
    );

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};
