// SellScreen allows users to list new preloved items or edit existing listings.
// It features a 2-step form that guides users through basic listing info and a dynamic grading survey.
import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Image,
    Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADING_CONFIG } from '../../utils/constants';
import { useMarket } from '../../context/MarketContext';
import api from '../../api/client';
import styles from './styles/SellScreenStyles';

// Grade thresholds extracted as named constants to avoid magic numbers in logic.
const GRADE_A_THRESHOLD = 90;
const GRADE_B_THRESHOLD = 70;
const GRADE_C_THRESHOLD = 50;

// Brand retention map — defined once at module level.
const BRAND_RETENTION_MAP = {
    apple:   0.90,
    samsung: 0.80,
    sony:    0.85,
    gucci:   0.88,
    chanel:  0.92,
    nike:    0.70,
    adidas:  0.68,
};

// Default form state extracted so it can be referenced in multiple places.
const DEFAULT_FORM_DATA = {
    name:                '',
    description:         '',
    flaw_disclosure:     '',
    price:               '',
    weight:              '',
    brand:               '',
    original_price:      '',
    category:            null,
    is_negotiable:       false,
    calculated_grade:    'A',
    is_fully_functional: false,
    has_scratches:       false,
    has_dents_cracks:    false,
    has_original_box:    false,
    has_receipt:         false,
    is_clean:            false,
    has_all_accessories: false,
    has_repair_history:  false,
    battery_health_good: false,
    is_modified:         false,
};

