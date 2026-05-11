import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export const LoginScreen = () => {
  const { login } = useAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MyPreLove Login</Text>
      <Button title="Mock Login" onPress={() => login('testuser', 'password')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 }
});
