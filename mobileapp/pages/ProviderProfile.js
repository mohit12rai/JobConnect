// O:\JobConnector\mobileapp\pages\ProviderProfile.js
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, ScrollView } from 'react-native'; // Added ScrollView
import { useNavigation } from '@react-navigation/native';
import { createProviderProfile, updateProviderProfile } from '../utils/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { JobsContext } from '../components/context';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import messaging from '@react-native-firebase/messaging';


const ProviderProfile = ({ isDarkMode, toggleDarkMode, route }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    hrName: '',
    hrWhatsappNumber: route?.params?.contact && !route?.params?.isEmail ? route.params.contact : '',
    email: route?.params?.contact && route?.params?.isEmail ? route.params.contact : '',
  });
  const [message, setMessage] = useState('');
  const [profileCreated, setProfileCreated] = useState(false);
  const [isEditMode, setIsEditMode] = useState(!!route?.params?.user);
  const navigation = useNavigation();
  const [submitScale] = useState(new Animated.Value(1));
  const [dashboardScale] = useState(new Animated.Value(1));
  const { setUserState, setIsAuthenticated } = useContext(JobsContext);

   useEffect(() => {
    const getFcmToken = async () => {
      const token = await messaging().getToken();
      console.log('Provider FCM Token:', token);

      // ✅ Save this token to your backend
      await axios.post('https://your-backend-url/api/provider/save-fcm-token', {
        fcmToken: token,
        providerId: providerId // or use auth token in headers
      });
    };

    getFcmToken();
  }, []);

  useEffect(() => {
    if (isEditMode && route?.params?.user) {
      setFormData({
        companyName: route.params.user.companyName || '',
        hrName: route.params.user.hrName || '',
        hrWhatsappNumber: route.params.user.hrWhatsappNumber || '',
        email: route.params.user.email || '',
      });
    }
  }, [route, isEditMode]);

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitProfile = async () => {
    if (!formData.companyName || !formData.hrName) {
      setMessage('Please fill in company name and HR name');
      return;
    }
  
    try {
      let response;
      if (isEditMode) {
        response = await updateProviderProfile({ 
          ...formData, 
          _id: route.params.user._id 
        });
        await AsyncStorage.setItem("user", JSON.stringify(response.data.user));
        setUserState(response.data.user || null);
      } else {
        response = await createProviderProfile(formData);
        await AsyncStorage.setItem("user", JSON.stringify(response.data.user));
        setUserState(response.data.user || null);
      }
  
      setMessage(response.data.message);
      
      // Navigate to ProviderDashboard after successful submission
      navigation.navigate('ProviderDashboard', { 
        user: response.data.user || { // Use API response or fallback to form data
          ...formData,
          _id: isEditMode ? route.params.user._id : response.data.user?._id
        }
      });
  
    } catch (error) {
      setMessage('Error saving profile: ' + (error.response?.data?.message || error.message));
    }
  };

  const handlePressIn = (scale) => { Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start(); };
  const handlePressOut = (scale) => { Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start(); };

  return (
    <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      <Header title={isEditMode ? "Edit Provider Profile" : "Create Provider Profile"} toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>
            {isEditMode ? "Update Your Profile" : "Set Up Your Provider Profile"}
          </Text>
          {!profileCreated ? (
           <View>
          
           <Text style={[ !isDarkMode ? styles.label : styles.lightLabel]}>HR Name</Text>
           <TextInput
             style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
             value={formData.hrName}
             onChangeText={(text) => handleChange('hrName', text)}
             placeholder="HR Name"
             placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
           />
           
           <Text style={[ !isDarkMode ? styles.label : styles.lightLabel]}>Company Name</Text>
           <TextInput
             style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
             value={formData.companyName}
             onChangeText={(text) => handleChange('companyName', text)}
             placeholder="Company Name"
             placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
           />
         
           <Text style={[ !isDarkMode ? styles.label : styles.lightLabel]}>HR WhatsApp Number</Text>
           <TextInput
             style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
             value={formData.hrWhatsappNumber}
             onChangeText={(text) => handleChange('hrWhatsappNumber', text)}
             placeholder="HR WhatsApp Number"
             placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
           />
         
           <Text style={[ !isDarkMode ? styles.label : styles.lightLabel]}>Email</Text>
           <TextInput
             style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
             value={formData.email}
             onChangeText={(text) => handleChange('email', text)}
             placeholder="Email"
             placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
           />
         
           <TouchableOpacity
             style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
             onPress={handleSubmitProfile}
             onPressIn={() => handlePressIn(submitScale)}
             onPressOut={() => handlePressOut(submitScale)}
             activeOpacity={0.8}
           >
             <Animated.View style={[styles.buttonInner, { transform: [{ scale: submitScale }] }]}>
               <Text style={styles.buttonText}>Save Profile</Text>
             </Animated.View>
           </TouchableOpacity>
         </View>
         
          ) : (
            <TouchableOpacity
              style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
              onPress={handleGoToDashboard}
              onPressIn={() => handlePressIn(dashboardScale)}
              onPressOut={() => handlePressOut(dashboardScale)}
              activeOpacity={0.8}
            >
              <Animated.View style={[styles.buttonInner, { transform: [{ scale: dashboardScale }] }]}>
                <Text style={styles.buttonText}>Go to Dashboard</Text>
              </Animated.View>
            </TouchableOpacity>
          )}
          {message && <Text style={[styles.message, isDarkMode ? styles.darkText : styles.lightText]}>{message}</Text>}
        </View>
      </ScrollView>
      <Footer isDarkMode={isDarkMode} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightContainer: { backgroundColor: '#fff' },
  darkContainer: { backgroundColor: '#111' },
  scrollContent: { paddingBottom: 60, flexGrow: 1 }, // Updated for scrolling
  content: { padding: 10, flexGrow: 1 }, // Updated for scrolling
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
  lightInput: { borderColor: '#ccc', color: '#000' },
  darkInput: { borderColor: '#555', color: '#ddd', backgroundColor: '#333' },
  button: { paddingVertical: 15, paddingHorizontal: 30, borderRadius: 25, alignItems: 'center', marginBottom: 10 },
  lightButton: { backgroundColor: '#007AFF' },
  darkButton: { backgroundColor: '#005BB5' },
  buttonInner: { padding: 5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  message: { marginTop: 10, textAlign: 'center' },
  lightText: { color: '#000' },
  darkText: { color: '#ddd' },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  lightLabel:{
    fontSize: 16,
    fontWeight: 'white',
    color: '#fff',
    marginBottom: 5,
  }
});

export default ProviderProfile;