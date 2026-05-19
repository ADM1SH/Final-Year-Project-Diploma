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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  text: {
    color: COLORS.ecoText,
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default EcoMetric;
