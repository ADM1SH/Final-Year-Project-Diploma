import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';

// Border colour extracted as a constant so it is not an anonymous string literal
// re-evaluated on every render.
const ECO_BORDER_COLOR = '#D1FAE5';

const EcoMetric = ({ value, label = 'CO2 saved' }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>
                {value} {label}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.eco,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginTop: 4,
        borderWidth: 1,
        borderColor: ECO_BORDER_COLOR,
    },
    text: {
        color: COLORS.ecoText,
        fontSize: 10,
        fontWeight: 'bold',
    },
});

// Pure display component — memoised so FlatList items don't re-render it
// unnecessarily when an unrelated ancestor updates.
export default React.memo(EcoMetric);
