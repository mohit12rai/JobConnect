import React, { useEffect, useState, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Alert,
  ScrollView,
  TouchableOpacity, // ✅ added
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getProfile } from '../utils/api';
import { JobsContext } from '../components/context';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function MyProfile({ isDarkMode, toggleDarkMode }) {
  const navigation = useNavigation();
  const route = useRoute();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { userState, setUserState } = useContext(JobsContext);
  const [user, setUser] = useState(userState);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        let currentUser = user;

        const storedRole = await AsyncStorage.getItem('role');
        if (storedRole) setRole(storedRole);

        if (!currentUser) {
          const storedUser = await AsyncStorage.getItem('user');
          if (storedUser) {
            currentUser = JSON.parse(storedUser);
            setUser(currentUser);
            setUserState(currentUser);
          }
        }
         await fetchAndSetUser(); 
        if (!currentUser && route?.params?.contact) {
          const isEmail = route.params.contact.includes('@');
          const profileRes = await getProfile({
            role: storedRole || 'provider',
            ...(isEmail
              ? { email: route.params.contact }
              : { whatsappNumber: route.params.contact }),
          });
          currentUser = profileRes.data;
          setUser(currentUser);
          setUserState(currentUser);

          await AsyncStorage.setItem(
            'user',
            JSON.stringify({ ...currentUser, role: storedRole || 'provider' })
          );
        }

        if (!currentUser) {
          navigation.navigate('JobsList');
          return;
        }

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      } catch (error) {
        console.error('Profile Load Error:', error);
        Alert.alert('Error', 'Unable to load profile.');
        navigation.navigate('JobsList');
      }
    };

    init();
     const unsubscribe = navigation.addListener('focus', async () => {
    console.log('Screen focused, refreshing user profile...');
    await fetchAndSetUser();
  });

  return unsubscribe;
  }, [route, navigation]);

//    useEffect(() => {
//   const init = async () => {
//     console.log("init called");

//     try {
//       const storedUser = await AsyncStorage.getItem('user');

//       if (storedUser) {
//         const parsedUser = JSON.parse(storedUser);
//         setUser(parsedUser);
//         setAppliedJobs(parsedUser.appliedJobs || []);
//         await fetchData(parsedUser);
//       } else {
//         if (!route?.params?.contact) {
//           navigation.navigate('JobsList');
//           return;
//         }

//         await fetchAndSetUser();
//       }
//     } catch (error) {
//       console.error('Initialization error:', error);
//       navigation.navigate('AuthForm', { role: 'seeker' });
//     }
//   };

//   init();

//   const unsubscribe = navigation.addListener('focus', async () => {
//     console.log('Screen focused, refreshing user profile...');
//     await fetchAndSetUser();
//   });

//   return unsubscribe;
// }, [route, navigation]);

const fetchAndSetUser = async () => {
  console.log("Fetching updated profile...");

  try {
    const isEmail = route.params.contact.includes('@');
    const response = await getProfile({
      role: 'seeker',
      ...(isEmail
        ? { email: route.params.contact }
        : { whatsappNumber: route.params.contact }),
    });

    const fetchedUser = response.data || {};
    setUser(fetchedUser);
    setAppliedJobs(fetchedUser.appliedJobs || []);
    await AsyncStorage.setItem('user', JSON.stringify({ ...fetchedUser, role: 'seeker' }));
    await fetchData(fetchedUser);
  } catch (error) {
    console.error('Fetch profile error:', error);
  }
};


  if (!user || !role) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading profile...</Text>
      </View>
    );
  }

 const handleEditProfile = () => {
  if (role === 'seeker') {
    navigation.navigate('SeekerProfile', { user, isEditMode: true });
  } else if (role === 'provider') {
    navigation.navigate('ProviderProfile', { user, isEditMode: true });
  }
};


  return (
    <View style={{ flex: 1 }}>
      <Header
        title="My Profile"
        toggleDarkMode={toggleDarkMode}
        isDarkMode={isDarkMode}
      />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          {/* ✅ Edit Button */}
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <Icon name="edit" size={18} color="#007AFF" />
    <Text style={{ marginLeft: 4, color: '#007AFF', fontWeight: 'bold' }}>Edit</Text>
  </View>
</TouchableOpacity>

          <Text style={styles.heading}>Your Profile</Text>

          {role === 'seeker' ? (
            <>
              <ProfileItem icon="person" label="Name" value={user.fullName} />
              <ProfileItem icon="email" label="Email" value={user.email} />
              <ProfileItem icon="phone" label="WhatsApp" value={user.whatsappNumber} />
              {user.skills && (
                <ProfileItem icon="star" label="Job Names" value={user.skills.join(', ')} />
              )}
              {user.experience && (
                <ProfileItem icon="work" label="Experience" value={user.experience} />
              )}
              {user.location && (
                <ProfileItem icon="location-on" label="Location" value={user.location} />
              )}
            </>
          ) : (
            <>
              <ProfileItem icon="person" label="Name" value={user.hrName} />
              <ProfileItem icon="business" label="CompanyName" value={user.companyName} />
              <ProfileItem icon="email" label="Email" value={user.email} />
              <ProfileItem icon="phone" label="WhatsApp" value={user.hrWhatsappNumber} />
            </>
          )}
        </Animated.View>
      </ScrollView>
      <Footer isDarkMode={isDarkMode} />
    </View>
  );
}

function ProfileItem({ icon, label, value }) {
  return (
    <View style={styles.row}>
      <Icon name={icon} size={20} color="#444" style={styles.icon} />
      <Text style={styles.valueText}>
        {label && <Text style={styles.label}>{label}: </Text>}
        {value || '-'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    position: 'relative', // Required for edit button positioning
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  icon: {
    width: 24,
  },
  valueText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 5,
  },
  loading: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  label: {
    fontWeight: '600',
    color: '#000',
  },

  // ✅ Edit Button Style
 editButton: {
  position: 'absolute',
  top: 12,
  right: 12,
  padding: 6,
  borderRadius: 6,
  backgroundColor: '#e0e0e0',
  zIndex: 10,
},

});