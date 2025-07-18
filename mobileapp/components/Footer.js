// mobileapp/components/Footer.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Footer = ({ isDarkMode }) => (
  <View style={[styles.footer, isDarkMode ? styles.darkFooter : styles.lightFooter]}>
    <Text style={[styles.text, isDarkMode ? styles.darkText : styles.lightText]}>
      Copyrighted by Optico Solutions @ 2025
    </Text>
  </View>
);

const styles = StyleSheet.create({
  footer: { padding: 10, alignItems: 'center' },
  lightFooter: { backgroundColor: '#f0f0f0' },
  darkFooter: { backgroundColor: '#222' },
  text: { fontSize: 14 },
  lightText: { color: 'gray' },
  darkText: { color: '#bbb' },
});

export default Footer;