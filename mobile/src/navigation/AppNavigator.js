import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ExploreScreen } from '../screens/main/ExploreScreen';
import { ItemDetailScreen } from '../screens/main/ItemDetailScreen';
import { CheckoutScreen } from '../screens/main/CheckoutScreen';
import { UpdatesScreen } from '../screens/main/UpdatesScreen';
import { SellScreen } from '../screens/main/SellScreen';
import { ChatListScreen } from '../screens/main/ChatListScreen';
import { ChatDetailScreen } from '../screens/main/ChatDetailScreen';
import { AdminDashboardScreen } from '../screens/main/AdminDashboardScreen';
import { AdminUserManagementScreen } from '../screens/main/AdminUserManagementScreen';
import { AdminItemManagementScreen } from '../screens/main/AdminItemManagementScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { COLORS } from '../utils/constants';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';

const MainTabs = () => {
  const { user } = useAuth();
  const [unreadNotifs, setUnreadNotifs] = React.useState(0);
  const [unreadMessages, setUnreadMessages] = React.useState(0);

  const fetchBadgeCounts = async () => {
    if (!user) return;
    try {
      const [notifRes, msgRes] = await Promise.all([
        api.get('notifications/'),
        api.get('messages/')
      ]);
      
      const notifs = notifRes.data.results || notifRes.data;
      const unreadN = notifs.filter(n => !n.is_read).length;
      setUnreadNotifs(unreadN);

      const msgs = msgRes.data.results || msgRes.data;
      // Only count messages where the user is the receiver and they are unread
      const unreadM = msgs.filter(m => !m.is_read && m.receiver_name === user.username).length;
      setUnreadMessages(unreadM);
      
      if (unreadN > 0 || unreadM > 0) {
        console.log(`Badges Updated - Notifs: ${unreadN}, Messages: ${unreadM}`);
      }
    } catch (e) {
      console.error('Badge Fetch Error:', e.message);
    }
  };

  React.useEffect(() => {
    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [user]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#064E3B',
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: { height: 75, paddingBottom: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          let badgeCount = 0;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Updates') {
            iconName = focused ? 'notifications' : 'notifications-outline';
            badgeCount = unreadNotifs;
          } else if (route.name === 'Explore') {
            iconName = focused ? 'compass' : 'compass-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbox-ellipses' : 'chatbox-ellipses-outline';
            badgeCount = unreadMessages;
          } else if (route.name === 'For You') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Sell') {
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
                  <Text style={styles.tabBadgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
                </View>
              )}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={ExploreScreen} />
      <Tab.Screen name="Updates" component={UpdatesScreen} />
      <Tab.Screen 
        name="Sell" 
        component={SellScreen} 
        options={{ 
          tabBarLabel: () => null,
        }}
      />
      <Tab.Screen name="Chat" component={ChatListScreen} />
      <Tab.Screen name="For You" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const AppStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MainTabs" component={MainTabs} />
    <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
    <Stack.Screen name="Checkout" component={CheckoutScreen} />
    <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
    <Stack.Screen name="UserProfile" component={ProfileScreen} />
    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
    <Stack.Screen name="AdminUserManagement" component={AdminUserManagementScreen} />
    <Stack.Screen name="AdminItemManagement" component={AdminItemManagementScreen} />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  sellButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 5,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  sellButtonText: {
    color: COLORS.white,
    fontSize: 30,
    fontWeight: 'bold',
  },
  tabBadge: {
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'white',
  },
  tabBadgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  }
});

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

export const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};
