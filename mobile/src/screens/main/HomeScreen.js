import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export const HomeScreen = () => {
  const { logout, user } = useAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to MyPreLove</Text>
      <Text>User: {user?.username}</Text>
      <Button title="Logout" onPress={logout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 }
});
