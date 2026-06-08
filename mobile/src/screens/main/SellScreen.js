/**
 * File: SellScreen.js
 * Description: Interactive item creation form with category-aware automated condition grading.
 * Project: MyPreLove - Trust-Based Peer-to-Peer Secondhand Mobile App
 * Course: Diploma in Information Technology - Final Year Project (FYP)
 * Developer: Adam Anwar
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADING_CONFIG } from '../../utils/constants';
import { useMarket } from '../../context/MarketContext';
import api from '../../api/client';

export const SellScreen = ({ route = {}, navigation }) => {
  // Pull shared market actions and category list from global context
  const { addItem, categories, refreshMarket } = useMarket();

  // Track which step of the multi-step form the user is on (1 = basics, 2 = grading survey)
  const [step, setStep] = useState(1);

  // Show a spinner on the submit button while the API call is in flight
  const [loading, setLoading] = useState(false);

  // Hold the local URIs (or existing remote URLs) of all photos the user has picked
  const [images, setImages] = useState([]);

  // Keep a ref to the ScrollView so we can jump back to the top when switching steps
  const scrollRef = React.useRef(null);

  // Show a small spinner on the AI button while we're waiting for the price suggestion to come back
  const [suggestingPrice, setSuggestingPrice] = useState(false);

  // Store the AI-calculated suggested price so we can display it on the survey step
  const [aiPricingReport, setAiPricingReport] = useState(null);

  // -------------------------------------------------------------------
  // Edit mode detection — if this screen was opened from an existing listing
  // the item object is passed via route params; otherwise it's undefined
  // -------------------------------------------------------------------
  const editItem = route.params?.item;

  // Convert to a simple boolean so we don't need to null-check everywhere
  const isEditing = !!editItem;

  // Pre-populate the form when the screen is opened in edit mode
  React.useEffect(() => {
    if (editItem) {
      // Hydrate every form field with the existing listing values
      setFormData({
        name: editItem.name || '',
        description: editItem.description || '',
        flaw_disclosure: editItem.flaw_disclosure || '',
        // Convert numeric price back to a string so TextInput can display it
        price: editItem.price ? editItem.price.toString() : '',
        weight: editItem.weight ? editItem.weight.toString() : '',
        brand: editItem.brand || '',
        original_price: editItem.original_price ? editItem.original_price.toString() : '',
        category: editItem.category || null,
        is_negotiable: editItem.is_negotiable || false,
        calculated_grade: editItem.calculated_grade || 'A',
        // Condition survey booleans — default to false if not set
        is_fully_functional: editItem.is_fully_functional || false,
        has_scratches: editItem.has_scratches || false,
        has_dents_cracks: editItem.has_dents_cracks || false,
        has_original_box: editItem.has_original_box || false,
        has_receipt: editItem.has_receipt || false,
        is_clean: editItem.is_clean || false,
        has_all_accessories: editItem.has_all_accessories || false,
        has_repair_history: editItem.has_repair_history || false,
        battery_health_good: editItem.battery_health_good || false,
        is_modified: editItem.is_modified || false,
      });

      // Restore the existing photos — prefer the full image_url from the images array,
      // fall back to the single display_image thumbnail if no gallery array exists
      if (editItem.images) {
        setImages(editItem.images.map(img => img.image_url || img.image));
      } else if (editItem.display_image) {
        setImages([editItem.display_image]);
      }
    }
  }, [editItem]);

  // -------------------------------------------------------------------
  // Master form state — one object to keep all fields in sync
  // Booleans represent the condition survey checkpoints
  // -------------------------------------------------------------------
  const [formData, setFormData] = useState({ 
    name: '',                   // Listing title
    description: '',            // Seller's free-text description
    flaw_disclosure: '',        // Optional honest disclosure of any flaws
    price: '',                  // Asking price in RM
    weight: '',                 // Item weight in kg (used for eco-impact calc)
    brand: '',                  // Brand name (also fed into AI pricing model)
    original_price: '',         // What the seller originally paid — baseline for AI suggestion
    category: null,             // FK to the selected category ID
    is_negotiable: false,       // Whether the seller is open to haggling
    calculated_grade: 'A',      // Will be overwritten by the survey result before submit
    // --- Condition survey booleans ---
    is_fully_functional: false,
    has_scratches: false,
    has_dents_cracks: false,
    has_original_box: false,
    has_receipt: false,
    is_clean: false,
    has_all_accessories: false,
    has_repair_history: false,
    battery_health_good: false,
    is_modified: false,
  });

  // ----------------------------------------------------
  // DIPLOMA FYP NOTE ON SYSTEM ARCHITECTURE / DUPLICATION RISK:
  // The checkpoints structure and condition items here are intentionally mirrored
  // from the backend (api/models.py) and ItemDetailScreen.js to ensure consistent
  // categorization and live preview of grading calculations.
  // MAINTAINER WARNING: Any changes to the grading criteria or categories MUST
  // be synchronized across:
  // 1. api/models.py (Item.calculate_grade)
  // 2. SellScreen.js (calculateItemScore)
  // 3. ItemDetailScreen.js (renderConditionSurvey checkpoints)
  // ----------------------------------------------------

  // Walk through every grading rule for the given category and tally up the score
  const calculateItemScore = (catName) => {
    let score = 0;

    // Grab the category-specific rules; fall back to the generic 'Default' set if unrecognised
    const rules = GRADING_CONFIG[catName] || GRADING_CONFIG['Default'];

    // Add the weight for each rule whose boolean is currently ticked in formData
    rules.forEach(rule => {
      if (formData[rule.key]) {
        score += rule.weight;
      }
    });

    return score;
  };

  // -------------------------------------------------------------------
  // getPriceSuggestion — hit the backend AI pricing endpoint, or fall
  // back to a local heuristic if the server is unreachable
  // isSurveyCompleted: true  → silent background call; result goes into aiPricingReport
  //                    false → user-triggered call; result fills the price field + shows alert
  // -------------------------------------------------------------------
  const getPriceSuggestion = async (isSurveyCompleted = false) => {
    // Guard: we need at minimum a category, brand, and original price to produce a sensible suggestion
    if (!formData.category) {
      if (!isSurveyCompleted) Alert.alert("Error", "Please select a category first.");
      return;
    }
    if (!formData.brand || !formData.brand.trim()) {
      if (!isSurveyCompleted) Alert.alert("Error", "Please enter a brand first.");
      return;
    }
    const origPriceNum = parseFloat(formData.original_price);
    if (isNaN(origPriceNum) || origPriceNum <= 0) {
      if (!isSurveyCompleted) Alert.alert("Error", "Please enter a valid original retail price first.");
      return;
    }

    // Resolve the category name so the backend can apply the right depreciation curve
    const selectedCat = categories.find(c => c.id === formData.category);
    const categoryName = selectedCat ? selectedCat.name : 'Tech';

    // Calculate a condition score based on whether the survey is complete
    let conditionScore = 8.0; // Default Good/Excellent
    if (isSurveyCompleted) {
      // Use the live survey answers to get a more accurate condition score (0–100 → 0–10 scale)
      const score = calculateItemScore(categoryName);
      conditionScore = score / 10.0;
    }

    // Only show the spinner on the AI button when the user manually clicked it
    if (!isSurveyCompleted) {
      setSuggestingPrice(true);
    }
    try {
      // POST to the backend pricing endpoint with everything we know about the item
      const response = await api.post('/items/suggest_price/', {
        category: categoryName,
        brand: formData.brand,
        condition_score: conditionScore,
        duration_days: 5,          // Assume a typical 5-day listing window
        original_price: origPriceNum
      });
      
      const suggested = response.data.suggested_price;

      // Route the result differently depending on who triggered this call
      if (isSurveyCompleted) {
        // Silent background call — store it for the advisory banner on step 2
        setAiPricingReport(suggested);
      } else {
        // User explicitly pressed the AI button — pre-fill price and show an alert
        setFormData(prev => ({ ...prev, price: suggested.toString() }));
        Alert.alert("AI Price Suggestion", `Based on category, brand, and retail price, we suggest listing at RM ${suggested.toFixed(2)}.`);
      }
    } catch (err) {
      // -------------------------------------------------------------------
      // Fallback heuristic: if the API call fails (offline / server error),
      // estimate price locally using category and brand-specific retention rates
      // -------------------------------------------------------------------
      console.log("AI pricing failed, falling back to local heuristic", err);

      // Base retention factor differs by category — tech holds value better than books
      const baseRetention = categoryName === 'Tech' ? 0.80 : (categoryName === 'Fashion' ? 0.65 : 0.45);

      const brandLower = formData.brand.toLowerCase();
      // Start with a generic mid-tier brand retention and override for known premium brands
      let brandRetention = 0.70;
      if (brandLower.includes('apple')) brandRetention = 0.90;
      else if (brandLower.includes('samsung')) brandRetention = 0.80;
      else if (brandLower.includes('sony')) brandRetention = 0.85;
      else if (brandLower.includes('gucci')) brandRetention = 0.88;
      else if (brandLower.includes('chanel')) brandRetention = 0.92;
      else if (brandLower.includes('nike')) brandRetention = 0.70;
      else if (brandLower.includes('adidas')) brandRetention = 0.68;
      
      // Multiply all three factors: category depreciation × brand premium × condition quality
      const finalSuggestion = origPriceNum * baseRetention * brandRetention * (conditionScore / 10.0);

      // Round to nearest whole ringgit for a cleaner UX
      const rounded = Math.round(finalSuggestion);
      
      // Same split as before — silent storage vs. user-facing alert
      if (isSurveyCompleted) {
        setAiPricingReport(rounded);
      } else {
        setFormData(prev => ({ ...prev, price: rounded.toString() }));
        Alert.alert("AI Suggestion (Offline)", `Suggested price: RM ${rounded.toFixed(2)}`);
      }
    } finally {
      // Always turn the spinner off when done, regardless of success or failure
      setSuggestingPrice(false);
    }
  };

  // -------------------------------------------------------------------
  // Auto-trigger a silent pricing recalculation whenever the user ticks
  // or unticks a survey checkbox on step 2 — keeps the advisory banner live
  // -------------------------------------------------------------------
  React.useEffect(() => {
    let handler;

    // Only run when we're on the survey step and have enough data to price
    if (step === 2 && formData.category && formData.brand && formData.original_price) {
      // Debounce by 300ms so rapid checkbox tapping doesn't fire too many API calls
      handler = setTimeout(() => {
        getPriceSuggestion(true);
      }, 300);
    }

    // Clean up the pending timeout if the dependencies change before it fires
    return () => {
      if (handler) {
        clearTimeout(handler);
      }
    };
  }, [
    // Re-run whenever the user moves to step 2 or flips any condition checkbox
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

  // Advance the form to the condition survey step and reset scroll position to the top
  const handleNextStep = () => {
    setStep(2);
    // Fix: Ensure we start at the top of the new step
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    // Trigger pricing report calculation
    getPriceSuggestion(true);
  };

  // -------------------------------------------------------------------
  // pickImage — let the user choose one or more photos from their gallery
  // -------------------------------------------------------------------
  const pickImage = async () => {
    try {
      // Request media library access before showing the picker
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }

      // Open the gallery picker; allow multiple selections at 70% quality to keep uploads light
      let result = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        quality: 0.7,
        allowsMultipleSelection: true
      });
      
      // If the user didn't cancel, append the newly selected URIs to any photos already chosen
      if (!result.canceled) {
        const newImages = result.assets.map(a => a.uri);
        setImages([...images, ...newImages]);
      }
    } catch (err) {
      Alert.alert("Error", "Could not open gallery.");
    }
  };

  // -------------------------------------------------------------------
  // takePhoto — open the device camera so the user can snap a fresh photo
  // -------------------------------------------------------------------
  const takePhoto = async () => {
    try {
      // Ask for camera permission before launching the viewfinder
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera permissions to make this work!');
        return;
      }

      // Launch the camera — single capture only, 70% quality
      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      // Add the captured photo to the list if the user didn't back out
      if (!result.canceled) {
        setImages([...images, result.assets[0].uri]);
      }
    } catch (err) {
      Alert.alert("Error", "Could not open camera.");
    }
  };

  // -------------------------------------------------------------------
  // handleSubmit — validate inputs then either PATCH an existing listing
  // or POST a brand new one, depending on whether we're in edit mode
  // -------------------------------------------------------------------
  const handleSubmit = async () => {
    // Parse price and weight up front so we can validate them before touching the API
    const priceNum = parseFloat(formData.price);
    const weightNum = parseFloat(formData.weight);

    // Don't allow zero or nonsensical prices
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert("Error", "Please enter a valid price greater than 0.");
      return;
    }
    // Weight is needed for the eco-impact CO₂ calculation on the backend
    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert("Error", "Please enter a valid weight greater than 0.");
      return;
    }

    // Lock the submit button and show the spinner while the request is in progress
    setLoading(true);
    try {
      if (isEditing) {
        // --- UPDATE PATH: build a multipart FormData payload for the PATCH request ---
        const data = new FormData();

        // Append every non-null form field, converting booleans to strings for the Django parser
        Object.keys(formData).forEach(key => {
          if (formData[key] !== null) {
            let value = formData[key];

            // Django expects 'true'/'false' strings, not JSON booleans, in multipart payloads
            if (typeof value === 'boolean') {
              value = value ? 'true' : 'false';
            }

            // Strip any stray currency symbols from the price field before sending
            if (key === 'price') {
              value = value.toString().replace(/[^0-9.]/g, '');
              if (value === '') value = '0';
            }
            data.append(key, value);
          }
        });
        
        // Only attach images that are new local files — skip anything already on the server (http URLs)
        let newImagesCount = 0;
        images.forEach((uri) => {
          if (uri.startsWith('file://') || uri.startsWith('content://') || !uri.startsWith('http')) {
            // Normalise the URI for each platform — iOS needs the 'file://' prefix stripped, Android needs it added
            const cleanUri = Platform.OS === 'ios' ? uri.replace('file://', '') : uri;
            data.append('uploaded_images', {
              uri: Platform.OS === 'android' && !cleanUri.startsWith('file://') ? `file://${cleanUri}` : cleanUri,
              name: `photo_${newImagesCount}.jpg`,
              type: 'image/jpeg',
            });
            newImagesCount++;
          }
        });

        // Send the PATCH with the multipart header so Django's parser knows what to expect
        await api.patch(`items/${editItem.id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
        Alert.alert("Success", "Your item has been updated!");

        // Refresh the market feed so the changes appear immediately for everyone
        refreshMarket();

        // Go straight back to the item detail page so the seller can review their changes
        navigation.navigate('ItemDetail', { itemId: editItem.id });
      } else {
        // --- CREATE PATH: delegate to the context helper which handles multipart building internally ---
        await addItem(formData, images);
        Alert.alert("Success", "Your item is live!");

        // Return to the Home feed so the new listing is visible straight away
        navigation.navigate('Home');
      }
    } catch (err) {
      console.error("Submit item error:", err);
      Alert.alert("Error", `Could not ${isEditing ? 'update' : 'upload'} item. Please try again.`);
    } finally {
      // Always release the loading lock so the button becomes tappable again
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // STEP 1 — Basics: photos, title, description, category, price, weight
  // -------------------------------------------------------------------
  const renderStep1 = () => (
    <View>
      {/* Section header row showing "Visuals" label and the photo limit hint */}
      <View style={styles.section}><Text style={styles.sectionLabel}>Visuals</Text><Text style={styles.sectionSub}>Up to 10 photos</Text></View>

      {/* Horizontal photo strip — camera button, gallery button, then all picked thumbnails */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>

        {/* Camera shortcut — opens the live camera viewfinder */}
        <TouchableOpacity style={styles.addPhotoBox} onPress={takePhoto}>
          <Ionicons name="camera-outline" size={30} color={COLORS.primary}/>
          <Text style={styles.addPhotoText}>Take Photo</Text>
        </TouchableOpacity>

        {/* Gallery shortcut — opens the photo library multi-select picker */}
        <TouchableOpacity style={[styles.addPhotoBox, { marginLeft: 10 }]} onPress={pickImage}>
          <Ionicons name="images-outline" size={30} color={COLORS.primary}/>
          <Text style={styles.addPhotoText}>Gallery</Text>
        </TouchableOpacity>

        {/* Render a thumbnail card for each photo the user has added so far */}
        {images.map((uri, i) => (
          <View key={i} style={styles.photoItem}>
            <Image source={{uri}} style={styles.thumbnail}/>
            {/* Red X button to remove this specific photo from the selection */}
            <TouchableOpacity style={styles.removePhoto} onPress={() => setImages(images.filter((_, idx) => idx !== i))}>
              <Ionicons name="close-circle" size={20} color={COLORS.danger}/>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Item title field */}
      <Text style={styles.label}>What are you listing?</Text>
      <TextInput style={styles.input} placeholder="e.g. Vintage Ceramic Vase" value={formData.name} onChangeText={t => setFormData({...formData, name: t})}/>
      
      {/* Multiline description field — sellers should be honest about condition and reason for selling */}
      <Text style={styles.label}>Description</Text>
      <TextInput 
        style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
        placeholder="Describe the condition, history, and why you are selling it..." 
        multiline
        value={formData.description} 
        onChangeText={t => setFormData({...formData, description: t})}
      />

      {/* Optional flaw disclosure — encourages transparency and helps build buyer trust */}
      <Text style={styles.label}>Condition Flaws / Disclosure (Optional)</Text>
      <TextInput 
        style={styles.input} 
        placeholder="e.g. minor scratch on bottom left corner" 
        value={formData.flaw_disclosure} 
        onChangeText={t => setFormData({...formData, flaw_disclosure: t})}
      />

      {/* Category picker — horizontally scrollable chip row; selection affects the grading survey on step 2 */}
      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryPicker}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {/* Render one chip per category; highlight the currently selected one */}
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

      {/* Brand field — used by both the AI pricing model and the local heuristic fallback */}
      <Text style={styles.label}>Brand</Text>
      <TextInput style={styles.input} placeholder="e.g. Apple, Samsung, Nike, Pearson" value={formData.brand} onChangeText={t => setFormData({...formData, brand: t})}/>

      {/* Original retail price — the anchor value the AI uses to estimate depreciation */}
      <Text style={styles.label}>Original Retail Price (RM)</Text>
      <View style={styles.priceContainer}>
        <Text style={styles.currency}>RM</Text>
        <TextInput style={styles.priceInput} placeholder="0.00" keyboardType="numeric" value={formData.original_price} onChangeText={t => setFormData({...formData, original_price: t})}/>
      </View>

      {/* Asking price — can be manually typed or auto-filled by the AI suggestion button below */}
      <Text style={styles.label}>Selling Price (RM)</Text>
      <View style={styles.priceContainer}>
        <Text style={styles.currency}>RM</Text>
        <TextInput style={styles.priceInput} placeholder="0.00" keyboardType="numeric" value={formData.price} onChangeText={t => setFormData({...formData, price: t})}/>
      </View>

      {/* AI price suggestion button — disabled while a request is in progress */}
      <TouchableOpacity 
        style={styles.aiButton} 
        onPress={() => getPriceSuggestion(false)}
        disabled={suggestingPrice}
      >
        {/* Show a spinner inside the button while waiting for the API response */}
        {suggestingPrice ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="sparkles" size={16} color="white" style={{ marginRight: 6 }} />
            <Text style={styles.aiButtonText}>Get AI Price Suggestion</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Weight field — the eco-impact formula on the backend uses this (kg × 2.5 = CO₂ saved) */}
      <Text style={styles.label}>Estimated Weight (kg)</Text>
      <View style={styles.priceContainer}>
        <Ionicons name="barbell-outline" size={18} color={COLORS.gray} style={{marginRight: 8}}/>
        <TextInput style={styles.priceInput} placeholder="0.0" keyboardType="numeric" value={formData.weight} onChangeText={t => setFormData({...formData, weight: t})}/>
      </View>

      {/* Negotiable toggle — a custom switch component that flips the boolean in formData */}
      <View style={styles.toggleRow}>
        <View>
          <Text style={styles.toggleLabel}>Negotiable</Text>
          <Text style={styles.toggleSub}>Open to offers from buyers</Text>
        </View>
        <TouchableOpacity 
          style={[styles.switch, formData.is_negotiable && styles.switchOn]}
          onPress={() => setFormData({...formData, is_negotiable: !formData.is_negotiable})}
        >
          {/* Slide the knob to the right when negotiable is on */}
          <View style={[styles.switchKnob, formData.is_negotiable && styles.switchKnobOn]}/>
        </TouchableOpacity>
      </View>

      {/* Next button — greyed out until all required fields are filled and at least one photo is added */}
      <TouchableOpacity 
        style={[styles.nextButton, (!formData.name || !formData.description || !formData.price || !formData.weight || !formData.brand || !formData.original_price || images.length === 0) && styles.disabledButton]} 
        onPress={handleNextStep}
        disabled={!formData.name || !formData.description || !formData.price || !formData.weight || !formData.brand || !formData.original_price || images.length === 0}
      >
        <Text style={styles.nextButtonText}>Next: Grading Survey  →</Text>
      </TouchableOpacity>
    </View>
  );

  // -------------------------------------------------------------------
  // STEP 2 — Condition survey: category-aware checkpoints + live grade preview
  // -------------------------------------------------------------------
  const renderStep2 = () => {
    // Look up the full category object so we can read its name for the survey config
    const selectedCat = categories.find(c => c.id === formData.category);
    const catName = selectedCat?.name;
    
    // Pull the correct set of grading checkpoints for this category (falls back to Default)
    const surveyItems = GRADING_CONFIG[catName] || GRADING_CONFIG['Default'];

    // Inline helper that converts the running score into a human-readable grade letter
    const calculatePreviewGrade = () => {
      const score = calculateItemScore(catName);
      // Grade thresholds match the backend's Item.calculate_grade method exactly
      if (score >= 90) return 'Grade A';
      if (score >= 70) return 'Grade B';
      if (score >= 50) return 'Grade C';
      return 'Grade D';
    };

    // Compute the current grade so we can show it live in the badge and the AI advisory text
    const previewGrade = calculatePreviewGrade();

    return (
      <View>
        {/* Step header — names the survey after the chosen category (e.g. "Tech Condition Survey") */}
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>{catName} Condition Survey</Text>
          <Text style={styles.stepSub}>Select all that apply to calculate your item's Grade.</Text>
        </View>

        {/* Render one tappable card per condition checkpoint defined in GRADING_CONFIG */}
        {surveyItems.map(item => {
          // Check if this particular checkbox is currently ticked
          const isActive = formData[item.key];

          return (
            <TouchableOpacity 
              key={item.key} 
              // Highlight the card with a border and tinted background when it's selected
              style={[styles.surveyCard, isActive && styles.activeSurveyCard]}
              onPress={() => {
                // Toggle the boolean for this checkbox field in formData
                setFormData({...formData, [item.key]: !formData[item.key]});
              }}
            >
              <View style={styles.surveyInfo}>
                {/* Checkpoint label (e.g. "Fully Functional") and helper description */}
                <Text style={styles.surveyLabel}>{item.label}</Text>
                <Text style={styles.surveyDesc}>{item.desc}</Text>
              </View>

              {/* Circular checkbox — filled with primary colour when ticked */}
              <View style={[styles.surveyCheckbox, isActive && styles.surveyCheckboxChecked]}>
                {isActive && <Ionicons name="checkmark" size={16} color="white"/>}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Live grade preview badge — updates instantly as the user taps checkboxes */}
        <View style={styles.gradePreview}>
          <Text style={styles.previewLabel}>Auto-Calculated Grade:</Text>
          <View style={styles.previewBadge}>
            <Ionicons name="sparkles" size={14} color="white" style={{marginRight: 5}}/>
            <Text style={styles.previewGrade}>{previewGrade}</Text>
          </View>
        </View>

        {/* AI valuation advisory card — only shown once aiPricingReport has a value */}
        {aiPricingReport !== null && (
          <View style={styles.aiReportCard}>
            <View style={styles.aiReportHeader}>
              <Ionicons name="sparkles" size={18} color="#064E3B" style={{marginRight: 6}}/>
              <Text style={styles.aiReportTitle}>AI Valuation Advisory</Text>
            </View>
            <Text style={styles.aiReportText}>
              Based on your brand, original retail price, and calculated {previewGrade}, the recommended fair market value is:
            </Text>

            {/* Display the AI-suggested price prominently */}
            <Text style={styles.aiReportPrice}>RM {parseFloat(aiPricingReport).toFixed(2)}</Text>

            {/* Show a contextual pricing health message based on how the seller's price compares */}
            {parseFloat(formData.price) > parseFloat(aiPricingReport) * 1.15 ? (
              // Seller is pricing more than 15% above the AI recommendation — warn them it may stall
              <Text style={[styles.aiReportWarning, {color: COLORS.danger}]}>
                ⚠️ Your price (RM {parseFloat(formData.price).toFixed(2)}) is over 15% higher than recommended. It may take longer to sell.
              </Text>
            ) : parseFloat(formData.price) < parseFloat(aiPricingReport) * 0.85 ? (
              // Seller is pricing more than 15% below — it'll sell fast but they might undervalue it
              <Text style={[styles.aiReportWarning, {color: '#1E40AF'}]}>
                💡 Your price is below recommended fair value. You will sell quickly, but might be leaving money on the table.
              </Text>
            ) : (
              // Price is within a healthy ±15% band of the AI suggestion — all good
              <Text style={[styles.aiReportWarning, {color: COLORS.primary}]}>
                ✅ Perfect! Your price is highly aligned with fair market value.
              </Text>
            )}
          </View>
        )}

        {/* Final submit button — label switches between "Save Changes" (edit) and "Publish Listing" (new) */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.submitButtonText}>{isEditing ? 'Save Changes' : 'Publish Listing'}</Text>}
        </TouchableOpacity>

        {/* Back link to return to step 1 if the seller wants to tweak their basics */}
        <TouchableOpacity style={styles.backLink} onPress={() => setStep(1)}><Text style={styles.backLinkText}>← Back to basics</Text></TouchableOpacity>
      </View>
    );
  };

  // -------------------------------------------------------------------
  // Root render — header, progress bar, and the active step's content
  // -------------------------------------------------------------------
  return (
    <View style={styles.container}>
      {/* Top bar with a close button, the screen title, and the "Step X/2" badge */}
      <View style={styles.header}>
        {/* Close icon navigates back without saving any changes */}
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={24} color={COLORS.black}/></TouchableOpacity>
        {/* Title reads "Edit Listing" when editing an existing item, otherwise "List an Item" */}
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Listing' : 'List an Item'}</Text>
        {/* Step counter badge so the user knows where they are in the flow */}
        <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>Step {step}/2</Text></View>
      </View>
      
      {/* Thin progress bar fills to 50% on step 1 and 100% on step 2 */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: step === 1 ? '50%' : '100%' }]} />
      </View>

      {/* The scrollable form area — ref lets us programmatically jump back to the top on step change */}
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        {/* Conditionally render step 1 (basics) or step 2 (grading survey) */}
        {step === 1 ? renderStep1() : renderStep2()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 60, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.background },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '600', 
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Playfair Display' : 'serif'
  },
  stepBadge: { backgroundColor: COLORS.lightGray, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  stepBadgeText: { fontSize: 12, fontWeight: 'bold', color: COLORS.gray },
  progressBar: { height: 4, backgroundColor: COLORS.lightGray, width: '100%' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary },
  content: { padding: 20, paddingBottom: 130 },

  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionLabel: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Playfair Display' : 'serif'
  },
  sectionSub: { fontSize: 12, color: COLORS.gray },
  photoList: { flexDirection: 'row', marginBottom: 25 },
  addPhotoBox: { 
    width: 100, 
    height: 100, 
    borderRadius: 16, 
    borderStyle: 'dashed', 
    borderWidth: 1.5, 
    borderColor: COLORS.primary, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1
  },
  addPhotoText: { fontSize: 10, color: COLORS.primary, fontWeight: 'bold', marginTop: 4 },
  photoItem: { width: 100, height: 100, marginLeft: 10, borderRadius: 16, overflow: 'hidden' },
  thumbnail: { width: '100%', height: '100%' },
  removePhoto: { position: 'absolute', top: 5, right: 5, zIndex: 5 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.black, marginBottom: 8, marginTop: 10 },
  input: { 
    backgroundColor: COLORS.white, 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 20, 
    fontSize: 16,
    color: COLORS.black,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1
  },
  categoryPicker: { marginBottom: 20 },
  catChip: { 
    paddingHorizontal: 18, 
    paddingVertical: 10, 
    borderRadius: 24, 
    backgroundColor: COLORS.white, 
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1
  },
  activeCatChip: { backgroundColor: COLORS.primary },
  catChipText: { color: COLORS.gray, fontWeight: '600' },
  activeCatChipText: { color: COLORS.white },
  priceContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.white, 
    borderRadius: 16, 
    paddingHorizontal: 16, 
    height: 56, 
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1
  },
  currency: { fontSize: 18, fontWeight: 'bold', color: COLORS.gray, marginRight: 8 },
  priceInput: { flex: 1, fontSize: 18, fontWeight: 'bold', color: COLORS.black },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  toggleLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.black },
  toggleSub: { fontSize: 12, color: COLORS.gray },
  switch: { width: 50, height: 28, borderRadius: 14, backgroundColor: COLORS.lightGray, padding: 2, borderWidth: 1, borderColor: '#E5E7EB' },
  switchOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  switchKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.white, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1 },
  switchKnobOn: { alignSelf: 'flex-end' },
  nextButton: { backgroundColor: COLORS.primary, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginTop: 30, marginBottom: 15 },
  disabledButton: { backgroundColor: COLORS.gray },

  nextButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  stepHeader: { marginBottom: 25 },
  stepTitle: { 
    fontSize: 22, 
    fontWeight: '600', 
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'Playfair Display' : 'serif'
  },
  stepSub: { fontSize: 14, color: COLORS.gray, marginTop: 8 },
  surveyCard: { 
    flexDirection: 'row', 
    padding: 16, 
    borderRadius: 16, 
    backgroundColor: COLORS.white, 
    marginBottom: 12, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: 'transparent'
  },
  activeSurveyCard: { borderColor: COLORS.primary, backgroundColor: COLORS.eco },
  surveyInfo: { flex: 1 },
  surveyLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.black },
  surveyDesc: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  surveyCheckbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
  surveyCheckboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  gradePreview: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: COLORS.white, 
    padding: 18, 
    borderRadius: 16, 
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1
  },
  previewLabel: { fontSize: 14, fontWeight: '600', color: COLORS.black },
  previewBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center' },
  previewGrade: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  submitButton: { backgroundColor: COLORS.secondary, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginTop: 30, marginBottom: 10 },
  submitButtonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  backLink: { marginTop: 20, alignItems: 'center' },
  backLinkText: { color: COLORS.gray, textDecorationLine: 'underline' },
  aiButton: { backgroundColor: COLORS.secondary, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginBottom: 20, flexDirection: 'row' },
  aiButtonText: { color: COLORS.white, fontSize: 14, fontWeight: 'bold' },
  aiReportCard: { 
    backgroundColor: COLORS.eco, 
    borderRadius: 16, 
    padding: 18, 
    marginVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1
  },
  aiReportHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  aiReportTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary },
  aiReportText: { fontSize: 13, color: COLORS.gray, lineHeight: 18, marginBottom: 8 },
  aiReportPrice: { fontSize: 24, fontWeight: '800', color: COLORS.primary, marginVertical: 6 },
  aiReportWarning: { fontSize: 12, fontWeight: '600', lineHeight: 16 }
});
