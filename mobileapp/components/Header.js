import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Header = ({ title, toggleDarkMode, isDarkMode }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const shineAnim = useRef(new Animated.Value(1)).current;
  const [modalVisible, setModalVisible] = useState(false);

  const hideBackArrowOnScreens = ['SeekerDashboard', 'ProviderDashboard', 'AdminDashboard'];
  const showBackButton = navigation.canGoBack() && !hideBackArrowOnScreens.includes(route.name);

  const handleToggle = () => {
    Animated.sequence([
      Animated.timing(shineAnim, {
        toValue: 1.5,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shineAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    toggleDarkMode();
  };

  const handleLogout = async () => {
    setModalVisible(false);
    try {
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
      navigation.reset({
        index: 0,
        routes: [{ name: 'JobsList' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleMyProfile = () => {
    setModalVisible(false);
    navigation.navigate('MyProfile');
  };

  const handleEditProfile = () => {
    setModalVisible(false);
    if (route.name === 'SeekerDashboard') {
      navigation.navigate('SeekerProfile', { user: route.params?.user });
    } else if (route.name === 'ProviderDashboard') {
      navigation.navigate('ProviderProfile', { user: route.params?.user });
    } else if (route.name === 'AdminDashboard') {
      navigation.navigate('AdminProfile', { user: route.params?.user });
    }
  };

  const handleSettingsPress = () => {
    if (
      ['SeekerDashboard', 'ProviderDashboard', 'AdminDashboard', 'JobResultsScreen', 'MyProfile'].includes(route.name)
    ) {
      setModalVisible(true);
    } else {
      navigation.navigate('AuthForm', { role: 'admin' });
    }
  };

  return (
    <View style={[styles.header, isDarkMode ? styles.darkHeader : styles.lightHeader]}>
      {showBackButton && (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={isDarkMode ? '#ddd' : '#fff'} />
        </TouchableOpacity>
      )}
      <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>
        {title || 'JobConnector'}
      </Text>

      <View style={styles.rightContainer}>
        <TouchableOpacity
          onPress={handleToggle}
          style={[
            styles.modeButton,
            isDarkMode ? styles.darkModeButton : styles.lightModeButton,
          ]}
        >
          <Animated.View style={{ transform: [{ scale: shineAnim }] }}>
            <View style={styles.bulbContainer}>
              <Icon
                name={isDarkMode ? 'lightbulb-outline' : 'lightbulb'}
                size={24}
                color={isDarkMode ? '#ddd' : '#ffd700'}
              />
              {!isDarkMode && (
                <Icon
                  name="flare"
                  size={30}
                  color="rgba(255, 215, 0, 0.5)"
                  style={styles.rays}
                />
              )}
            </View>
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSettingsPress} style={styles.settingsButton}>
          <Icon name="settings" size={24} color={isDarkMode ? '#ddd' : '#fff'} />
        </TouchableOpacity>
      </View>

      {/* Dropdown Modal */}
      {['SeekerDashboard', 'ProviderDashboard', 'AdminDashboard', 'JobResultsScreen', 'MyProfile'].includes(route.name) && (
        <Modal visible={modalVisible} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => setModalVisible(false)}
          >
            <View style={styles.modalContent}>
              {route.name !== 'MyProfile' && (
                <TouchableOpacity style={styles.option} onPress={handleMyProfile}>
                  <Text style={styles.optionText}>My Profile</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.option} onPress={handleLogout}>
                <Text style={styles.optionText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};



// Add your styles object below if needed.


const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    paddingTop: 40,
    borderBottomWidth: 1,
  },
  lightHeader: {
    backgroundColor: '#007AFF',
    borderBottomColor: '#005BB5',
  },
  darkHeader: {
    backgroundColor: '#333',
    borderBottomColor: '#555',
  },
  backButton: {
    padding: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeButton: {
    padding: 8,
    borderWidth: 2,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightModeButton: {
    borderColor: '#fff',
  },
  darkModeButton: {
    borderColor: '#ffd700',
  },
  settingsButton: {
    padding: 10,
    marginLeft: 5,
  },
  lightText: {
    color: '#fff',
  },
  darkText: {
    color: '#ddd',
  },
  bulbContainer: {
    position: 'relative',
  },
  rays: {
    position: 'absolute',
    top: -3,
    left: -3,
    zIndex: -1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    width: 200,
  },
  option: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  optionText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default Header;

















