/**
 * AppNavigator component defining the main navigation structure of the app.
 * Configures the auth flow, bottom tab bar, stack navigators, badge counters, and real-time toast notifications.
 */
import { useRef, useState, useEffect, useCallback } from "react";
import { NavigationContainer } from "@react-navigation/native";
import {
    createStackNavigator,
    CardStyleInterpolators,
} from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
    ActivityIndicator,
    View,
    StyleSheet,
    Text,
    Platform,
    Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { OnboardingScreen } from "../screens/auth/OnboardingScreen";
import { ExploreScreen } from "../screens/main/ExploreScreen";
import { ItemDetailScreen } from "../screens/main/ItemDetailScreen";
import { CheckoutScreen } from "../screens/main/CheckoutScreen";
import { UpdatesScreen } from "../screens/main/UpdatesScreen";
import { SellScreen } from "../screens/main/SellScreen";
import { ChatListScreen } from "../screens/main/ChatListScreen";
import { ChatDetailScreen } from "../screens/main/ChatDetailScreen";
import { AdminDashboardScreen } from "../screens/main/AdminDashboardScreen";
import { AdminUserManagementScreen } from "../screens/main/AdminUserManagementScreen";
import { AdminItemManagementScreen } from "../screens/main/AdminItemManagementScreen";
import { AdminReportsScreen } from "../screens/main/AdminReportsScreen";
import { AdminTransactionScreen } from "../screens/main/AdminTransactionScreen";
import { PriceAlertsScreen } from "../screens/main/PriceAlertsScreen";
import { ProfileScreen } from "../screens/main/ProfileScreen";
import { COLORS } from "../utils/constants";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
    const { user } = useAuth();
    // Android devices with on-screen gesture/3-button navigation reserve extra
    // space at the bottom of the screen. The floating tab bar was anchored at a
    // fixed `bottom: 20`, so on those devices the system nav bar visually and
    // functionally overlapped the last row of tab buttons, blocking taps.
    const insets = useSafeAreaInsets();
    const [unreadNotifs, setUnreadNotifs] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [pendingActions, setPendingActions] = useState(0);

    const [toastVisible, setToastVisible] = useState(false);
    const [toastTitle, setToastTitle] = useState("");
    const [toastMessage, setToastMessage] = useState("");
    const toastY = useRef(new Animated.Value(-120)).current;

    const prevNotifCount = useRef(0);
    const prevMsgCount = useRef(0);
    const isFirstLoad = useRef(true);

    // Track mount state to prevent setState calls after unmount
    const isMounted = useRef(true);
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // showToast is stable across re-renders — toastY is a ref, not state,
    // so there is no dependency that can go stale here.
    const showToast = useCallback((title, message) => {
        if (!isMounted.current) return;
        setToastTitle(title);
        setToastMessage(message);
        setToastVisible(true);

        // Slide in a custom toast notification, pause, and slide it back out
        Animated.sequence([
            Animated.timing(toastY, {
                toValue: Platform.OS === "ios" ? 50 : 30,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.delay(4000),
            Animated.timing(toastY, {
                toValue: -120,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start(() => {
            if (isMounted.current) setToastVisible(false);
        });
    }, [toastY]);

    // fetchBadgeCounts accepts an AbortSignal so that in-flight requests are
    // cancelled when the effect is torn down (user logs out / component unmounts),
    // preventing both memory leaks and stale-state writes.
    const fetchBadgeCounts = useCallback(
        async (signal) => {
            if (!user) return;
            try {
                // Retrieve live badge counts for notifications, chat messages, and pending seller transactions
                const [notifRes, msgRes, transRes] = await Promise.all([
                    api.get("notifications/", { signal }),
                    api.get("messages/", { signal }),
                    api.get("transactions/", { signal }),
                ]);

                // Bail out if the component unmounted while we were awaiting
                if (!isMounted.current) return;

                const notifs = notifRes.data.results || notifRes.data;
                const unreadN = notifs.filter((n) => !n.is_read).length;

                const msgs = msgRes.data.results || msgRes.data;
                const unreadM = msgs.filter(
                    (m) => !m.is_read && m.receiver_name === user.username,
                ).length;

                const trans = transRes.data.results || transRes.data;
                const pendingT = trans.filter(
                    (t) =>
                        t.status === "PENDING" && t.seller_name === user.username,
                ).length;
                setPendingActions(pendingT);

                if (!isFirstLoad.current) {
                    // Trigger real-time toast overlays when new notifications or messages arrive after initial load
                    if (unreadN > prevNotifCount.current) {
                        const newNotifs = notifs.filter((n) => !n.is_read);
                        if (newNotifs.length > 0) {
                            showToast(newNotifs[0].title, newNotifs[0].content);
                        }
                    } else if (unreadM > prevMsgCount.current) {
                        const newMsgs = msgs.filter(
                            (m) => !m.is_read && m.receiver_name === user.username,
                        );
                        if (newMsgs.length > 0) {
                            showToast(
                                `Message from ${newMsgs[0].sender_name}`,
                                newMsgs[0].content,
                            );
                        }
                    }
                } else {
                    isFirstLoad.current = false;
                }

                prevNotifCount.current = unreadN;
                prevMsgCount.current = unreadM;
                setUnreadNotifs(unreadN);
                setUnreadMessages(unreadM);
            } catch (e) {
                // Ignore intentional aborts (component unmount / user change)
                if (e.name === "CanceledError" || e.code === "ERR_CANCELED") return;
                console.error("Badge Fetch Error:", e.message);
            }
        },
        // showToast is memoised so it is safe to include in the dep array without
        // causing the effect to re-run on every render.
        [user, showToast],
    );

    useEffect(() => {
        // Reset first-load sentinel whenever the active user changes
        isFirstLoad.current = true;

        const controller = new AbortController();
        let timeoutId;
        let isEffectMounted = true;
        
        const pollBadgeCounts = async () => {
            if (!isEffectMounted) return;
            await fetchBadgeCounts(controller.signal);
            if (isEffectMounted) {
                timeoutId = setTimeout(pollBadgeCounts, 10000);
            }
        };

        pollBadgeCounts();

        return () => {
            isEffectMounted = false;
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [fetchBadgeCounts]);

    // screenOptions inline function is stable because all its closed-over values
    // (unreadNotifs, unreadMessages, pendingActions) change only via setState,
    // not on every render cycle.
    const screenOptions = useCallback(
        ({ route }) => ({
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.gray,
            tabBarStyle: {
                position: "absolute",
                // Lift the bar above the device's safe-area inset (gesture pill /
                // 3-button nav on Android, home indicator on iOS) so it never sits
                // underneath — and is never blocked by — the system navigation UI.
                bottom: 20 + insets.bottom,
                left: 20,
                right: 20,
                height: 65,
                borderRadius: 32,
                backgroundColor: "rgba(255, 255, 255, 0.90)",
                borderTopWidth: 0,
                elevation: 8,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 10,
                paddingBottom: Platform.OS === "ios" ? 10 : 0,
            },
            tabBarLabelStyle: {
                fontSize: 10,
                fontWeight: "600",
                fontFamily:
                    Platform.OS === "ios"
                        ? "Plus Jakarta Sans"
                        : "PlusJakartaSans-SemiBold",
                marginTop: -2,
            },
            headerShown: false,
            tabBarIcon: ({ focused, color }) => {
                let iconName;
                let badgeCount = 0;

                if (route.name === "Home") {
                    iconName = focused ? "home" : "home-outline";
                } else if (route.name === "Updates") {
                    iconName = focused ? "notifications" : "notifications-outline";
                    badgeCount = unreadNotifs;
                } else if (route.name === "Chat") {
                    iconName = focused
                        ? "chatbox-ellipses"
                        : "chatbox-ellipses-outline";
                    badgeCount = unreadMessages;
                } else if (route.name === "For You") {
                    iconName = focused ? "person" : "person-outline";
                    badgeCount = pendingActions;
                } else if (route.name === "Sell") {
                    return (
                        <View style={styles.sellButton}>
                            <Text style={styles.sellButtonText}>+</Text>
                        </View>
                    );
                }

                return (
                    <View style={{ width: 24, height: 24 }}>
                        <Ionicons name={iconName} size={24} color={color} />
                        {badgeCount > 0 && (
                            <View style={styles.tabBadge}>
                                <Text style={styles.tabBadgeText}>
                                    {badgeCount > 9 ? "9+" : badgeCount}
                                </Text>
                            </View>
                        )}
                    </View>
                );
            },
        }),
        [unreadNotifs, unreadMessages, pendingActions, insets.bottom],
    );

    return (
        <View style={{ flex: 1 }}>
            <Tab.Navigator screenOptions={screenOptions}>
                <Tab.Screen name="Home" component={ExploreScreen} />
                <Tab.Screen name="Updates" component={UpdatesScreen} />
                <Tab.Screen
                    name="Sell"
                    component={SellScreen}
                    options={{ tabBarLabel: () => null }}
                />
                <Tab.Screen name="Chat" component={ChatListScreen} />
                <Tab.Screen name="For You" component={ProfileScreen} />
            </Tab.Navigator>

            {toastVisible && (
                <Animated.View
                    style={[
                        styles.toastContainer,
                        { transform: [{ translateY: toastY }] },
                    ]}
                >
                    <View style={styles.toastHeader}>
                        <Ionicons
                            name="sparkles"
                            size={18}
                            color="white"
                            style={{ marginRight: 8 }}
                        />
                        <Text style={styles.toastTitleText}>{toastTitle}</Text>
                    </View>
                    <Text style={styles.toastMessageText} numberOfLines={2}>
                        {toastMessage}
                    </Text>
                </Animated.View>
            )}
        </View>
    );
};

const AppStack = () => (
    <Stack.Navigator
        screenOptions={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        }}
    >
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
        <Stack.Screen
            name="Checkout"
            component={CheckoutScreen}
            options={{
                cardStyleInterpolator:
                    CardStyleInterpolators.forFadeFromBottomAndroid,
            }}
        />
        <Stack.Screen name="EditItem" component={SellScreen} />
        <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
        <Stack.Screen name="UserProfile" component={ProfileScreen} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
        <Stack.Screen
            name="AdminUserManagement"
            component={AdminUserManagementScreen}
        />
        <Stack.Screen
            name="AdminItemManagement"
            component={AdminItemManagementScreen}
        />
        <Stack.Screen name="AdminReports" component={AdminReportsScreen} />
        <Stack.Screen name="AdminTransactions" component={AdminTransactionScreen} />
        <Stack.Screen name="PriceAlerts" component={PriceAlertsScreen} />
    </Stack.Navigator>
);

const styles = StyleSheet.create({
    sellButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: COLORS.secondary,
        justifyContent: "center",
        alignItems: "center",
        marginTop: -25,
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    sellButtonText: {
        color: COLORS.white,
        fontSize: 28,
        fontWeight: "bold",
        lineHeight: 30,
    },
    tabBadge: {
        position: "absolute",
        right: -6,
        top: -3,
        backgroundColor: COLORS.danger,
        borderRadius: 8,
        width: 16,
        height: 16,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "white",
    },
    tabBadgeText: {
        color: "white",
        fontSize: 8,
        fontWeight: "bold",
    },
    toastContainer: {
        position: "absolute",
        top: 0,
        left: 20,
        right: 20,
        backgroundColor: COLORS.primary,
        borderRadius: 16,
        padding: 16,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        zIndex: 9999,
    },
    toastHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    toastTitleText: {
        color: "white",
        fontSize: 14,
        fontWeight: "bold",
        fontFamily:
            Platform.OS === "ios"
                ? "Plus Jakarta Sans"
                : "PlusJakartaSans-Bold",
    },
    toastMessageText: {
        color: "#D1D5DB",
        fontSize: 13,
        fontFamily:
            Platform.OS === "ios"
                ? "Plus Jakarta Sans"
                : "PlusJakartaSans-Regular",
    },
});

const AuthStack = ({ showOnboarding }) => (
    <Stack.Navigator
        screenOptions={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        }}
        initialRouteName={showOnboarding ? "Onboarding" : "Login"}
    >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
);

export const AppNavigator = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const [onboardingLoaded, setOnboardingLoaded] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const checkOnboarding = async () => {
            try {
                // Check if user has previously completed the onboarding steps
                const value = await AsyncStorage.getItem("hasSeenOnboarding");
                if (cancelled) return;
                if (value === "true") {
                    setShowOnboarding(false);
                }
            } catch (e) {
                console.error("AppNavigator: onboarding check failed:", e.message);
            } finally {
                if (!cancelled) setOnboardingLoaded(true);
            }
        };
        checkOnboarding();
        return () => {
            cancelled = true;
        };
    }, []);

    if (isLoading || !onboardingLoaded) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    backgroundColor: COLORS.background,
                }}
            >
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            {isAuthenticated ? (
                <AppStack />
            ) : (
                <AuthStack showOnboarding={showOnboarding} />
            )}
        </NavigationContainer>
    );
};
