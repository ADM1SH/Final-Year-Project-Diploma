import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../utils/constants';

export const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }
    
    setIsLoggingIn(true);
    setError('');
    try {
      await login(username, password);
    } catch (e) {
      setError('Incorrect username or password. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="leaf" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.logo}>MyPrelove</Text>
          <Text style={styles.tagline}>Love it again.</Text>
        </View>

        {/* Input Fields */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Username</Text>
          <TextInput 
            style={[styles.input, error && styles.inputError]} 
            placeholder="e.g. adamanwar" 
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />
          
          <Text style={styles.label}>Password</Text>
          <TextInput 
            style={[styles.input, error && styles.inputError]} 
            placeholder="********" 
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          
          {error ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          
          <TouchableOpacity onPress={() => {}}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={[styles.loginButton, (!username || !password) && styles.disabledButton]} 
            onPress={handleLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>Log In</Text>}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.registerLink} 
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerLinkText}>
              Don't have an account? <Text style={styles.registerBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.gray} /> Verified Malaysian Sellers
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1, padding: 30, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingBottom: 40 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  logo: { fontSize: 32, fontWeight: 'bold', color: '#064E3B', letterSpacing: -0.5 },
  tagline: { fontSize: 18, color: COLORS.black, marginTop: 4, opacity: 0.8 },
  inputContainer: { width: '100%', marginBottom: 30 },
  label: { fontSize: 14, fontWeight: 'bold', color: COLORS.black, marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 16, fontSize: 16 },
  inputError: { borderColor: COLORS.danger, backgroundColor: '#FEF2F2' },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  errorText: { color: COLORS.danger, fontSize: 13, marginLeft: 6, fontWeight: '500' },
  forgotText: { color: COLORS.primary, fontSize: 14, fontWeight: '600', textAlign: 'right', marginTop: 12 },
  actionContainer: { width: '100%', alignItems: 'center' },
  loginButton: { backgroundColor: '#064E3B', width: '100%', height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  disabledButton: { opacity: 0.7 },
  loginButtonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  registerLink: { padding: 10 },
  registerLinkText: { color: COLORS.black, fontSize: 15 },
  registerBold: { color: '#064E3B', fontWeight: 'bold' },
  footerText: { fontSize: 12, color: COLORS.gray, position: 'absolute', bottom: 40 }
});
