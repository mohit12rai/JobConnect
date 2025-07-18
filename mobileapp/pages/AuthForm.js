import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JobsContext } from '../components/context';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { requestOTP, verifyOTP } from '../utils/api';

export default function AuthForm({ isDarkMode, toggleDarkMode, route }) {
  const [contact, setContact] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState('');
  const [serverOtp, setServerOtp] = useState('');
  const navigation = useNavigation();
  const { role } = route.params || {};
  const [requestScale] = useState(new Animated.Value(1));
  const [verifyScale] = useState(new Animated.Value(1));
  const [bypassScale] = useState(new Animated.Value(1));
  const { setUserState, setIsAuthenticated } = useContext(JobsContext);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPhone = (phone) => /^[6-9]\d{9}$/.test(phone);
  const isContactValid = isValidEmail(contact.trim()) || isValidPhone(contact.trim());

  const handleRequestOTP = async () => {
    const trimmedContact = contact.trim();

    if (!trimmedContact) {
      setMessage('Please enter a WhatsApp number or email');
      return;
    }

    const isEmailValid = isValidEmail(trimmedContact);
    const isPhoneValid = isValidPhone(trimmedContact);

    if (!isEmailValid && !isPhoneValid) {
      setMessage(
        trimmedContact.includes('@')
          ? 'Please enter a valid email address'
          : 'Please enter a valid 10-digit WhatsApp number'
      );
      return;
    }

    if (!role) {
      setMessage('Role not specified');
      return;
    }

    const payload = isEmailValid
      ? { email: trimmedContact, role, loginRequest: true }
      : { whatsappNumber: trimmedContact, role, loginRequest: true };

    try {
      const response = await requestOTP(payload);

      if (response.data?.serverOtp) {
        await AsyncStorage.setItem('contact', trimmedContact);
        await AsyncStorage.setItem('role', role);

        setOtpSent(true);
        setServerOtp(response.data.serverOtp);
        setMessage(response.data.message || 'OTP sent successfully');
      } else {
        setMessage(response.data.message || 'Unable to request OTP');
      }

    } catch (error) {
      setMessage(error.response?.data?.message || 'Error requesting OTP');
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) return setMessage('Please enter the OTP');

    try {
      const isEmail = contact.includes('@');
      const payload = {
        ...(isEmail ? { email: contact } : { whatsappNumber: contact }),
        otp,
        role,
        bypass: false,
        serverOtp,
      };

      const response = await verifyOTP(payload);
      setMessage(response.data.message);

      if (!response.data.success) return;

      if (response.data.isNewUser) {
        if (role === 'admin') {
          setMessage('Admin not found. please Enter Correct Email or Number');
          return;
        }
        navigation.navigate('Register', { contact, role });
        return;
      }

      navigation.navigate(
        role === 'seeker'
          ? 'SeekerDashboard'
          : role === 'provider'
          ? 'ProviderDashboard'
          : 'AdminDashboard',
        { user: response.data.user, contact }
      );
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

    const isEmailValid = isValidEmail(trimmedContact);
    const isPhoneValid = isValidPhone(trimmedContact);

    const looksLikeEmail =
      /[a-zA-Z]/.test(trimmedContact) ||
      trimmedContact.includes('@') ||
      trimmedContact.includes('.com');

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
      ...(isEmail
        ? { email: trimmedContact }
        : { whatsappNumber: trimmedContact }),
      otp: 'bypass',
      role,
      bypass: true,
    };

    try {
      const response = await verifyOTP(payload);

      if (!response?.data?.success) {
        return setMessage(
          response?.data?.message || 'User not found or invalid login'
        );
      }

      if (response.data.isNewUser) {
        if (role === 'admin') {
          setMessage('Admin not found. Please enter correct email or number.');
          return;
        }
        navigation.navigate('Register', {
          contact: trimmedContact,
          role,
        });
        return;
      }

      setMessage(response.data.message);

      const { token, user } = response.data;

      if (token && user) {
        await AsyncStorage.setItem('user', JSON.stringify(user));
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('role', role);

        setUserState(user);
        setIsAuthenticated(true);

        navigation.navigate(
          role === 'seeker'
            ? 'SeekerDashboard'
            : role === 'provider'
            ? 'ProviderDashboard'
            : 'AdminDashboard',
          {
            user,
            contact: trimmedContact,
          }
        );
      } else {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        setMessage('Login failed. Please try again.');
      }
    } catch (error) {
      setMessage('Error bypassing OTP: ' + error.message);
    }
  };

  const handlePressIn = (scale) => {
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  };

  const handlePressOut = (scale) => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Login" toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />

      <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
        <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>
          Login as {role === 'seeker' ? 'Job Seeker' : role === 'provider' ? 'Job Provider' : 'Admin'}
        </Text>

        <TextInput
          style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
          value={contact}
          onChangeText={setContact}
          placeholder="WhatsApp number or email"
          placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
          editable={!otpSent}
        />

        {otpSent ? (
          <>
            <TextInput
              style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter OTP"
              placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
              onPress={handleVerifyOTP}
              onPressIn={() => handlePressIn(verifyScale)}
              onPressOut={() => handlePressOut(verifyScale)}
              activeOpacity={0.8}
            >
              <Animated.View style={[styles.buttonInner, { transform: [{ scale: verifyScale }] }]}>
                <Text style={styles.buttonText}>Verify OTP</Text>
              </Animated.View>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {(role === 'provider' || role === 'admin') && (
              <TouchableOpacity
                style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton, { opacity: isContactValid ? 1 : 1 }]}
                onPress={handleRequestOTP}
                onPressIn={() => handlePressIn(requestScale)}
                onPressOut={() => handlePressOut(requestScale)}
                activeOpacity={0.8}
                disabled={!isContactValid}
              >
                <Animated.View style={[styles.buttonInner, { transform: [{ scale: requestScale }] }]}>
                  <Text style={styles.buttonText}>With OTP</Text>
                </Animated.View>
              </TouchableOpacity>
            )}

            {(role === 'seeker' ||  role === 'admin' || role ==='provider') && (
              <TouchableOpacity
                style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
                onPress={handleBypassOTP}
                onPressIn={() => handlePressIn(bypassScale)}
                onPressOut={() => handlePressOut(bypassScale)}
                activeOpacity={0.8}
              >
                <Animated.View style={[styles.buttonInner, { transform: [{ scale: bypassScale }] }]}>
                  <Text style={styles.buttonText}>Without OTP</Text>
                </Animated.View>
              </TouchableOpacity>
            )}
          </>
        )}

        {message && (
          <Text style={[styles.message, isDarkMode ? styles.darkText : styles.lightText]}>
            {message}
          </Text>
        )}

        {(role === 'seeker' || role === 'provider') && (
          <TouchableOpacity onPress={() => navigation.navigate('Register', { contact, role })}>
            <Text style={[styles.link, isDarkMode ? styles.darkText : styles.lightText]}>
              New user? Register here
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Footer isDarkMode={isDarkMode} />
    </View>
  );
}


// Styles
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  lightContainer: { backgroundColor: '#fff' },
  darkContainer: { backgroundColor: '#111' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, padding: 10, marginBottom: 20, borderRadius: 5 },
  lightInput: { borderColor: '#ccc', color: '#000' },
  darkInput: { borderColor: '#555', color: '#ddd', backgroundColor: '#333' },
  button: { paddingVertical: 15, paddingHorizontal: 30, borderRadius: 25, alignItems: 'center', marginBottom: 10  ,backgroundColor: '#718096'},
  lightButton: { backgroundColor: '#007AFF' },
  darkButton: { backgroundColor: '#005BB5' },
  buttonInner: { padding: 5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  message: { marginVertical: 10, textAlign: 'center' ,fontSize: 21, backgroundColor: 'rgba(255, 255, 255, 0.8)' },
  link: { textAlign: 'center', marginTop: 20 },
  lightText: { color: '#000' },
  darkText: { color: '#ddd' }
});