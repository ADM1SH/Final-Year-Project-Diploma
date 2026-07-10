import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

// Moved outside the component so it is not recreated on every render.
const resolveIcon = (name, explicitIcon) => {
    if (explicitIcon) return explicitIcon;
    switch (name.toLowerCase()) {
        case 'men':   return 'man';
        case 'women': return 'woman';
        case 'tech':  return 'laptop-outline';
        case 'books': return 'book-outline';
        case 'all':   return 'grid-outline';
        default:      return 'ellipsis-horizontal';
    }
};

const CategoryChip = ({ name, icon, active, onPress }) => {
    const resolvedIcon = resolveIcon(name, icon);

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.iconCircle, active && styles.activeCircle]}>
                <Ionicons
                    name={resolvedIcon}
                    size={24}
                    color={active ? COLORS.primary : COLORS.gray}
                />
            </View>
            <Text style={[styles.text, active && styles.activeText]}>
                {name}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginRight: 20,
        width: 60,
    },
    iconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.lightGray,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    activeCircle: {
        backgroundColor: COLORS.primary + '20',
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    text: {
        fontSize: 12,
        color: COLORS.gray,
        fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'PlusJakartaSans-Medium',
    },
    activeText: {
        color: COLORS.black,
        fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'PlusJakartaSans-Bold',
    },
});

// Re-render only when the active state, name, icon, or onPress handler changes.
export default React.memo(CategoryChip);
