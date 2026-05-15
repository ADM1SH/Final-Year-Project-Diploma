import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import { useMarket } from '../../context/MarketContext';

export const SellScreen = ({ navigation }) => {
  const { addItem, categories } = useMarket();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    price: '', 
    category: null,
    is_negotiable: false,
    calculated_grade: 'A',
    is_fully_functional: true,
    has_scratches: false,
    has_dents_cracks: false,
    has_original_box: false,
    has_receipt: false,
    is_clean: true,
    has_all_accessories: true,
    has_repair_history: false,
    battery_health_good: true,
    is_modified: false,
  });

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        quality: 0.7,
        allowsMultipleSelection: true
      });
      
      if (!result.canceled) {
        const newImages = result.assets.map(a => a.uri);
        setImages([...images, ...newImages]);
      }
    } catch (err) {
      Alert.alert("Error", "Could not open gallery.");
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera permissions to make this work!');
        return;
      }

      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      if (!result.canceled) {
        setImages([...images, result.assets[0].uri]);
      }
    } catch (err) {
      Alert.alert("Error", "Could not open camera.");
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await addItem(formData, images);
      Alert.alert("Success", "Your item is live!");
      navigation.navigate('Home');
    } catch (err) {
      Alert.alert("Error", "Could not upload item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View>
      <View style={styles.section}><Text style={styles.sectionLabel}>Visuals</Text><Text style={styles.sectionSub}>Up to 10 photos</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
        <TouchableOpacity style={styles.addPhotoBox} onPress={takePhoto}>
          <Ionicons name="camera-outline" size={30} color={COLORS.primary}/>
          <Text style={styles.addPhotoText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.addPhotoBox, { marginLeft: 10 }]} onPress={pickImage}>
          <Ionicons name="images-outline" size={30} color={COLORS.primary}/>
          <Text style={styles.addPhotoText}>Gallery</Text>
        </TouchableOpacity>
        {images.map((uri, i) => (
          <View key={i} style={styles.photoItem}>
            <Image source={{uri}} style={styles.thumbnail}/>
            <TouchableOpacity style={styles.removePhoto} onPress={() => setImages(images.filter((_, idx) => idx !== i))}>
              <Ionicons name="close-circle" size={20} color={COLORS.danger}/>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Text style={styles.label}>What are you listing?</Text>
      <TextInput style={styles.input} placeholder="e.g. Vintage Ceramic Vase" value={formData.name} onChangeText={t => setFormData({...formData, name: t})}/>
      
      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryPicker}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat.id} 
              style={[styles.catChip, formData.category === cat.id && styles.activeCatChip]}
              onPress={() => setFormData({...formData, category: cat.id})}
            >
              <Text style={[styles.catChipText, formData.category === cat.id && styles.activeCatChipText]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.label}>Price (RM)</Text>
      <View style={styles.priceContainer}>
        <Text style={styles.currency}>RM</Text>
        <TextInput style={styles.priceInput} placeholder="0.00" keyboardType="numeric" value={formData.price} onChangeText={t => setFormData({...formData, price: t})}/>
      </View>

      <View style={styles.toggleRow}>
        <View>
          <Text style={styles.toggleLabel}>Negotiable</Text>
          <Text style={styles.toggleSub}>Open to offers from buyers</Text>
        </View>
        <TouchableOpacity 
          style={[styles.switch, formData.is_negotiable && styles.switchOn]}
          onPress={() => setFormData({...formData, is_negotiable: !formData.is_negotiable})}
        >
          <View style={[styles.switchKnob, formData.is_negotiable && styles.switchKnobOn]}/>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.nextButton, (!formData.name || !formData.price || images.length === 0) && styles.disabledButton]} 
        onPress={() => setStep(2)}
        disabled={!formData.name || !formData.price || images.length === 0}
      >
        <Text style={styles.nextButtonText}>Next: Grading Survey  →</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => {
    const surveyItems = [
      { id: 'is_fully_functional', label: 'Fully Functional', desc: 'No internal hardware/software issues' },
      { id: 'has_scratches', label: 'Cosmetic Scratches', desc: 'Visible marks on the exterior' },
      { id: 'has_dents_cracks', label: 'Dents or Cracks', desc: 'Impact damage to the body or screen' },
      { id: 'is_clean', label: 'Cleanliness', desc: 'Free of stains, dust, or odors' },
      { id: 'has_all_accessories', label: 'All Accessories', desc: 'Includes all original chargers or parts' },
      { id: 'battery_health_good', label: 'Good Battery Health', desc: 'Battery holds charge well' },
      { id: 'has_repair_history', label: 'No Repair History', desc: 'Never been opened or repaired' },
      { id: 'is_modified', label: 'Original State', desc: 'No customizations or alterations' },
      { id: 'has_original_box', label: 'Original Packaging', desc: 'Comes with original box/tags' },
      { id: 'has_receipt', label: 'Proof of Purchase', desc: 'Valid receipt available' },
    ];

    return (
      <View>
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>Item Condition Survey</Text>
          <Text style={styles.stepSub}>Select all that apply to calculate your item's Grade.</Text>
        </View>

        {surveyItems.map(item => {
          // Special logic: some items are "positive" (is_clean), some are "negative" (has_scratches)
          // The UI should reflect the "current state" of the formData
          const isActive = item.id === 'has_scratches' || item.id === 'has_dents_cracks' || item.id === 'is_modified' || item.id === 'has_repair_history' 
                           ? !formData[item.id] 
                           : formData[item.id];

          return (
            <TouchableOpacity 
              key={item.id} 
              style={[styles.surveyCard, isActive && styles.activeSurveyCard]}
              onPress={() => {
                setFormData({...formData, [item.id]: !formData[item.id]});
              }}
            >
              <View style={styles.surveyInfo}>
                <Text style={styles.surveyLabel}>{item.label}</Text>
                <Text style={styles.surveyDesc}>{item.desc}</Text>
              </View>
              <View style={[styles.surveyCheckbox, isActive && styles.surveyCheckboxChecked]}>
                {isActive && <Ionicons name="checkmark" size={16} color="white"/>}
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.gradePreview}>
          <Text style={styles.previewLabel}>Auto-Calculated Grade:</Text>
          <View style={styles.previewBadge}>
            <Ionicons name="sparkles" size={14} color="white" style={{marginRight: 5}}/>
            <Text style={styles.previewGrade}>DYNAMIC ESTIMATE</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.submitButtonText}>Publish Listing</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => setStep(1)}><Text style={styles.backLinkText}>← Back to basics</Text></TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={24} color={COLORS.black}/></TouchableOpacity>
        <Text style={styles.headerTitle}>List an Item</Text>
        <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>Step {step}/2</Text></View>
      </View>
      
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: step === 1 ? '50%' : '100%' }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {step === 1 ? renderStep1() : renderStep2()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { paddingTop: 60, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  stepBadge: { backgroundColor: COLORS.lightGray, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  stepBadgeText: { fontSize: 12, fontWeight: 'bold', color: COLORS.gray },
  progressBar: { height: 4, backgroundColor: COLORS.lightGray, width: '100%' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary },
  content: { padding: 20 },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionLabel: { fontSize: 18, fontWeight: 'bold' },
  sectionSub: { fontSize: 12, color: COLORS.gray },
  photoList: { flexDirection: 'row', marginBottom: 25 },
  addPhotoBox: { width: 100, height: 100, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.lightGray },
  addPhotoText: { fontSize: 10, color: COLORS.primary, fontWeight: 'bold', marginTop: 4 },
  photoItem: { width: 100, height: 100, marginLeft: 10, borderRadius: 12, overflow: 'hidden' },
  thumbnail: { width: '100%', height: '100%' },
  removePhoto: { position: 'absolute', top: 5, right: 5, zIndex: 5 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.black, marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: COLORS.lightGray, borderRadius: 12, padding: 16, marginBottom: 20, fontSize: 16 },
  categoryPicker: { marginBottom: 20 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.lightGray, marginRight: 8 },
  activeCatChip: { backgroundColor: COLORS.primary },
  catChipText: { color: COLORS.gray, fontWeight: '500' },
  activeCatChipText: { color: COLORS.white },
  priceContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGray, borderRadius: 12, paddingHorizontal: 16, height: 56, marginBottom: 20 },
  currency: { fontSize: 18, fontWeight: 'bold', color: COLORS.gray, marginRight: 8 },
  priceInput: { flex: 1, fontSize: 18, fontWeight: 'bold' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  toggleLabel: { fontSize: 16, fontWeight: 'bold' },
  toggleSub: { fontSize: 12, color: COLORS.gray },
  switch: { width: 50, height: 28, borderRadius: 14, backgroundColor: COLORS.lightGray, padding: 2 },
  switchOn: { backgroundColor: COLORS.primary },
  switchKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.white },
  switchKnobOn: { alignSelf: 'flex-end' },
  nextButton: { backgroundColor: COLORS.primary, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  disabledButton: { backgroundColor: COLORS.gray },
  nextButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  stepHeader: { marginBottom: 25 },
  stepTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.black },
  stepSub: { fontSize: 14, color: COLORS.gray, marginTop: 8 },
  surveyCard: { flexDirection: 'row', padding: 16, borderRadius: 16, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.lightGray, marginBottom: 12, alignItems: 'center' },
  activeSurveyCard: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '05' },
  surveyInfo: { flex: 1 },
  surveyLabel: { fontSize: 16, fontWeight: 'bold' },
  surveyDesc: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  surveyCheckbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
  surveyCheckboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  gradePreview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.lightGray, padding: 15, borderRadius: 12, marginVertical: 20 },
  previewLabel: { fontSize: 14, fontWeight: '600' },
  previewBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  previewGrade: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  submitButton: { backgroundColor: COLORS.primary, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  submitButtonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  backLink: { marginTop: 20, alignItems: 'center' },
  backLinkText: { color: COLORS.gray, textDecorationLine: 'underline' }
});
