import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../utils/constants';

export const RegisterScreen = ({ navigation }) => {
  const { register, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleRegister = async () => {
    setLoading(true);
    await register({
      username: formData.username,
      email: formData.email,
      password: formData.password,
    });
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.black} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Join MyPrelove</Text>
        <Text style={styles.subtitle}>Start your sustainable journey today.</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          value={formData.username}
          onChangeText={(text) => setFormData({ ...formData, username: text })}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={formData.password}
          onChangeText={(text) => setFormData({ ...formData, password: text })}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
          secureTextEntry
        />

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Create Account</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.linkBold}>Log in</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.bypassButton} 
          onPress={() => login('demo', 'pass', true)}
        >
          <Text style={styles.bypassText}>Skip to Demo Marketplace →</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  backButton: { position: 'absolute', top: 60, left: 20, zIndex: 10, padding: 10 },
  content: { padding: 30, paddingTop: 100, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.black, marginBottom: 8 },
  subtitle: { fontSize: 16, color: COLORS.gray, marginBottom: 40, textAlign: 'center' },
  input: { backgroundColor: COLORS.lightGray, width: '100%', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16 },
  button: { backgroundColor: COLORS.primary, width: '100%', height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 20, marginBottom: 20 },
  buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  linkText: { color: COLORS.gray, fontSize: 14 },
  linkBold: { color: COLORS.primary, fontWeight: 'bold' },
  bypassButton: { marginTop: 40, padding: 10 },
  bypassText: { color: COLORS.gray, fontSize: 12, textDecorationLine: 'underline', fontWeight: '500' }
});
