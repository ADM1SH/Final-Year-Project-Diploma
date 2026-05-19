import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GRADES } from '../utils/constants';

const GradeBadge = ({ grade, showLabel = false }) => {
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
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default GradeBadge;
