import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { GRADES } from '../utils/constants';

const GradeBadge = ({ grade, showLabel = false }) => {
    // Fall back to grade A config if the supplied grade is not recognised.
    const config = GRADES[grade] || GRADES.A;

    return (
        <View style={[styles.badge, { backgroundColor: config.bg }]}>
            <Text style={[styles.text, { color: config.color }]}>
                {showLabel ? config.label : `GRADE ${grade}`}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    text: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
        fontFamily: Platform.OS === 'ios' ? 'Plus Jakarta Sans' : 'PlusJakartaSans-Bold',
    },
});

// Pure display component — only re-render when grade or showLabel changes.
export default React.memo(GradeBadge);
