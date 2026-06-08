/**
 * File: EditProfileModal.js
 * Description: Modal component to edit user profile location, bio, and phone.
 * Project: MyPreLove - Trust-Based Peer-to-Peer Secondhand Mobile App
 * Course: Diploma in Information Technology (DIT)
 * Module: Final Year Project (FYP) - DIT3004 / DIT3102
 * Developer: Adam Anwar & DIT Team
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, ScrollView, Image, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../utils/constants';

export const EditProfileModal = ({ visible, onClose, onSubmit, initialLocation, initialPhone, initialBio }) => {
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);

  useEffect(() => {
    if (visible) {
      setLocation(initialLocation || '');
      setPhone(initialPhone || '');
      setBio(initialBio || '');
      setProfilePicture(null);
    }
  }, [visible, initialLocation, initialPhone, initialBio]);

  const pickProfilePicture = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to change your profile picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (!result.canceled) {
        setProfilePicture(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not access photo library.');
    }
  };

  const handleConfirm = () => {
    if (onSubmit) {
      onSubmit(location, phone, bio, profilePicture);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Ionicons name="create-outline" size={24} color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={styles.modalTitle}>Edit Profile</Text>
          </View>
          <Text style={styles.modalSub}>Update your location, biography, and contact details.</Text>
          
          <ScrollView showsVerticalScrollIndicator={false} style={styles.formScroll}>
            <View style={styles.profilePicContainer}>
              <Text style={styles.fieldLabel}>Profile Picture</Text>
              <View style={styles.avatarRow}>
                {profilePicture ? (
                  <Image source={{ uri: profilePicture }} style={styles.avatarPreview} />
                ) : (
                  <View style={[styles.avatarPreview, { backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="person-outline" size={32} color={COLORS.gray} />
                  </View>
                )}
                <TouchableOpacity style={styles.picBtn} onPress={pickProfilePicture}>
                  <Ionicons name="camera-outline" size={16} color="white" style={{ marginRight: 5 }} />
                  <Text style={styles.picBtnText}>Change Photo</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Location</Text>
              <TextInput 
                style={styles.singleLineInput}
                placeholder="e.g. Kuala Lumpur, Wilayah Persekutuan"
                value={location}
                onChangeText={setLocation}
                placeholderTextColor={COLORS.gray + '70'}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput 
                style={styles.singleLineInput}
                placeholder="e.g. +60123456789"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                placeholderTextColor={COLORS.gray + '70'}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Biography</Text>
              <TextInput 
                style={styles.bioInput}
                placeholder="Write a short description about yourself..."
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                placeholderTextColor={COLORS.gray + '70'}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleConfirm}>
                <Text style={styles.saveText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxHeight: '90%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalSub: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  formScroll: {
    maxHeight: '85%',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4B5563',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  singleLineInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  bioInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 90,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelText: {
    color: '#4B5563',
    fontWeight: 'bold',
  },
  saveBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary || '#10B981',
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  profilePicContainer: {
    marginBottom: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  avatarPreview: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  picBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  picBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'sans-serif',
  },
});
