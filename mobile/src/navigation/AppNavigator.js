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

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarActiveTintColor: '#064E3B',
      tabBarInactiveTintColor: COLORS.gray,
      tabBarStyle: { height: 75, paddingBottom: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'Home') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Updates') {
          iconName = focused ? 'notifications' : 'notifications-outline';
        } else if (route.name === 'Explore') {
          iconName = focused ? 'compass' : 'compass-outline';
        } else if (route.name === 'Chat') {
          iconName = focused ? 'chatbox-ellipses' : 'chatbox-ellipses-outline';
        } else if (route.name === 'For You') {
          iconName = focused ? 'person' : 'person-outline';
        } else if (route.name === 'Sell') {
          return (
            <View style={styles.sellButton}>
              <Text style={styles.sellButtonText}>+</Text>
            </View>
          );
        }

        return <Ionicons name={iconName} size={24} color={color} />;
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

const AppStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MainTabs" component={MainTabs} />
    <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
    <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
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
