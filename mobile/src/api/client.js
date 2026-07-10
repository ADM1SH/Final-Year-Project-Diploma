import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_CONFIG } from "../utils/constants";

// Extract the base server URL (without /api/) for rewriting image URLs
const NGROK_URL = "https://unvillainous-shila-hardheadedly.ngrok-free.dev";
const LOCAL_ORIGINS = [
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "http://10.0.2.2:8000",
];

// Recursively rewrite any local server URLs in API responses to the ngrok tunnel URL
// so that images and media files are reachable from the phone
const rewriteUrls = (data) => {
    if (typeof data === "string") {
        let result = data;
        for (const origin of LOCAL_ORIGINS) {
            result = result.split(origin).join(NGROK_URL);
        }
        return result;
    }
    if (Array.isArray(data)) {
        return data.map(rewriteUrls);
    }
    if (data && typeof data === "object") {
        const result = {};
        for (const key of Object.keys(data)) {
            result[key] = rewriteUrls(data[key]);
        }
        return result;
    }
    return data;
};

const api = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: 30000,
    headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
    },
});

// Inject auth token into every request
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem("userToken");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

// Prevent concurrent refresh attempts by sharing a single in-flight promise.
// Without this guard, multiple 401 responses firing simultaneously would each
// try to refresh, the first would succeed, and the rest would invalidate the
// new token by trying to use the already-consumed refresh token.
let refreshPromise = null;

// Registered by AuthContext so that when the refresh token itself is rejected
// (expired/blacklisted), the app's in-memory auth state is cleared too — not
// just AsyncStorage — forcing the UI back to the login screen instead of
// silently retrying every poll cycle with a dead token.
let onSessionExpired = null;
export const setSessionExpiredHandler = (handler) => {
    onSessionExpired = handler;
};

// Rewrite all local URLs in responses so images load via ngrok
api.interceptors.response.use(
    (response) => {
        if (response.data) {
            response.data = rewriteUrls(response.data);
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // If the error is 401 and it is not a retry or a refresh-token request itself
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url.includes("token/refresh")
        ) {
            originalRequest._retry = true;

            try {
                // Reuse the existing in-flight refresh if one is already running,
                // so parallel 401s are resolved with a single refresh call.
                if (!refreshPromise) {
                    refreshPromise = (async () => {
                        const refreshToken = await AsyncStorage.getItem("refreshToken");
                        if (!refreshToken) throw new Error("No refresh token");
                        const response = await axios.post(
                            `${API_CONFIG.BASE_URL}token/refresh/`,
                            { refresh: refreshToken },
                        );
                        const newToken = response.data.access;
                        await AsyncStorage.setItem("userToken", newToken);
                        // SIMPLE_JWT has ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION
                        // enabled server-side, so the refresh endpoint issues (and
                        // blacklists the old) refresh token on every call. The rotated
                        // token must be persisted too, or the next refresh attempt will
                        // reuse an already-blacklisted token and 401 forever.
                        if (response.data.refresh) {
                            await AsyncStorage.setItem("refreshToken", response.data.refresh);
                        }
                        return newToken;
                    })();
                }

                const newToken = await refreshPromise;
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest); // Retry the original request
            } catch (refreshError) {
                // If the refresh token is also invalid, clear storage to force re-login
                await AsyncStorage.multiRemove([
                    "userToken",
                    "refreshToken",
                    "userData",
                ]);
                // Clear in-memory auth state too, otherwise AuthContext still thinks
                // the user is authenticated and the app keeps polling protected
                // endpoints (badge counts, market refresh) with a dead token.
                if (onSessionExpired) onSessionExpired();
                return Promise.reject(refreshError);
            } finally {
                // Always clear the shared promise so subsequent 401s trigger a fresh refresh
                refreshPromise = null;
            }
        }

        return Promise.reject(error);
    },
);

export default api;
