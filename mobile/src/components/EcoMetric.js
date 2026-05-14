import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';

const EcoMetric = ({ value, label = "CO2 saved" }) => {
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  text: {
    color: COLORS.ecoText,
    fontSize: 10,
    fontWeight: '600',
  },
});

export default EcoMetric;
