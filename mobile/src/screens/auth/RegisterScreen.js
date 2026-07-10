import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../utils/constants';

export const RegisterScreen = ({ navigation }) => {
  const { register, completeSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [recoveryWords, setRecoveryWords] = useState(null);
  const [pendingSessionData, setPendingSessionData] = useState(null);
  const [hasConfirmedSaved, setHasConfirmedSaved] = useState(false);

  const handleRegister = async () => {
    if (!formData.username || !formData.email || !formData.password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await register(formData);
      setPendingSessionData(data);
      setRecoveryWords(data.recovery_words || []);
    } catch (e) {
      Alert.alert("Error", "Registration failed. Try a different username or email.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!hasConfirmedSaved) {
      Alert.alert("Hold on", "Please confirm you've saved your recovery words before continuing.");
      return;
    }
    await completeSession(pendingSessionData);
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
      </ScrollView>

      {recoveryWords && (
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Ionicons name="key" size={32} color={COLORS.primary} style={{ marginBottom: 10 }} />
            <Text style={styles.modalTitle}>Save Your Recovery Words</Text>
            <Text style={styles.modalText}>
              Write down these 9 words in order and keep them somewhere safe. If you ever forget
              your password, you'll need to enter 3 of these words (chosen at random) to reset it.
              We don't use email, so this is the only way to recover your account.
            </Text>

            <View style={styles.wordsGrid}>
              {recoveryWords.map((word, index) => (
                <View key={index} style={styles.wordChip}>
                  <Text style={styles.wordIndex}>{index + 1}</Text>
                  <Text style={styles.wordText}>{word}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.confirmRow}
              onPress={() => setHasConfirmedSaved(!hasConfirmedSaved)}
            >
              <Ionicons
                name={hasConfirmedSaved ? 'checkbox' : 'square-outline'}
                size={22}
                color={COLORS.primary}
              />
              <Text style={styles.confirmText}>I've saved these words somewhere safe</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, !hasConfirmedSaved && styles.disabledButton]}
              onPress={handleContinue}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  content: { padding: 30, paddingTop: 120, alignItems: 'center' },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Playfair Display' : 'serif'
  },
  subtitle: { fontSize: 16, color: COLORS.gray, marginBottom: 40, textAlign: 'center' },
  input: {
    backgroundColor: COLORS.white,
    width: '100%',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    color: COLORS.black,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1
  },
  button: {
    backgroundColor: COLORS.primary,
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20
  },
  buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  linkText: { color: COLORS.gray, fontSize: 14 },
  linkBold: { color: COLORS.primary, fontWeight: 'bold' },
  disabledButton: { opacity: 0.5 },
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center',
  },
  modalContent: {
    width: '88%', backgroundColor: COLORS.white, borderRadius: 20, padding: 25,
    alignItems: 'center', marginVertical: 60,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.black, marginBottom: 10, textAlign: 'center' },
  modalText: { fontSize: 14, color: COLORS.gray, marginBottom: 20, textAlign: 'center', lineHeight: 20 },
  wordsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 },
  wordChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGray,
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, margin: 4, minWidth: '42%',
  },
  wordIndex: { fontSize: 12, fontWeight: 'bold', color: COLORS.primary, marginRight: 6 },
  wordText: { fontSize: 14, fontWeight: '600', color: COLORS.black },
  confirmRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  confirmText: { marginLeft: 8, fontSize: 14, color: COLORS.black, flexShrink: 1 },
});
