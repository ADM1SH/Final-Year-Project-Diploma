import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../utils/constants';
import { AuthService } from '../../api/services';

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

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState('username'); // 'username' | 'words'
  const [forgotUsername, setForgotUsername] = useState('');
  const [resetToken, setResetToken] = useState(null);
  const [resetPositions, setResetPositions] = useState([]);
  const [wordInputs, setWordInputs] = useState({});
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [isRequestingReset, setIsRequestingReset] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const resetForgotState = () => {
    setShowForgotModal(false);
    setForgotStep('username');
    setForgotUsername('');
    setResetToken(null);
    setResetPositions([]);
    setWordInputs({});
    setForgotNewPassword('');
    setForgotConfirmPassword('');
  };

  const handleRequestReset = async () => {
    if (!forgotUsername) {
      Alert.alert('Error', 'Please enter your username.');
      return;
    }
    setIsRequestingReset(true);
    try {
      const data = await AuthService.requestPasswordReset(forgotUsername);
      setResetToken(data.token);
      setResetPositions(data.positions);
      setForgotStep('words');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'No recovery words found for this account.');
    } finally {
      setIsRequestingReset(false);
    }
  };

  const handleConfirmReset = async () => {
    const missingWord = resetPositions.some((pos) => !wordInputs[pos]);
    if (missingWord || !forgotNewPassword || !forgotConfirmPassword) {
      Alert.alert('Error', 'Please fill all fields.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setIsSendingReset(true);
    try {
      await AuthService.verifyPasswordReset(resetToken, wordInputs, forgotNewPassword);
      setIsSendingReset(false);
      resetForgotState();
      Alert.alert('Success', 'Password has been reset successfully. You can now log in.');
    } catch (e) {
      setIsSendingReset(false);
      Alert.alert('Error', e.response?.data?.error || 'Failed to reset password.');
    }
  };
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="leaf" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.logo}>My Preloved</Text>
          <Text style={styles.tagline}>Love it again.</Text>
        </View>

        {}
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

          <TouchableOpacity onPress={() => setShowForgotModal(true)}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {}
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

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {forgotStep === 'username' ? (
              <>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <Text style={styles.modalText}>
                  Enter your username. We'll ask for 3 of your 9 recovery words to verify it's you.
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Username"
                  autoCapitalize="none"
                  value={forgotUsername}
                  onChangeText={setForgotUsername}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={resetForgotState}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleRequestReset}>
                    {isRequestingReset ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.modalSubmitText}>Next</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Verify Recovery Words</Text>
                <Text style={styles.modalText}>
                  Enter word #{resetPositions.join(', #')} from your saved recovery words.
                </Text>
                {resetPositions.map((pos) => (
                  <TextInput
                    key={pos}
                    style={styles.modalInput}
                    placeholder={`Word #${pos}`}
                    autoCapitalize="none"
                    value={wordInputs[pos] || ''}
                    onChangeText={(text) => setWordInputs({ ...wordInputs, [pos]: text })}
                  />
                ))}
                <TextInput
                  style={styles.modalInput}
                  placeholder="New Password"
                  secureTextEntry
                  value={forgotNewPassword}
                  onChangeText={setForgotNewPassword}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Confirm New Password"
                  secureTextEntry
                  value={forgotConfirmPassword}
                  onChangeText={setForgotConfirmPassword}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={resetForgotState}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleConfirmReset}>
                    {isSendingReset ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.modalSubmitText}>Reset Password</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, padding: 30, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingBottom: 40 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'Playfair Display' : 'serif'
  },
  tagline: { fontSize: 18, color: COLORS.black, marginTop: 4, opacity: 0.8 },
  inputContainer: { width: '100%', marginBottom: 30 },
  label: { fontSize: 14, fontWeight: 'bold', color: COLORS.black, marginBottom: 8, marginTop: 15 },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: COLORS.black,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1
  },
  inputError: { backgroundColor: '#FEF2F2', borderWidth: 1.5, borderColor: COLORS.danger },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  errorText: { color: COLORS.danger, fontSize: 13, marginLeft: 6, fontWeight: '500' },
  forgotText: { color: COLORS.primary, fontSize: 14, fontWeight: '600', textAlign: 'right', marginTop: 12 },
  actionContainer: { width: '100%', alignItems: 'center' },
  loginButton: { backgroundColor: COLORS.primary, width: '100%', height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  disabledButton: { opacity: 0.7 },
  loginButtonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  registerLink: { padding: 10 },
  registerLinkText: { color: COLORS.black, fontSize: 15 },
  registerBold: { color: COLORS.primary, fontWeight: 'bold' },
  footerText: { marginTop: 40, fontSize: 13, color: COLORS.gray, fontWeight: '500' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { width: '85%', backgroundColor: COLORS.white, borderRadius: 20, padding: 25, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.black, marginBottom: 10 },
  modalText: { fontSize: 14, color: COLORS.gray, marginBottom: 20 },
  modalInput: { backgroundColor: COLORS.lightGray, borderRadius: 12, padding: 15, fontSize: 16, color: COLORS.black, marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 15, marginRight: 10 },
  modalCancelText: { fontSize: 16, color: COLORS.gray, fontWeight: 'bold' },
  modalSubmitBtn: { backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 },
  modalSubmitText: { fontSize: 16, color: COLORS.white, fontWeight: 'bold' }
});
