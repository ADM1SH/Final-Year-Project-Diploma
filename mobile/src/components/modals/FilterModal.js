import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import styles from '../../screens/main/styles/ExploreScreenStyles';

export const FilterModal = ({
  visible,
  onClose,
  locations,
  tempLocation,
  setTempLocation,
  minPriceInput,
  setMinPriceInput,
  maxPriceInput,
  setMaxPriceInput,
  onReset,
  onApply
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.locationModalContent}>
          <View style={styles.locationModalHeader}>
            <Text style={styles.locationModalTitle}>Search Filters</Text>
            <TouchableOpacity onPress={onClose} style={styles.locationModalCloseBtn}>
              <Ionicons name="close" size={22} color={COLORS.black} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.locationListScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.filterSectionTitle}>Location</Text>
            <View style={styles.locationGrid}>
              {locations.map((loc) => {
                const isSelected = tempLocation === loc;
                return (
                  <TouchableOpacity
                    key={loc}
                    style={[styles.locationChip, isSelected && styles.locationChipSelected]}
                    onPress={() => setTempLocation(loc)}
                  >
                    <Text style={[styles.locationChipText, isSelected && styles.locationChipTextSelected]}>
                      {loc}
                    </Text>
                  </TouchableOpacity> 
                );
              })}
            </View>

            <Text style={styles.filterSectionTitle}>Price Range (RM)</Text>
            <View style={styles.priceInputRow}>
              <TextInput
                style={styles.filterPriceInput}
                placeholder="Min"
                placeholderTextColor={COLORS.gray}
                keyboardType="numeric"
                value={minPriceInput}
                onChangeText={setMinPriceInput}
              />
              <Text style={{ marginHorizontal: 10, color: COLORS.black }}>to</Text>
              <TextInput
                style={styles.filterPriceInput}
                placeholder="Max"
                placeholderTextColor={COLORS.gray}
                keyboardType="numeric"
                value={maxPriceInput}
                onChangeText={setMaxPriceInput}
              />
            </View>
          </ScrollView>

          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.filterResetBtn} onPress={onReset}>
              <Text style={styles.filterResetBtnText}>Reset All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterApplyBtn} onPress={onApply}>
              <Text style={styles.filterApplyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
