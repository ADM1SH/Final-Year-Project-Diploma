/**
 * Authentication context provider for managing user state, tokens, and storage persistence.
 * Exposes login, registration, logout, and demo session actions.
 */
import {
    createContext,
    useState,
    useEffect,
    useContext,
    useCallback,
    useMemo,
    useRef,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthService } from "../api/services";
import { setSessionExpiredHandler } from "../api/client";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Track whether the provider is still mounted to avoid state updates on unmounted component
    const isMounted = useRef(true);
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // client.js clears AsyncStorage when a refresh token is rejected, but it
    // has no way to reach into this component's React state. Register a
    // callback here so a dead refresh token also clears the in-memory
    // session — otherwise isAuthenticated stays true and screens keep
    // polling protected endpoints with a token that will never work again.
    useEffect(() => {
        setSessionExpiredHandler(() => {
            if (!isMounted.current) return;
            setToken(null);
            setUser(null);
        });
        return () => setSessionExpiredHandler(null);
    }, []);

    useEffect(() => {
        const loadStorageData = async () => {
            try {
                // Retrieve persisted token and user data from local storage on startup
                const savedToken = await AsyncStorage.getItem("userToken");
                const savedUser = await AsyncStorage.getItem("userData");
                if (!isMounted.current) return;
                if (savedToken) {
                    setToken(savedToken);
                    if (savedUser) {
                        try {
                            setUser(JSON.parse(savedUser));
                        } catch {
                            // Corrupted user data — clear it so the app doesn't get stuck
                            await AsyncStorage.removeItem("userData");
                        }
                    }
                }
            } catch (e) {
                // Storage read failure — log it so it surfaces during development
                console.error("AuthContext: Failed to restore session:", e.message);
            } finally {
                if (isMounted.current) setIsLoading(false);
            }
        };
        loadStorageData();
    }, []);

    const login = useCallback(async (username, password) => {
        try {
            // Send authentication credentials to server and store user session data
            const data = await AuthService.login(username, password);
            if (!isMounted.current) return { success: false };
            setToken(data.token);
            setUser(data.user);
            await AsyncStorage.setItem("userToken", data.token);
            await AsyncStorage.setItem("refreshToken", data.refresh_token);
            await AsyncStorage.setItem("userData", JSON.stringify(data.user));
            return { success: true };
        } catch (e) {
            console.error("Login Error:", e.message);
            if (e.response) console.error("Response data:", e.response.data);
            throw e;
        }
    }, []);

    const register = useCallback(async (userData) => {
        try {
            // Create the account, but do NOT persist the session yet — the caller
            // must show the user their one-time recovery words first, then call
            // completeSession() once the user confirms they've saved them.
            const data = await AuthService.register(userData);
            return { success: true, data };
        } catch (e) {
            console.error("Register Error:", e.message);
            if (e.response) console.error("Response data:", e.response.data);
            throw e;
        }
    }, []);

    const completeSession = useCallback(async (data) => {
        if (!isMounted.current) return;
        setToken(data.token);
        setUser(data.user);
        await AsyncStorage.setItem("userToken", data.token);
        await AsyncStorage.setItem("refreshToken", data.refresh_token);
        await AsyncStorage.setItem("userData", JSON.stringify(data.user));
    }, []);

    const logout = useCallback(async () => {
        // Invalidate token on the backend before clearing local storage
        try {
            const refreshToken = await AsyncStorage.getItem("refreshToken");
            if (refreshToken) {
                await AuthService.logout(refreshToken);
            }
        } catch (e) {
            console.error("Logout API Error:", e.message);
        }

        await AsyncStorage.multiRemove(["userToken", "refreshToken", "userData"]);
        if (isMounted.current) {
            setToken(null);
            setUser(null);
        }
    }, []);

    // Memoised value object — only rebuilds when its members change, preventing
    // unnecessary re-renders of every context consumer on unrelated parent renders
    const value = useMemo(
        () => ({
            user,
            token,
            isLoading,
            login,
            register,
            completeSession,
            logout,
            isAuthenticated: !!token,
        }),
        [user, token, isLoading, login, register, completeSession, logout],
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
