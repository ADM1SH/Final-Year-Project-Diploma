import 'react-native-gesture-handler';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View, Text } from 'react-native';
import { useFonts, PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { MarketProvider } from './src/context/MarketContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { StripeProvider } from '@stripe/stripe-react-native';

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F9F8', padding: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1A1C1C', marginBottom: 10, fontFamily: 'serif' }}>Oops! Something went wrong.</Text>
          <Text style={{ fontSize: 14, color: '#717970', textAlign: 'center', marginBottom: 20 }}>
            An unexpected error occurred. Please restart the application.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'PlayfairDisplay-Regular': PlayfairDisplay_400Regular,
    'PlayfairDisplay-SemiBold': PlayfairDisplay_600SemiBold,
    'PlayfairDisplay-Bold': PlayfairDisplay_700Bold,
    'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F9F8' }}>
        <ActivityIndicator size="large" color="#002C13" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ErrorBoundary>
          <StripeProvider publishableKey="pk_test_51TiVRQJIXqLIAfFEnsnIf8CqilutCvqlpErXmM1wtUWOI3ujxDupXN75d9gHO7CfUX84C2FrxMRBu0SmejKGpzeg009ZNQpr9z">
            <AuthProvider>
              <ThemeProvider>
                <MarketProvider>
                  <AppNavigator />
                </MarketProvider>
              </ThemeProvider>
            </AuthProvider>
          </StripeProvider>
        </ErrorBoundary>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