export const SellScreen = ({ route = {}, navigation }) => {
    const { addItem, categories, refreshMarket } = useMarket();

    const editItem  = route.params?.item;
    const isEditing = !!editItem;

    const [step, setStep]                     = useState(1);
    const [loading, setLoading]               = useState(false);
    const [images, setImages]                 = useState(() => {
        // Eagerly initialise images from the edit item so the gallery is populated.
        if (editItem?.images) return editItem.images.map(img => img.image_url || img.image);
        if (editItem?.display_image) return [editItem.display_image];
        return [];
    });
    const [isGettingPrice, setIsGettingPrice] = useState(false);
    const [aiPricingReport, setAiPricingReport] = useState(null);
    const scrollRef = useRef(null);

    const [formData, setFormData] = useState(() => {
        if (!editItem) return { ...DEFAULT_FORM_DATA };
        // Pre-populate all form fields from the item being edited.
        return {
            name:                editItem.name               || '',
            description:         editItem.description        || '',
            flaw_disclosure:     editItem.flaw_disclosure    || '',
            price:               editItem.price              ? editItem.price.toString() : '',
            weight:              editItem.weight             ? editItem.weight.toString() : '',
            brand:               editItem.brand              || '',
            original_price:      editItem.original_price     ? editItem.original_price.toString() : '',
            category:            editItem.category           || null,
            is_negotiable:       editItem.is_negotiable      || false,
            calculated_grade:    editItem.calculated_grade   || 'A',
            is_fully_functional: editItem.is_fully_functional  || false,
            has_scratches:       editItem.has_scratches        || false,
            has_dents_cracks:    editItem.has_dents_cracks     || false,
            has_original_box:    editItem.has_original_box     || false,
            has_receipt:         editItem.has_receipt          || false,
            is_clean:            editItem.is_clean             || false,
            has_all_accessories: editItem.has_all_accessories  || false,
            has_repair_history:  editItem.has_repair_history   || false,
            battery_health_good: editItem.battery_health_good  || false,
            is_modified:         editItem.is_modified          || false,
        };
    });

    // Generic field setter — avoids creating a new arrow function per field.
    const updateField = useCallback((key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    }, []);

    // Sum up weights of satisfied checkpoints to evaluate the overall condition score.
    const calculateItemScore = useCallback((catName) => {
        const rules = GRADING_CONFIG[catName] || GRADING_CONFIG['Default'];
        return rules.reduce((score, rule) => score + (formData[rule.key] ? rule.weight : 0), 0);
    }, [formData]);

    const getPriceSuggestion = useCallback(async (isSurveyCompleted = false) => {
        if (!formData.category) {
            if (!isSurveyCompleted) Alert.alert('Error', 'Please select a category first.');
            return;
        }
        if (!formData.brand?.trim()) {
            if (!isSurveyCompleted) Alert.alert('Error', 'Please enter a brand first.');
            return;
        }
        const origPriceNum = parseFloat(formData.original_price);
        if (isNaN(origPriceNum) || origPriceNum <= 0) {
            if (!isSurveyCompleted) Alert.alert('Error', 'Please enter a valid original retail price first.');
            return;
        }

        const selectedCat  = categories.find(c => c.id === formData.category);
        const categoryName = selectedCat ? selectedCat.name : 'Tech';
        const conditionScore = isSurveyCompleted
            ? calculateItemScore(categoryName) / 10.0
            : 8.0;

        if (!isSurveyCompleted) setIsGettingPrice(true);

        try {
            // Request pricing suggestion from machine learning estimator based on condition score and retail value.
            const response = await api.post('/items/suggest_price/', {
                category:        categoryName,
                brand:           formData.brand,
                condition_score: conditionScore,
                duration_days:   5,
                original_price:  origPriceNum,
            });
            const suggested = response.data.suggested_price;
            if (isSurveyCompleted) {
                setAiPricingReport(suggested);
            } else {
                updateField('price', suggested.toFixed(2));
                Alert.alert(
                    'Smart Price Calculator',
                    `Based on category, brand, condition, and retail price, the recommended listing price is RM ${suggested.toFixed(2)}.`
                );
            }
        } catch (err) {
            // Compute standard depreciation fallback using custom category and brand retention tables.
            console.warn('Pricing endpoint failed, falling back to local heuristic', err);
            const baseRetention  = categoryName === 'Tech' ? 0.80 : (categoryName === 'Fashion' ? 0.65 : 0.45);
            const brandRetention = BRAND_RETENTION_MAP[formData.brand.toLowerCase().trim()] || 0.70;
            const finalSuggestion = origPriceNum * baseRetention * brandRetention * (conditionScore / 10.0);
            const rounded = Math.round(finalSuggestion);

            if (isSurveyCompleted) {
                setAiPricingReport(rounded);
            } else {
                updateField('price', rounded.toFixed(2));
                Alert.alert('Smart Price Calculator', `Suggested price: RM ${rounded.toFixed(2)}`);
            }
        } finally {
            if (!isSurveyCompleted) setIsGettingPrice(false);
        }
    }, [formData, categories, calculateItemScore, updateField]);

    // Re-compute AI pricing whenever survey checkboxes change (debounced).
    React.useEffect(() => {
        if (
            step !== 2 ||
            !formData.category ||
            !formData.brand ||
            !formData.original_price
        ) return;

        const handler = setTimeout(() => getPriceSuggestion(true), 300);
        return () => clearTimeout(handler);
    }, [
        step,
        formData.is_fully_functional,
        formData.battery_health_good,
        formData.has_repair_history,
        formData.has_scratches,
        formData.has_all_accessories,
        formData.has_original_box,
        formData.is_clean,
        formData.has_dents_cracks,
        formData.has_receipt,
    ]);

    const handleNextStep = useCallback(() => {
        setStep(2);
        scrollRef.current?.scrollTo({ y: 0, animated: false });
        getPriceSuggestion(true);
    }, [getPriceSuggestion]);

    const pickImage = useCallback(async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes:           ImagePicker.MediaTypeOptions.Images,
                quality:              0.7,
                allowsMultipleSelection: true,
            });
            if (!result.canceled) {
                setImages(prev => [...prev, ...result.assets.map(a => a.uri)]);
            }
        } catch {
            Alert.alert('Error', 'Could not open gallery.');
        }
    }, []);

    const takePhoto = useCallback(async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Sorry, we need camera permissions to make this work!');
                return;
            }
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality:    0.7,
            });
            if (!result.canceled) {
                setImages(prev => [...prev, result.assets[0].uri]);
            }
        } catch {
            Alert.alert('Error', 'Could not open camera.');
        }
    }, []);

    const handleRemoveImage = useCallback((idx) => {
        setImages(prev => prev.filter((_, i) => i !== idx));
    }, []);

    const handleSubmit = useCallback(async () => {
        const priceNum  = parseFloat(formData.price);
        const weightNum = parseFloat(formData.weight);

        if (isNaN(priceNum) || priceNum <= 0) {
            Alert.alert('Error', 'Please enter a valid price greater than 0.');
            return;
        }
        if (isNaN(weightNum) || weightNum <= 0) {
            Alert.alert('Error', 'Please enter a valid weight greater than 0.');
            return;
        }

        setLoading(true);
        try {
            if (isEditing) {
                const data = new FormData();
                Object.keys(formData).forEach(key => {
                    if (formData[key] !== null) {
                        let value = formData[key];
                        if (typeof value === 'boolean') value = value ? 'true' : 'false';
                        if (key === 'price') {
                            value = value.toString().replace(/[^0-9.]/g, '') || '0';
                        }
                        data.append(key, value);
                    }
                });

                let newImagesCount = 0;
                images.forEach(uri => {
                    if (uri.startsWith('file://') || uri.startsWith('content://') || !uri.startsWith('http')) {
                        const cleanUri =
                            Platform.OS === 'ios' ? uri.replace('file://', '') : uri;
                        data.append('uploaded_images', {
                            uri:  Platform.OS === 'android' && !cleanUri.startsWith('file://')
                                ? `file://${cleanUri}`
                                : cleanUri,
                            name: `photo_${newImagesCount}.jpg`,
                            type: 'image/jpeg',
                        });
                        newImagesCount++;
                    }
                });

                await api.patch(`items/${editItem.id}/`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                Alert.alert('Success', 'Your item has been updated!');
                refreshMarket();
                navigation.navigate('ItemDetail', { itemId: editItem.id });
            } else {
                await addItem(formData, images);
                Alert.alert('Success', 'Your item is live!');
                navigation.navigate('Home');
            }
        } catch (err) {
            console.error('Submit item error:', err);
            Alert.alert('Error', `Could not ${isEditing ? 'update' : 'upload'} item. Please try again.`);
        } finally {
            setLoading(false);
        }
    }, [formData, images, isEditing, editItem, addItem, refreshMarket, navigation]);

    // Memoised step-1 form to avoid rebuilding the JSX tree on every keystroke.
    const step1Form = useMemo(() => (
        <View>
            <View style={styles.section}>
                <Text style={styles.sectionLabel}>Visuals</Text>
                <Text style={styles.sectionSub}>Up to 10 photos</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
                <TouchableOpacity style={styles.addPhotoBox} onPress={takePhoto}>
                    <Ionicons name="camera-outline" size={30} color={COLORS.primary} />
                    <Text style={styles.addPhotoText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.addPhotoBox, styles.galleryBtn]} onPress={pickImage}>
                    <Ionicons name="images-outline" size={30} color={COLORS.primary} />
                    <Text style={styles.addPhotoText}>Gallery</Text>
                </TouchableOpacity>

                {images.map((uri, i) => (
                    <View key={i} style={styles.photoItem}>
                        <Image source={{ uri }} style={styles.thumbnail} />
                        <TouchableOpacity style={styles.removePhoto} onPress={() => handleRemoveImage(i)}>
                            <Ionicons name="close-circle" size={20} color={COLORS.danger} />
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>

            <Text style={styles.label}>What are you listing?</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. Vintage Ceramic Vase"
                value={formData.name}
                onChangeText={t => updateField('name', t)}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the condition, history, and why you are selling it..."
                multiline
                value={formData.description}
                onChangeText={t => updateField('description', t)}
            />

            <Text style={styles.label}>Condition Flaws / Disclosure (Optional)</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. minor scratch on bottom left corner"
                value={formData.flaw_disclosure}
                onChangeText={t => updateField('flaw_disclosure', t)}
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryPicker}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {categories.map(cat => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[styles.catChip, formData.category === cat.id && styles.activeCatChip]}
                            onPress={() => updateField('category', cat.id)}
                        >
                            <Text style={[styles.catChipText, formData.category === cat.id && styles.activeCatChipText]}>
                                {cat.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <Text style={styles.label}>Brand</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. Apple, Samsung, Nike, Pearson"
                value={formData.brand}
                onChangeText={t => updateField('brand', t)}
            />

            <Text style={styles.label}>Original Retail Price (RM)</Text>
            <View style={styles.priceContainer}>
                <Text style={styles.currency}>RM</Text>
                <TextInput
                    style={styles.priceInput}
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={formData.original_price}
                    onChangeText={t => updateField('original_price', t)}
                />
            </View>

            <Text style={styles.label}>Selling Price (RM)</Text>
            <View style={styles.priceContainer}>
                <Text style={styles.currency}>RM</Text>
                <TextInput
                    style={styles.priceInput}
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={formData.price}
                    onChangeText={t => updateField('price', t)}
                />
            </View>

            <TouchableOpacity
                style={styles.aiButton}
                onPress={() => getPriceSuggestion(false)}
                disabled={isGettingPrice}
            >
                {isGettingPrice ? (
                    <ActivityIndicator size="small" color="white" />
                ) : (
                    <View style={styles.aiButtonInner}>
                        <Ionicons name="sparkles" size={16} color="white" style={styles.aiButtonIcon} />
                        <Text style={styles.aiButtonText}>Get Price Suggestion</Text>
                    </View>
                )}
            </TouchableOpacity>

            <Text style={styles.label}>Estimated Weight (kg)</Text>
            <View style={styles.priceContainer}>
                <Ionicons name="barbell-outline" size={18} color={COLORS.gray} style={styles.weightIcon} />
                <TextInput
                    style={styles.priceInput}
                    placeholder="0.0"
                    keyboardType="numeric"
                    value={formData.weight}
                    onChangeText={t => updateField('weight', t)}
                />
            </View>

            <View style={styles.toggleRow}>
                <View>
                    <Text style={styles.toggleLabel}>Negotiable</Text>
                    <Text style={styles.toggleSub}>Open to offers from buyers</Text>
                </View>
                <TouchableOpacity
                    style={[styles.switch, formData.is_negotiable && styles.switchOn]}
                    onPress={() => updateField('is_negotiable', !formData.is_negotiable)}
                >
                    <View style={[styles.switchKnob, formData.is_negotiable && styles.switchKnobOn]} />
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={[
                    styles.nextButton,
                    (!formData.name || !formData.description || !formData.price || !formData.weight ||
                        !formData.brand || !formData.original_price || images.length === 0) && styles.disabledButton,
                ]}
                onPress={handleNextStep}
                disabled={
                    !formData.name || !formData.description || !formData.price || !formData.weight ||
                    !formData.brand || !formData.original_price || images.length === 0
                }
            >
                <Text style={styles.nextButtonText}>Next: Grading Survey  →</Text>
            </TouchableOpacity>
        </View>
    ), [
        formData, images, isGettingPrice, categories,
        takePhoto, pickImage, handleRemoveImage, updateField,
        getPriceSuggestion, handleNextStep,
    ]);

    const renderStep2 = () => {
        const selectedCat  = categories.find(c => c.id === formData.category);
        const catName      = selectedCat?.name;
        const surveyItems  = GRADING_CONFIG[catName] || GRADING_CONFIG['Default'];
        const score        = calculateItemScore(catName);

        // Derive grade label from score thresholds.
        let previewGrade = 'Grade D';
        if (score >= GRADE_A_THRESHOLD) previewGrade = 'Grade A';
        else if (score >= GRADE_B_THRESHOLD) previewGrade = 'Grade B';
        else if (score >= GRADE_C_THRESHOLD) previewGrade = 'Grade C';

        const parsedPrice   = parseFloat(formData.price);
        const parsedReport  = parseFloat(aiPricingReport);
        const isPriceHigh   = parsedPrice > parsedReport * 1.15;
        const isPriceLow    = parsedPrice < parsedReport * 0.85;

        return (
            <View>
                <View style={styles.stepHeader}>
                    <Text style={styles.stepTitle}>{catName} Condition Survey</Text>
                    <Text style={styles.stepSub}>Select all that apply to calculate your item's Grade.</Text>
                </View>

                {/* Render one tappable card per condition checkpoint defined in GRADING_CONFIG */}
                {surveyItems.map(surveyItem => {
                    const isActive = formData[surveyItem.key];
                    return (
                        <TouchableOpacity
                            key={surveyItem.key}
                            style={[styles.surveyCard, isActive && styles.activeSurveyCard]}
                            onPress={() => updateField(surveyItem.key, !formData[surveyItem.key])}
                        >
                            <View style={styles.surveyInfo}>
                                <Text style={styles.surveyLabel}>{surveyItem.label}</Text>
                                <Text style={styles.surveyDesc}>{surveyItem.desc}</Text>
                            </View>
                            <View style={[styles.surveyCheckbox, isActive && styles.surveyCheckboxChecked]}>
                                {isActive && <Ionicons name="checkmark" size={16} color="white" />}
                            </View>
                        </TouchableOpacity>
                    );
                })}

                <View style={styles.gradePreview}>
                    <Text style={styles.previewLabel}>Auto-Calculated Grade:</Text>
                    <View style={styles.previewBadge}>
                        <Ionicons name="sparkles" size={14} color="white" style={styles.previewBadgeIcon} />
                        <Text style={styles.previewGrade}>{previewGrade}</Text>
                    </View>
                </View>

                {aiPricingReport !== null && (
                    <View style={styles.aiReportCard}>
                        <View style={styles.aiReportHeader}>
                            <Ionicons name="analytics" size={24} color={COLORS.primary} style={styles.aiReportIcon} />
                            <Text style={styles.aiReportTitle}>Valuation Advisory</Text>
                        </View>
                        <Text style={styles.aiReportText}>
                            Based on your brand, original retail price, and calculated {previewGrade}, the recommended fair market value is:
                        </Text>
                        <Text style={styles.aiReportPrice}>RM {parsedReport.toFixed(2)}</Text>
                        {isPriceHigh ? (
                            <Text style={[styles.aiReportWarning, styles.warningRed]}>
                                ⚠️ Your price (RM {parsedPrice.toFixed(2)}) is over 15% higher than recommended. It may take longer to sell.
                            </Text>
                        ) : isPriceLow ? (
                            <Text style={[styles.aiReportWarning, styles.warningBlue]}>
                                💡 Your price is below recommended fair value. You will sell quickly, but might be leaving money on the table.
                            </Text>
                        ) : (
                            <Text style={[styles.aiReportWarning, styles.warningGreen]}>
                                ✅ Perfect! Your price is highly aligned with fair market value.
                            </Text>
                        )}
                    </View>
                )}

                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitButtonText}>{isEditing ? 'Save Changes' : 'Publish Listing'}</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.backLink} onPress={() => setStep(1)}>
                    <Text style={styles.backLinkText}>← Back to basics</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="close" size={24} color={COLORS.black} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEditing ? 'Edit Listing' : 'List an Item'}</Text>
                <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>Step {step}/2</Text>
                </View>
            </View>

            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: step === 1 ? '50%' : '100%' }]} />
            </View>

            <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
                {step === 1 ? step1Form : renderStep2()}
            </ScrollView>
        </View>
    );
};
