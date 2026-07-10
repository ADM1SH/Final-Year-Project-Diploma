import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import AppImage from '../AppImage';
import { Ionicons } from '@expo/vector-icons';
import styles from '../../screens/main/styles/ProfileScreenStyles';
import { COLORS } from '../../utils/constants';

export const BundleCreationModal = ({
  visible, onClose, bundleName, setBundleName, bundlePrice, setBundlePrice,
  items, currentUser, selectedBundleItems, setSelectedBundleItems, onCreate
}) => {
  const toggleSelectBundleItem = (itemId) => {
    if (selectedBundleItems.includes(itemId)) {
      setSelectedBundleItems(selectedBundleItems.filter(id => id !== itemId));
    } else {
      setSelectedBundleItems([...selectedBundleItems, itemId]);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.bundleModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Bundle Deal</Text>
              <TouchableOpacity onPress={() => onClose()}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.bundleFormScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Bundle Name</Text>
              <TextInput
                style={styles.bundleInput}
                placeholder="e.g. Eco Summer Outfit Pack"
                value={bundleName}
                onChangeText={setBundleName}
              />

              <Text style={styles.inputLabel}>Discounted Bundle Price (RM)</Text>
              <TextInput
                style={styles.bundleInput}
                placeholder="e.g. 80.00"
                keyboardType="decimal-pad"
                value={bundlePrice}
                onChangeText={setBundlePrice}
              />

              <Text style={styles.inputLabel}>Select Items to Include (Select at least 2)</Text>
              {(() => {
                const myUnsoldItems = items.filter(item => {
                  const sellerId = item.seller?.id || item.seller;
                  return sellerId === currentUser?.id && !item.is_sold;
                });

                if (myUnsoldItems.length === 0) {
                  return <Text style={styles.noItemsText}>You have no unsold listings to bundle.</Text>;
                }

                return myUnsoldItems.map(item => {
                  const isSelected = selectedBundleItems.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.bundleItemSelect, isSelected && styles.bundleItemSelectActive]}
                      onPress={() => toggleSelectBundleItem(item.id)}
                    >
                      <AppImage source={{ uri: item.display_image }} style={styles.bundleItemThumbnail} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.bundleItemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.bundleItemPrice}>RM {parseFloat(item.price).toFixed(2)}</Text>
                      </View>
                      <Ionicons
                        name={isSelected ? "checkbox" : "square-outline"}
                        size={20}
                        color={isSelected ? COLORS.primary : COLORS.gray}
                      />
                    </TouchableOpacity>
                  );
                });
              })()}
            </ScrollView>

            <TouchableOpacity
              style={[styles.createBundleSubmitBtn, { backgroundColor: COLORS.primary }]}
              onPress={onCreate}
            >
              <Text style={styles.createBundleSubmitText}>Create Bundle Deal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
  );
};
