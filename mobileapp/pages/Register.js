import React, { useContext, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { requestOTP, verifyOTP, getProfile } from '../utils/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JobsContext } from '../components/context';

const Register = ({ isDarkMode, toggleDarkMode }) => {
  const navigation = useNavigation();
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [role, setRole] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [serverOtp, setServerOtp] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [buttonScale] = useState(new Animated.Value(1));
  const { userState, setUserState, globalState, setGlobalHandle, isAuthenticated, setIsAuthenticated } = useContext(JobsContext);

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleRequestOTP = async () => {
    const trimmedContact = contact.trim();

    if (!trimmedContact) {
      setMessage('Please enter a WhatsApp number or email');
      return;
    }

    if (!role) {
      setMessage('Please select a role');
      return;
    }

    try {
      const isEmail = trimmedContact.includes('@');
      const payload = isEmail
        ? { email: trimmedContact, role, loginRequest: false }
        : { whatsappNumber: trimmedContact, role, loginRequest: false };

      const response = await requestOTP(payload);

      if (response.data?.serverOtp) {
        await AsyncStorage.setItem('contact', trimmedContact);
        await AsyncStorage.setItem('role', role);

        setServerOtp(response.data.serverOtp);
        setOtpSent(true);
        setMessage(response.data.message || 'OTP sent successfully');
      } else {
        setMessage(response.data.message || 'Unable to request OTP');
      }

    } catch (error) {
      setMessage(error.response?.data?.message || 'Error sending OTP');
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
      setMessage('Please enter the OTP');
      return;
    }
    try {
      const isEmail = contact.includes('@');
      const payload = {
        ...(isEmail ? { email: contact } : { whatsappNumber: contact }),
        otp,
        serverOtp,
        role,
        bypass: false,
      };
      const response = await verifyOTP(payload);
      setMessage(response.data.message);

      if (response.data.message === 'OTP verification successful') {
        navigation.navigate(`${role === 'seeker' ? 'SeekerProfile' : 'ProviderProfile'}`, { contact, isEmail });
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error verifying OTP');
    }
  };

  const handleBypassOTP = async () => {
    const trimmedContact = contact.trim();

    if (!trimmedContact) {
      setMessage('Please enter a WhatsApp number or email');
      return;
    }

    if (!role) {
      setMessage('Please select a role');
      return;
    }

    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isValidPhone = (phone) => /^[6-9]\d{9}$/.test(phone);
    const looksLikeEmail = /[a-zA-Z]/.test(trimmedContact) || trimmedContact.includes('@') || trimmedContact.includes('.com');

    const isEmailValid = isValidEmail(trimmedContact);
    const isPhoneValid = isValidPhone(trimmedContact);

    if (!isEmailValid && !isPhoneValid) {
      setMessage(
        looksLikeEmail
          ? 'Please enter a valid email address'
          : 'Please enter a valid WhatsApp number'
      );
      return;
    }

    const isEmail = isEmailValid;

    const payload = {
      ...(isEmail ? { email: trimmedContact } : { whatsappNumber: trimmedContact }),
      otp: 'bypass',
      role,
      bypass: true,
    };

    try {
      const response = await verifyOTP(payload);

      if (response?.data?.isNewUser) {
        setMessage('New user detected. Redirecting to profile creation...');

        const { token, user } = response.data;

        if (token) await AsyncStorage.setItem('token', token);
        if (user) await AsyncStorage.setItem('user', JSON.stringify(user));
        if (role) await AsyncStorage.setItem('role', role);

        navigation.navigate(
          role === 'seeker' ? 'SeekerProfile' : 'ProviderProfile',
          { contact: trimmedContact, isEmail }
        );
      } else {
        setMessage('User found, please login.');
        setTimeout(() => {
          navigation.navigate('AuthForm', {
            role,
            contact: trimmedContact,
            isEmail,
          });
        }, 2000);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error bypassing OTP');
    }
  };

  const handlePressIn = () => {
    Animated.spring(buttonScale, { toValue: 0.95, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <LinearGradient colors={isDarkMode ? ['#1E1E2F', '#2A2A3D'] : ['#E0F7FA', '#B2EBF2']} style={styles.container}>
      <Header title="Register" toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
      <Animated.View style={[styles.main, { opacity: fadeAnim }]}>
        <View style={[styles.card, isDarkMode ? styles.darkCard : styles.lightCard]}>
          <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>Join Job Connector</Text>
          <Text style={[styles.subtitle, isDarkMode ? styles.darkText : styles.lightText]}>Start your journey as a Job Seeker or Provider</Text>

          <TextInput
            style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
            value={contact}
            onChangeText={setContact}
            placeholder="WhatsApp Number or Email"
            placeholderTextColor={isDarkMode ? '#A0AEC0' : '#718096'}
            editable={!otpSent}
          />

          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleButton, role === 'seeker' ? (isDarkMode ? styles.seekerButtonDarkActive : styles.seekerButtonLightActive) : (isDarkMode ? styles.roleButtonDark : styles.roleButtonLight)]}
              onPress={() => setRole('seeker')}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            >
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <Text style={[styles.roleButtonText, role === 'seeker' ? styles.roleButtonTextActive : (isDarkMode ? styles.roleButtonTextDark : styles.roleButtonTextLight)]}>Job Seeker</Text>
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, role === 'provider' ? (isDarkMode ? styles.providerButtonDarkActive : styles.providerButtonLightActive) : (isDarkMode ? styles.roleButtonDark : styles.roleButtonLight)]}
              onPress={() => setRole('provider')}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            >
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <Text style={[styles.roleButtonText, role === 'provider' ? styles.roleButtonTextActive : (isDarkMode ? styles.roleButtonTextDark : styles.roleButtonTextLight)]}>Job Provider</Text>
              </Animated.View>
            </TouchableOpacity>
          </View>

          {!otpSent ? (
            <View style={styles.buttonContainer}>
              {role === 'provider'  ? (
                <TouchableOpacity
                  style={[styles.submitButton, isDarkMode ? styles.darkSubmitButton : styles.lightSubmitButton]}
                  onPress={handleRequestOTP}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                >
                  <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                    <Text style={styles.submitButtonText}>With OTP</Text>
                  </Animated.View>
                </TouchableOpacity>
              ) : null}

              {(role === 'seeker' || role ==='provider' ) && (
                <TouchableOpacity
                  style={[styles.submitButton, isDarkMode ? styles.darkSubmitButton : styles.lightSubmitButton]}
                  onPress={handleBypassOTP}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                >
                  <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                    <Text style={styles.submitButtonText}>Without OTP</Text>
                  </Animated.View>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.otpContainer}>
              <TextInput
                style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
                value={otp}
                onChangeText={setOtp}
                placeholder="Enter OTP"
                placeholderTextColor={isDarkMode ? '#A0AEC0' : '#718096'}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={[styles.submitButton, styles.verifyButton]}
                onPress={handleVerifyOTP}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
              >
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <Text style={styles.submitButtonText}>Verify OTP</Text>
                </Animated.View>
              </TouchableOpacity>
            </View>
          )}

          {message ? (
            <Text style={[styles.message, isDarkMode ? styles.darkMessage : styles.lightMessage]}>{message}</Text>
          ) : null}
        </View>
      </Animated.View>
      <Footer isDarkMode={isDarkMode} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  main: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20,
  },
  card: {
    padding: 30,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    width: '95%',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  darkCard: { 
    backgroundColor: 'rgba(45, 55, 72, 0.9)', 
  },
  lightCard: { 
    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: 10,
    color: '#2D3748',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#4A5568',
  },
  darkText: { 
    color: '#E2E8F0', 
  },
  lightText: { 
    color: '#2D3748', 
  },
  input: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#F7FAFC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  lightInput: { 
    borderColor: '#CBD5E0', 
    color: '#2D3748', 
  },
  darkInput: { 
    borderColor: '#4A5568', 
    color: '#E2E8F0', 
    backgroundColor: '#2D3748', 
  },
  roleContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    width: '100%', 
    marginBottom: 20, 
    gap: 10,
  },
  roleButton: { 
    flex: 1, 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 10, 
    alignItems: 'center', 
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 2,
  },
  // Unselected button styles
  roleButtonLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E0',
  },
  roleButtonDark: {
    backgroundColor: '#2D3748',
    borderColor: '#4A5568',
  },
  // Selected button styles
  seekerButtonLightActive: { 
    backgroundColor: '#3182CE',
    borderColor: '#3182CE',
  },
  seekerButtonDarkActive: { 
    backgroundColor: '#4299E1',
    borderColor: '#4299E1',
  },
  providerButtonLightActive: { 
    backgroundColor: '#38A169',
    borderColor: '#38A169',
  },
  providerButtonDarkActive: { 
    backgroundColor: '#48BB78',
    borderColor: '#48BB78',
  },
  // Text styles
  roleButtonText: {
    fontSize: 16, 
    fontWeight: '600',
  },
  roleButtonTextLight: {
    color: '#4A5568', // Dark gray for light mode unselected
  },
  roleButtonTextDark: {
    color: '#A0AEC0', // Light gray for dark mode unselected
  },
  roleButtonTextActive: {
    color: '#FFFFFF', // White for selected buttons
  },
  buttonContainer: { 
    width: '100%', 
    gap: 15, 
  },
  otpContainer: { 
    width: '100%', 
    gap: 15, 
  },
  submitButton: { 
    paddingVertical: 14, 
    paddingHorizontal: 20, 
    borderRadius: 10, 
    alignItems: 'center', 
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  lightSubmitButton: { 
    backgroundColor: '#3182CE', 
  },
  darkSubmitButton: { 
    backgroundColor: '#4299E1', 
  },
  verifyButton: { 
    backgroundColor: '#38A169', 
  },
  bypassButton: { 
    backgroundColor: '#718096', 
  },
  submitButtonText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: 'bold', 
  },
  message: { 
    marginTop: 15, 
    textAlign: 'center', 
    fontSize: 21, 
    padding: 10, 
    borderRadius: 5, 
    backgroundColor: 'rgba(255, 255, 255, 0.8)', 
  },
  lightMessage: { 
    color: '#2D3748', 
  },
  darkMessage: { 
    color: '#E2E8F0', 
    backgroundColor: 'rgba(45, 55, 72, 0.8)', 
  },
});

export default Register;