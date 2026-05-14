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
    calculated_grade: 'A' 
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ImagePicker.MediaType.IMAGES, 
      quality: 0.7,
      allowsMultipleSelection: true
    });
    if (!result.canceled) {
      const newImages = result.assets.map(a => a.uri);
      setImages([...images, ...newImages]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });

    if (!result.canceled) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    await addItem(formData, images);
    setLoading(false);
    Alert.alert("Success", "Your item is live!");
    navigation.navigate('Home');
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

      <Text style={styles.label}>Price</Text>
      <View style={styles.priceContainer}>
        <Text style={styles.currency}>$</Text>
        <TextInput style={styles.priceInput} placeholder="0.00" keyboardType="numeric" value={formData.price} onChangeText={t => setFormData({...formData, price: t})}/>
      </View>

      <View style={styles.toggleRow}>
        <View>
          <Text style={styles.toggleLabel}>Negotiable</Text>
          <Text style={styles.toggleSub}>Open to offers</Text>
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
        <Text style={styles.nextButtonText}>Continue to Grading</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => {
    const grades = [
      { id: 'A', title: 'Never used', desc: 'Item is brand new with tags or in its original unopened packaging. No flaws.', icon: 'shield-checkmark-outline' },
      { id: 'B', title: 'Gently used', desc: 'Used a few times but looks almost new. No visible marks, stains, or damage.', icon: 'happy-outline' },
      { id: 'C', title: 'Minor wear', desc: 'Shows signs of regular use. Might have slight pilling, minor scratches, or fading.', icon: 'time-outline' },
      { id: 'D', title: 'Needs repair', desc: 'Functional but needs attention. May have a missing button, stuck zipper, or small hole.', icon: 'hammer-outline' },
    ];

    return (
      <View>
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>What is the condition of your item?</Text>
          <Text style={styles.stepSub}>Be as accurate as possible to help buyers find what they're looking for.</Text>
        </View>

        {grades.map(g => (
          <TouchableOpacity 
            key={g.id} 
            style={[styles.gradeCard, formData.calculated_grade === g.id && styles.activeGradeCard]}
            onPress={() => setFormData({...formData, calculated_grade: g.id})}
          >
            <View style={styles.gradeIcon}>
              <Ionicons name={g.icon} size={24} color={formData.calculated_grade === g.id ? COLORS.primary : COLORS.gray}/>
            </View>
            <View style={styles.gradeInfo}>
              <View style={styles.gradeHeader}>
                <Text style={styles.gradeTitle}>{g.title}</Text>
                <View style={[styles.miniBadge, {backgroundColor: COLORS.lightGray}]}>
                  <Text style={styles.miniBadgeText}>GRADE {g.id}</Text>
                </View>
              </View>
              <Text style={styles.gradeDesc}>{g.desc}</Text>
            </View>
            {formData.calculated_grade === g.id && (
              <View style={styles.checkCircle}><Ionicons name="checkmark" size={12} color="white"/></View>
            )}
          </TouchableOpacity>
        ))}

        <View style={styles.impactPreview}>
          <View style={styles.impactIcon}><Ionicons name="leaf" size={20} color={COLORS.primary}/></View>
          <View>
            <Text style={styles.impactTitle}>Eco-Impact</Text>
            <Text style={styles.impactText}>Listing this item saves approx. {(parseFloat(formData.price || 0) * 0.15).toFixed(1)}kg of carbon emissions.</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.submitButtonText}>List It Now</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => setStep(1)}><Text style={styles.backLinkText}>Back to basics</Text></TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={24} color={COLORS.black}/></TouchableOpacity>
        <Text style={styles.headerTitle}>List an Item</Text>
        <TouchableOpacity><Text style={styles.draftsText}>Drafts</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {step === 1 ? renderStep1() : renderStep2()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { paddingTop: 60, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  draftsText: { color: COLORS.primary, fontWeight: '600' },
  content: { padding: 20 },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionLabel: { fontSize: 18, fontWeight: 'bold' },
  sectionSub: { fontSize: 12, color: COLORS.gray },
  photoList: { flexDirection: 'row', marginBottom: 25 },
  addPhotoBox: { width: 100, height: 100, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.lightGray },
  addPhotoText: { fontSize: 10, color: COLORS.primary, fontWeight: 'bold', marginTop: 4 },
  photoItem: { width: 100, height: 100, marginLeft: 10, borderRadius: 12, overflow: 'hidden' },
  thumbnail: { width: '100%', height: '100%' },
  removePhoto: { position: 'absolute', top: 5, right: 5 },
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
  gradeCard: { flexDirection: 'row', padding: 16, borderRadius: 16, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.lightGray, marginBottom: 12 },
  activeGradeCard: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '05' },
  gradeIcon: { width: 40, height: 40, justifyContent: 'center' },
  gradeInfo: { flex: 1 },
  gradeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  gradeTitle: { fontSize: 16, fontWeight: 'bold' },
  miniBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  miniBadgeText: { fontSize: 10, fontWeight: 'bold', color: COLORS.gray },
  gradeDesc: { fontSize: 12, color: COLORS.gray, lineHeight: 18 },
  checkCircle: { position: 'absolute', top: -5, right: -5, width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  impactPreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.eco, padding: 16, borderRadius: 12, marginBottom: 30, marginTop: 10 },
  impactIcon: { marginRight: 12 },
  impactTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.ecoText },
  impactText: { fontSize: 12, color: COLORS.ecoText, marginTop: 2 },
  submitButton: { backgroundColor: COLORS.primary, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  submitButtonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  backLink: { marginTop: 20, alignItems: 'center' },
  backLinkText: { color: COLORS.gray, textDecorationLine: 'underline' }
});
