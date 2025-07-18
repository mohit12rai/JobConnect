// O:\JobConnector\mobileapp\pages\Home.js
import React from 'react'; // React core
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'; // RN components
import { useNavigation } from '@react-navigation/native'; // Navigation hook
import Header from '../components/Header'; // Reusable header
import Footer from '../components/Footer'; // Reusable footer

// Home component for mobile app
const Home = ({ isDarkMode, toggleDarkMode }) => {
  const navigation = useNavigation();

  return (
    <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      <Header title="JobConnector Mobile" toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
      <View style={styles.main}>
        <View style={[styles.card, isDarkMode ? styles.darkCard : styles.lightCard]}>
          <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>
            Welcome to Job Connector
          </Text>
         
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.seekerButton}
              onPress={() => navigation.navigate('AuthForm', { role: 'seeker' })}
            >
              <Text style={styles.buttonText}>Job Seeker</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.providerButton}
              onPress={() => navigation.navigate('AuthForm', { role: 'provider' })}
            >
              <Text style={styles.buttonText}>Job Provider</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <Footer isDarkMode={isDarkMode} />
    </View>
  );
};

// Styles adapted from Tailwind CSS
const styles = StyleSheet.create({
  container: { flex: 1 },
  lightContainer: { backgroundColor: '#F3F4F6' }, // bg-gray-100
  darkContainer: { backgroundColor: '#111827' }, // dark:bg-gray-900
  main: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }, // flex-grow, items-center, justify-center, p-4
  card: {
    padding: 24, // p-6
    borderRadius: 8, // rounded-lg
    shadowColor: '#000', // shadow-md
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '100%',
    maxWidth: 448, // max-w-md
    alignItems: 'center',
  },
  lightCard: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderWidth: 1 }, // bg-white, border-gray-200
  darkCard: { backgroundColor: '#1F2937', borderColor: '#374151', borderWidth: 1 }, // dark:bg-gray-800, dark:border-gray-700
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }, // text-3xl, font-bold, mb-4
  subtitle: { fontSize: 16, marginBottom: 24, textAlign: 'center' }, // mb-6
  buttonContainer: { width: '100%', gap: 16 }, // space-y-4
  seekerButton: { backgroundColor: '#3B82F6', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 4, alignItems: 'center' }, // bg-blue-500, p-3, rounded
  providerButton: { backgroundColor: '#10B981', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 4, alignItems: 'center' }, // bg-green-500, p-3, rounded
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }, // text-white
  lightText: { color: '#111827' }, // text-gray-900
  darkText: { color: '#F9FAFB' }, // dark:text-white
});

export default Home;