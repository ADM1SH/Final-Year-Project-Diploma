/**
 * Market context provider managing listings, categories, and user favorites state.
 * Coordinates fetching active marketplace items and uploading new listings with image files.
 */
import {
    createContext,
    useState,
    useEffect,
    useContext,
    useCallback,
    useMemo,
} from "react";
import { Platform } from "react-native";
import api from "../api/client";
import { useAuth } from "./AuthContext";

const MarketContext = createContext();

export const MarketProvider = ({ children }) => {
    const [items, setItems] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user, logout } = useAuth();

    // refreshMarket is wrapped in useCallback so it has a stable identity.
    // The AbortController signal ensures that if a second call fires before
    // the first resolves (e.g. rapid user/logout toggling), stale responses
    // are discarded rather than overwriting fresh state.
    const refreshMarket = useCallback(
        async (signal) => {
            try {
                // Fetch categories, marketplace items, and user favorites concurrently
                const [catRes, itemRes, favRes] = await Promise.all([
                    api.get("categories/", { signal }),
                    api.get("items/", { signal }),
                    api.get("favorites/", { signal }),
                ]);

                const cats = catRes.data.results || catRes.data;
                const itemsData = itemRes.data.results || itemRes.data;
                const favsData = favRes.data.results || favRes.data;

                if (cats) setCategories(cats);
                if (itemsData) setItems(itemsData);
                if (favsData) setFavorites(favsData.map((f) => f.item));
            } catch (e) {
                // Ignore abort errors — they are intentional and not real failures
                if (e.name === "CanceledError" || e.code === "ERR_CANCELED") return;
                console.error("Refresh Market Error:", e.message);
                if (e.response && e.response.status === 401) {
                    if (logout) logout();
                }
            } finally {
                setLoading(false);
            }
        },
        [logout],
    );

    useEffect(() => {
        if (!user) {
            setItems([]);
            setFavorites([]);
            setLoading(false);
            return;
        }

        // Each effect execution gets its own AbortController so that when the
        // effect re-runs (user changes) or the component unmounts, the in-flight
        // request is cancelled and its callback becomes a no-op.
        const controller = new AbortController();

        let timeoutId;
        let isEffectMounted = true;
        
        const pollMarket = async () => {
            if (!isEffectMounted) return;
            await refreshMarket(controller.signal);
            if (isEffectMounted) {
                timeoutId = setTimeout(pollMarket, 10000);
            }
        };

        pollMarket();

        return () => {
            isEffectMounted = false;
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [user, refreshMarket]);

    // toggleFavorite uses functional setState updaters to avoid closing over
    // a stale `favorites` snapshot, which was the original bug.
    const toggleFavorite = useCallback(async (itemId) => {
        try {
            // Optimistically toggle favorite state using the updater form
            setFavorites((prev) => {
                const isFav = prev.includes(itemId);
                return isFav
                    ? prev.filter((id) => id !== itemId)
                    : [...prev, itemId];
            });
            await api.post(`items/${itemId}/toggle_favorite/`);
        } catch (e) {
            // Revert the optimistic update on failure
            console.error("Toggle Favorite Error:", e.message);
            setFavorites((prev) => {
                const isFav = prev.includes(itemId);
                return isFav
                    ? prev.filter((id) => id !== itemId)
                    : [...prev, itemId];
            });
        }
    }, []);

    const addItem = useCallback(
        async (formData, localImages) => {
            // Pre-render new item in the local state for a responsive UI while uploading.
            // Use functional setState updater to avoid closing over a stale `items` snapshot.
            const newItem = {
                id: Date.now(),
                name: formData.name,
                price: formData.price,
                weight: formData.weight || 0,
                category: formData.category,
                calculated_grade: formData.calculated_grade || "A",
                display_image: localImages.length > 0 ? localImages[0] : null,
                images: localImages.map((uri) => ({ image: uri })),
                eco_impact: (parseFloat(formData.weight || 0) * 2.5).toFixed(1),
                seller: { username: user?.username || "" },
                description: formData.description,
            };

            setItems((prev) => [newItem, ...prev]);

            try {
                // Format request data and upload images as multipart form data
                const data = new FormData();
                Object.keys(formData).forEach((key) => {
                    if (formData[key] !== null) {
                        let value = formData[key];
                        if (typeof value === "boolean") {
                            value = value ? "true" : "false";
                        }
                        if (key === "price") {
                            value = value.toString().replace(/[^0-9.]/g, "");
                            if (value === "") value = "0";
                        }
                        data.append(key, value);
                    }
                });
                localImages.forEach((uri, index) => {
                    const cleanUri =
                        Platform.OS === "ios" ? uri.replace("file://", "") : uri;
                    data.append("uploaded_images", {
                        uri:
                            Platform.OS === "android" &&
                            !cleanUri.startsWith("file://")
                                ? `file://${cleanUri}`
                                : cleanUri,
                        name: `photo_${index}.jpg`,
                        type: "image/jpeg",
                    });
                });
                await api.post("items/", data, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                // Sync authoritative server data after upload completes
                refreshMarket();
            } catch (e) {
                console.error("Sync Error:", e.message);
                // Roll back the optimistic item on failure
                setItems((prev) => prev.filter((i) => i.id !== newItem.id));
            }
        },
        [user, refreshMarket],
    );

    // Memoised value object — only rebuilds when members change
    const value = useMemo(
        () => ({
            items,
            categories,
            favorites,
            refreshMarket,
            addItem,
            toggleFavorite,
            loading,
        }),
        [items, categories, favorites, refreshMarket, addItem, toggleFavorite, loading],
    );

    return (
        <MarketContext.Provider value={value}>
            {children}
        </MarketContext.Provider>
    );
};

export const useMarket = () => {
    const context = useContext(MarketContext);
    if (!context) {
        throw new Error("useMarket must be used within a MarketProvider");
    }
    return context;
};
