import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GRADES } from '../utils/constants';

const GradeBadge = ({ grade, showLabel = false }) => {
  const config = GRADES[grade] || GRADES.A;

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>
        {showLabel ? config.label : `GRADE ${grade}`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#064E3B',
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

export default GradeBadge;
