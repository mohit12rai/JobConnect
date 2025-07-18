import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  Linking,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons, FontAwesome, Ionicons } from '@expo/vector-icons';
import { getProfile, postJob, searchJobs, getApplicants, updateJob, deleteJob, changeJobAvailibility, searchSeekers } from '../utils/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNPickerSelect from 'react-native-picker-select';
import * as Animatable from 'react-native-animatable';
import Toast from 'react-native-toast-message';
import { Picker } from '@react-native-picker/picker';

const { width, height } = Dimensions.get('window');

export default function ProviderDashboard({ isDarkMode, toggleDarkMode, route }) {
  // State initialization with proper default values
  const [user, setUser] = useState(route?.params?.user || null);
  const [skills, setSkills] = useState('');
  const [experienceRequired, setExperienceRequired] = useState('');
  const [showSeekerProfileModal, setShowSeekerProfileModal] = useState(false);
  const [location, setLocation] = useState('');
  const [maxCTC, setMaxCTC] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('');
  const [seekerQuery, setSeekerQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [seekers, setSeekers] = useState([]);
  const [postedJobs, setPostedJobs] = useState([]);
  const [selectedJobForDelete, setSelectedJobForDelete] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [showDeleteJobModal, setShowDeleteJobModal] = useState(false);
  const [selectedSeekerId, setSelectedSeekerId] = useState(null);
  const [selectedJobForEdit, setSelectedJobForEdit] = useState(null);
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [jobFilter, setJobFilter] = useState('Active');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedJob, setSelectedJob] = useState('');
  const [isLoading, setIsLoading] = useState(true);
 const  [companyName,setcompanyName]=useState('')
//  const  [hrName,sethrName]=useState('')

  const user1 = route?.params?.user;
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  console.log("provider",user)
  useEffect(() => {
    if (selectedJobId && postedJobs.length > 0) {
      const job = postedJobs.find(job => job._id.toString() === selectedJobId);
      setSelectedJob(job);
    }
  }, [selectedJobId, postedJobs]);

  const handleSearchPress = async () => {
    const role = await AsyncStorage.getItem('role');
    if (role === 'provider') {
      navigation.navigate('JobResultsScreen', { role: 'provider' });
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        let currentUser = user;

        if (!currentUser) {
          const storedUser = await AsyncStorage.getItem('user');
          if (storedUser) {
            console.log("storeduser=",storedUser)
            setcompanyName(storedUser.companyName)
            // sethrName(storedUser.hrName)

            currentUser = JSON.parse(storedUser);
            setUser(currentUser);
          }
        }

        if (!currentUser && route?.params?.contact) {
          const isEmail = route.params.contact.includes('@');
          const response = await getProfile({
            role: 'provider',
            ...(isEmail
              ? { email: route.params.contact }
              : { whatsappNumber: route.params.contact }),
          });
          currentUser = response.data;
          setUser(currentUser);
          console.log("user=",user)
          await AsyncStorage.setItem('user', JSON.stringify({ ...currentUser, role: 'provider' }));
        }

        if (!currentUser) {
          navigation.navigate('JobsList');
          return;
        }

        await fetchData(currentUser);

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      } catch (error) {
        console.error('Init error:', error);
        navigation.navigate('JobsList');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [route, navigation]);

  const fetchData = async (currentUser) => {
    try {
      const jobsResponse = await searchJobs({ postedBy: currentUser._id });
      console.log("jobsResponse",jobsResponse.data)
      setPostedJobs(jobsResponse.data || []);

      const applicantsResponse = await getApplicants(currentUser._id);
      setApplicants(applicantsResponse.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch data: ' + error.message);
    }
  };

  const handlePostJob = async () => {
    try {
      const jobData = {
        skills: skills.split(',').map(s => s.trim()),
        experienceRequired: parseInt(experienceRequired) || 0,
        location,
        maxCTC: parseInt(maxCTC) || 0,
        noticePeriod,
        postedBy: { _id: user?._id },
      };

      const response = await postJob(jobData);
      Alert.alert('Success', 'Job posted successfully');
      setSkills('');
      setExperienceRequired('');
      setLocation('');
      setMaxCTC('');
      setNoticePeriod('');
      setShowPostJobModal(false);
      fetchData(user);
    } catch (error) {
      Alert.alert('Error', 'Failed to post job: ' + error.message);
    }
  };

  const handleUpdateJob = async () => {
    if (!selectedJobForEdit) {
      Toast.show({
        type: 'error',
        text1: 'No job selected for editing',
      });
      return;
    }

    try {
      const jobData = {
        skills: skills.split(',').map(s => s.trim()),
        experienceRequired: parseInt(experienceRequired) || 0,
        location,
        maxCTC: parseInt(maxCTC) || 0,
        noticePeriod,
        postedBy: user?._id,
        _id: selectedJobForEdit._id,
      };

      const response = await updateJob(jobData);
      Toast.show({
        type: 'success',
        text1: 'Job updated successfully',
      });
      setSkills('');
      setExperienceRequired('');
      setLocation('');
      setMaxCTC('');
      setNoticePeriod('');
      setSelectedJobForEdit(null);
      fetchData(user);
    } catch (error) {
      Alert.alert('Error', 'Failed to update job: ' + error.message);
    }
  };

  const handleDeleteJob = async (jobId) => {
    try {
      await deleteJob({ jobId });
      Alert.alert('Success', 'Job deleted successfully');
      setShowDeleteJobModal(false);
      fetchData(user);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete job: ' + error.message);
    }
  };

  const handleViewApplicants = async (jobId) => {
    try {
      const providerId = user?._id;
      const response = await getApplicants(providerId, jobId);
      setApplicants(response.data || []);
      setSelectedJobId(jobId);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch applicants: ' + error.message);
    }
  };

  const handleViewSeekerProfile = (seekerId) => {
    if (!seekerId) {
      Alert.alert('Error', 'No seeker selected');
      return;
    }
    setSelectedJobId(null);
    setSelectedSeekerId(seekerId);
    setShowSeekerProfileModal(true);
  };

  const handleEditJob = (job) => {
    if (!job) return;
    setSelectedJobForEdit(job);
    setSkills((job.skills || []).join(', '));
    setExperienceRequired(job.experienceRequired?.toString() || '');
    setLocation(job.location || '');
    setMaxCTC(job.maxCTC?.toString() || '');
    setNoticePeriod(job.noticePeriod || '');
  };

  const handleCloseSeekerProfileModal = () => {
    setShowSeekerProfileModal(false);
    setSelectedSeekerId(null);
  };

 const handleWhatsAppConnect = (number, seekerName, companyName,hrName,maxCTC,location ,skills) => {
  if (!number) {
    Alert.alert('Error', 'Phone number is missing');
    return;
  }

  // Remove non-digit characters
  let cleanedNumber = number.replace(/\D/g, '');

  // Add country code if missing (assuming India +91)
  if (!cleanedNumber.startsWith('91')) {
    cleanedNumber = '91' + cleanedNumber;
  }

const defaultMessage = `Hello ${seekerName},\n\nI hope you're doing well!\n\nThis is ${hrName} from ${companyName}. We have a great opportunity for you:\n\n🔹 *Role:* ${skills}\n🔹 *Salary:* ₹${maxCTC}/month\n🔹 *Location:* ${location}\n\nIf you're interested in exploring this, just reply to this message or reach out at ${number}.\n\nHave a wonderful day!\n\nBest regards,\n${hrName}`;


  const url = `https://api.whatsapp.com/send?phone=${cleanedNumber}&text=${encodeURIComponent(defaultMessage)}`;

  Linking.canOpenURL(url)
    .then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open WhatsApp');
      }
    })
    .catch((err) => {
      console.error('Error opening WhatsApp:', err);
      Alert.alert('Error', 'An unexpected error occurred');
    });
};


  const handleActiveInactiveJob = async (job) => {
    if (!job?._id) return;
    
    try {
      const jobId = job._id;
      const response = await changeJobAvailibility(jobId);
      if (response.data.success) {
        setPostedJobs(prevJobs =>
          prevJobs.map(j => j._id === jobId ? { ...j, available: !j.available } : j)
        );
        Alert.alert('Success', `Job marked as ${!job.available ? 'Active' : 'Inactive'}`);
      } else {
        throw new Error(response.data.message || "Failed to toggle availability");
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to change job availability: ' + error.message);
    }
  };

  const getApplicantCount = (jobId) => {
    return applicants.filter(applicant => applicant?.jobId === jobId).length;
  };

  const filteredJobs = () => {
    if (!postedJobs) return [];
    if (jobFilter === 'Active') return postedJobs.filter(job => job?.available);
    if (jobFilter === 'Inactive') return postedJobs.filter(job => !job?.available);
    return postedJobs;
  };

  const renderSeekerProfile = (seeker) => {
    if (!seeker) {
      return (
        <View>
          <Text style={[styles.itemText, isDarkMode ? styles.darkText : styles.lightText]}>
            No seeker data available.
          </Text>
        </View>
      );
    }

    return (
      <Animatable.View animation="fadeIn" duration={500}>
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, isDarkMode ? styles.darkAvatar : styles.lightAvatar]}>
           
          </View>
          <Text style={[styles.seekerModalName, isDarkMode ? styles.darkText : styles.lightText]}>
            {seeker.fullName || 'Job Seeker'}
          </Text>
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailItem}>
            <MaterialIcons name="email" size={20} color={isDarkMode ? '#aaa' : '#555'} />
            <Text style={[styles.detailText, isDarkMode ? styles.darkText : styles.lightText]}>
              {seeker.email || 'Not specified'}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <MaterialIcons name="phone" size={20} color={isDarkMode ? '#aaa' : '#555'} />
            <Text style={[styles.detailText, isDarkMode ? styles.darkText : styles.lightText]}>
              {seeker.whatsappNumber || 'Not specified'}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <MaterialIcons name="work" size={20} color={isDarkMode ? '#aaa' : '#555'} />
            <Text style={[styles.detailText, isDarkMode ? styles.darkText : styles.lightText]}>
              {seeker.skills?.join(', ') || 'Not specified'}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <MaterialIcons name="star" size={20} color={isDarkMode ? '#aaa' : '#555'} />
            <Text style={[styles.detailText, isDarkMode ? styles.darkText : styles.lightText]}>
              {seeker.experience || 0} years experience
            </Text>
          </View>

          <View style={styles.detailItem}>
            <MaterialIcons name="location-on" size={20} color={isDarkMode ? '#aaa' : '#555'} />
            <Text style={[styles.detailText, isDarkMode ? styles.darkText : styles.lightText]}>
              {seeker.location || 'Not specified'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.whatsappButton, isDarkMode ? styles.darkButton : styles.lightButton]}
          onPress={() => handleWhatsAppConnect(seeker.whatsappNumber, seeker.fullName)}
        >
          <FontAwesome name="whatsapp" size={20} color="#fff" />
          <Text style={styles.whatsappButtonText}>Connect via WhatsApp</Text>
        </TouchableOpacity>
      </Animatable.View>
    );
  };

  const renderJobItem = ({ item, index }) => {
    if (!item) return null;
    
    return (
      <Animatable.View
        animation="fadeInUp"
        duration={400}
        delay={index * 100}
        style={[styles.jobCard, isDarkMode ? styles.darkJobCard : styles.lightJobCard]}
      >
        <View style={styles.jobHeader}>
          <Text style={[styles.jobTitle, isDarkMode ? styles.darkText : styles.lightText]}>
            {item.skills?.join(' | ') || 'No skills specified'}
          </Text>
          <TouchableOpacity
            onPress={() => handleActiveInactiveJob(item)}
            style={[styles.statusBadge, item.available ? styles.activeBadge : styles.inactiveBadge]}
          >
            <Text style={styles.statusText}>{item.available ? 'Deactive' : 'Active'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.jobDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons name="work" size={16} color={isDarkMode ? '#aaa' : '#555'} />
            <Text style={[styles.detailText, isDarkMode ? styles.darkDetailText : styles.lightDetailText]}>
              {item.experienceRequired || 0} years experience
            </Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="location-on" size={16} color={isDarkMode ? '#aaa' : '#555'} />
            <Text style={[styles.detailText, isDarkMode ? styles.darkDetailText : styles.lightDetailText]}>
              {item.location || 'Location not specified'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <FontAwesome name="money" size={16} color={isDarkMode ? '#aaa' : '#555'} />
            <Text style={[styles.detailText, isDarkMode ? styles.darkDetailText : styles.lightDetailText]}>
              ₹{item.maxCTC || '0'}/month
            </Text>
          </View>
        </View>

        <View style={styles.jobActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.viewApplicantsBtn]}
            onPress={() => handleViewApplicants(item._id)}
          >
            <Text style={styles.actionBtnText}>Applied ({getApplicantCount(item._id)})</Text>
          </TouchableOpacity>

          <View style={styles.iconActions}>
            <TouchableOpacity
              style={[styles.iconBtn, isDarkMode ? styles.darkIconBtn : styles.lightIconBtn]}
              onPress={() => handleEditJob(item)}
            >
              <MaterialIcons name="edit" size={20} color={isDarkMode ? '#ddd' : '#333'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconBtn, styles.deleteBtn]}
              onPress={() => {
                setSelectedJobForDelete(item._id);
                setShowDeleteJobModal(true);
              }}
            >
              <MaterialIcons name="delete" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Animatable.View>
    );
  };

  const renderApplicantItem = ({ item,companyName,hrName ,maxCTC,location ,skills}) => {
    if (!item || !item.seeker) return null;
    console.log("c name and hrName=",companyName,hrName)
    return (
      
      <View style={[styles.applicantItem, isDarkMode ? styles.darkApplicantItem : styles.lightApplicantItem]}>
        <View style={styles.applicantInfo}>
          <View style={[styles.applicantAvatar, isDarkMode ? styles.darkAvatar : styles.lightAvatar]}>
            <Text style={styles.avatarText}>
              {item.seeker?.fullName?.charAt(0)?.toUpperCase() || 'J'}
            </Text>
          </View>
          <View>
            <Text style={[styles.applicantName, isDarkMode ? styles.darkText : styles.lightText]}>
              {item.seeker?.fullName || 'Unknown seeker'}
            </Text>
          </View>
        </View>
        <View style={styles.IconButton}>
          <TouchableOpacity
            style={styles.whatsappApplicantButton}
            onPress={() => handleWhatsAppConnect(item.seeker?.whatsappNumber, item.seeker?.fullName,companyName,hrName,maxCTC,location ,skills)}
          >
            <View style={styles.whatsappButtonContent}>
              <FontAwesome
                name="whatsapp"
                size={10}
                color="#fff"
                style={styles.whatsappIcon}
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.applicantActionButton, isDarkMode ? styles.darkButton : styles.lightButton]}
            onPress={() => handleViewSeekerProfile(item.seeker?._id)}
          >
            <Text style={styles.buttonText}>View</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderModalContainer = (children, style = {}) => (
    <View style={[styles.modalOverlay, { pointerEvents: 'auto' }]}>
      <Animatable.View
        animation="fadeInUp"
        duration={400}
        style={[
          styles.modalContainer,
          isDarkMode ? styles.darkModalContainer : styles.lightModalContainer,
          style
        ]}
      >
        {children}
      </Animatable.View>
    </View>
  );

  return (
    <Animated.View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer, ]}>
      <Header title="Provider Dashboard" toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />

      <TouchableOpacity 
        style={styles.searchcontainer}
        onPress={handleSearchPress}
        activeOpacity={0.8}
      >
        <View style={styles.searchcontent}>
          <Ionicons name="search" size={20} color="#999" style={styles.icon} />
          <Text style={styles.text}>Search seekers </Text>
          <Ionicons name="mic" size={20} color="#999" />
        </View>
      </TouchableOpacity>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDarkMode ? '#4a6da7' : '#007AFF'} />
          <Text style={[styles.loadingText, isDarkMode ? styles.darkText : styles.lightText]}>
            Loading dashboard...
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {user ? (
              <>
                <Animatable.View animation="fadeIn" duration={700}>
                  <TouchableOpacity
                    style={[styles.primaryButton, isDarkMode ? styles.darkPrimaryButton : styles.lightPrimaryButton]}
                    onPress={() => setShowPostJobModal(true)}
                  >
                    <MaterialIcons name="post-add" size={24} color="#fff" />
                    <Text style={styles.primaryButtonText}>Post a New Job</Text>
                  </TouchableOpacity>
                </Animatable.View>

                <Animatable.View
                  animation="fadeInUp"
                  duration={900}
                  style={styles.section}
                >
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : styles.lightText]}>
                      Your Posted Jobs ({postedJobs.length})
                    </Text>

                    {postedJobs.length > 0 && (
                      <View style={[styles.filterContainer, isDarkMode ? styles.darkFilterContainer : styles.lightFilterContainer]}>
                        <TouchableOpacity
                          style={[styles.filterButton, jobFilter === 'Active' && styles.activeFilterButton]}
                          onPress={() => setJobFilter('Active')}
                        >
                          <Text style={[styles.filterButtonText, jobFilter === 'Active' && styles.activeFilterButtonText]}>Active</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.filterButton, jobFilter === 'Inactive' && styles.activeFilterButton]}
                          onPress={() => setJobFilter('Inactive')}
                        >
                          <Text style={[styles.filterButtonText, jobFilter === 'Inactive' && styles.activeFilterButtonText]}>Deactive</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {postedJobs.length === 0 ? (
                    <Animatable.View
                      animation="fadeIn"
                      duration={600}
                      style={styles.emptyState}
                    >
                      <MaterialIcons name="work-off" size={40} color={isDarkMode ? '#555' : '#aaa'} />
                      <Text style={[styles.emptyStateText, isDarkMode ? styles.darkText : styles.lightText]}>
                        No jobs posted yet
                      </Text>
                      <TouchableOpacity
                        style={[styles.emptyStateButton, isDarkMode ? styles.darkButton : styles.lightButton]}
                        onPress={() => setShowPostJobModal(true)}
                      >
                        <Text style={styles.emptyStateButtonText}>Post Your First Job</Text>
                      </TouchableOpacity>
                    </Animatable.View>
                  ) : (
                    <FlatList
                      data={postedJobs && filteredJobs() || []}
                      keyExtractor={(item) => item?._id?.toString() || Math.random().toString()}
                      renderItem={renderJobItem}
                      scrollEnabled={false}
                    />
                  )}
                </Animatable.View>

                <Modal
                  visible={showPostJobModal}
                  transparent={true}
                  animationType="slide"
                  onRequestClose={() => setShowPostJobModal(false)}
                >
                  {renderModalContainer(
                    <>
                      <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>
                        Post a New Job
                      </Text>

                      <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                        <View style={styles.modalInputGroup}>
                          <Text style={[styles.modalLabel, isDarkMode ? styles.darkText : styles.lightText]}>
                            Job Title *
                          </Text>
                          <View style={[styles.dropdownContainer, isDarkMode ? styles.darkDropdown : styles.lightDropdown]}>
                            <Picker
                              selectedValue={selectedJob}
                              onValueChange={(itemValue) => {
                                setSelectedJob(itemValue);
                                if (itemValue && !skills.includes(itemValue)) {
                                  setSkills((prevSkills) => {
                                    if (prevSkills) {
                                      return prevSkills + ', ' + itemValue;
                                    } else {
                                      return itemValue;
                                    }
                                  });
                                }
                              }}
                             

                              style={[styles.dropdown, isDarkMode ? styles.darkText : styles.lightText]}
                              dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                            >
                              <Picker.Item label="Select Job Title" value="" />
                              <Picker.Item label="Driver" value="Driver" />
                              <Picker.Item label="Cook" value="Cook" />
                              <Picker.Item label="Receptionist" value="Receptionist" />
                              <Picker.Item label="Accountant" value="Accountant" />
                              <Picker.Item label="Security Guard" value="Security Guard" />
                              <Picker.Item label="Laundry" value="Laundry" />
                              <Picker.Item label="Housekeeping" value="Housekeeping" />
                            </Picker>
                          </View>
                        </View>

                        <View style={styles.modalInputGroup}>
                          <Text style={[styles.modalLabel, isDarkMode ? styles.darkText : styles.lightText]}>
                            Experience Required
                          </Text>
                          <View style={[styles.dropdownContainer, isDarkMode ? styles.darkDropdown : styles.lightDropdown]}>
                            <Picker
                              selectedValue={experienceRequired}
                              onValueChange={(itemValue) => setExperienceRequired(itemValue)}
                              style={[styles.dropdown, isDarkMode ? styles.darkText : styles.lightText]}
                              dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                            >
                              <Picker.Item label="Select Experience" value="" />
                              <Picker.Item label="Fresher (0 years)" value="0" />
                              <Picker.Item label="1-2 years" value="1-2" />
                              <Picker.Item label="3-5 years" value="3-5" />
                              <Picker.Item label="5-8 years" value="5-8" />
                              <Picker.Item label="8+ years" value="8+" />
                            </Picker>
                          </View>
                        </View>

                        <View style={styles.modalInputGroup}>
                          <Text style={[styles.modalLabel, isDarkMode ? styles.darkText : styles.lightText]}>
                            Location
                          </Text>
                          <View style={[styles.dropdownContainer, isDarkMode ? styles.darkDropdown : styles.lightDropdown]}>
                            <Picker
                              selectedValue={location}
                              onValueChange={(itemValue) => setLocation(itemValue)}
                              style={[styles.dropdown, isDarkMode ? styles.darkText : styles.lightText]}
                              dropdownIconColor={isDarkMode ? '#fff' : '#000'}
                            >
                              <Picker.Item label="Select Location" value="" />
                              <Picker.Item label="Pune" value="Pune" />
                              <Picker.Item label="Bangalore" value="Bangalore" />
                              <Picker.Item label="Indore" value="Indore" />
                              <Picker.Item label="Delhi" value="Delhi" />
                              <Picker.Item label="Mumbai" value="Mumbai" />
                              <Picker.Item label="Bhopal" value="Bhopal" />
                              <Picker.Item label="Gwalior" value="Gwalior" />

                            </Picker>
                          </View>
                        </View>

                        <View style={styles.modalInputGroup}>
                          <Text style={[styles.modalLabel, isDarkMode ? styles.darkText : styles.lightText]}>
                            Salary/Month (₹)
                          </Text>
                          <TextInput
                            style={[styles.modalInput, isDarkMode ? styles.darkInput : styles.lightInput]}
                            placeholder="e.g. 20000"
                            value={maxCTC}
                            onChangeText={setMaxCTC}
                            keyboardType="numeric"
                            placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
                          />
                        </View>
                      </ScrollView>

                      <View style={styles.modalButtonGroup}>
                        <TouchableOpacity
                          style={[styles.modalButton, styles.modalPrimaryButton]}
                          onPress={handlePostJob}
                        >
                          <Text style={styles.modalButtonText}>Post Job</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.modalButton, isDarkMode ? styles.darkModalButton : styles.lightModalButton]}
                          onPress={() => setShowPostJobModal(false)}
                        >
                          <Text style={[styles.modalButtonText, isDarkMode ? styles.darkText : styles.lightText]}>
                            Cancel
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </Modal>

                <Modal
                  visible={!!selectedJobForEdit}
                  transparent={true}
                  animationType="slide"
                  onRequestClose={() => setSelectedJobForEdit(null)}
                >
                  {renderModalContainer(
                    <>
                      <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>
                        Edit Job
                      </Text>

                      <ScrollView style={styles.modalScroll}>
                        <View style={styles.modalInputGroup}>
                          <Text style={[styles.modalLabel, isDarkMode ? styles.darkText : styles.lightText]}>
                            Job Names (comma-separated)
                          </Text>
                          <TextInput
                            style={[styles.modalInput, isDarkMode ? styles.darkInput : styles.lightInput]}
                            placeholder="e.g. SQL, JavaScript, React"
                            value={skills}
                            onChangeText={setSkills}
                            placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
                          />
                        </View>

                        <View style={styles.modalInputGroup}>
                          <Text style={[styles.modalLabel, isDarkMode ? styles.darkText : styles.lightText]}>
                            Experience Required (Years)
                          </Text>
                          <TextInput
                            style={[styles.modalInput, isDarkMode ? styles.darkInput : styles.lightInput]}
                            placeholder="e.g. 2"
                            value={experienceRequired}
                            onChangeText={setExperienceRequired}
                            keyboardType="numeric"
                            placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
                          />
                        </View>

                        <View style={styles.modalInputGroup}>
                          <Text style={[styles.modalLabel, isDarkMode ? styles.darkText : styles.lightText]}>
                            Location
                          </Text>
                          <TextInput
                            style={[styles.modalInput, isDarkMode ? styles.darkInput : styles.lightInput]}
                            placeholder="e.g. Pune"
                            value={location}
                            onChangeText={setLocation}
                            placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
                          />
                        </View>

                        <View style={styles.modalInputGroup}>
                          <Text style={[styles.modalLabel, isDarkMode ? styles.darkText : styles.lightText]}>
                            Salary/Month (₹)
                          </Text>
                          <TextInput
                            style={[styles.modalInput, isDarkMode ? styles.darkInput : styles.lightInput]}
                            placeholder="e.g. 20000"
                            value={maxCTC}
                            onChangeText={setMaxCTC}
                            keyboardType="numeric"
                            placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
                          />
                        </View>
                      </ScrollView>

                      <View style={styles.modalButtonGroup}>
                        <TouchableOpacity
                          style={[styles.modalButton, styles.modalPrimaryButton]}
                          onPress={handleUpdateJob}
                        >
                          <Text style={styles.modalButtonText}>Save Changes</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.modalButton, isDarkMode ? styles.darkModalButton : styles.lightModalButton]}
                          onPress={() => setSelectedJobForEdit(null)}
                        >
                          <Text style={[styles.modalButtonText, isDarkMode ? styles.darkText : styles.lightText]}>
                            Cancel
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </Modal>

                <Modal
                  visible={showDeleteJobModal}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setShowDeleteJobModal(false)}
                >
                  {renderModalContainer(
                    <>
                      <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>
                        Confirm Delete
                      </Text>
                      <Text style={[styles.modalText, isDarkMode ? styles.darkText : styles.lightText]}>
                        Are you sure you want to delete this job posting?
                      </Text>

                      <View style={styles.modalButtonGroup}>
                        <TouchableOpacity
                          style={[styles.modalButton, styles.deleteButton]}
                          onPress={() => {
                            handleDeleteJob(selectedJobForDelete);
                            setShowDeleteJobModal(false);
                          }}
                        >
                          <Text style={styles.modalButtonText}>Delete</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.modalButton, isDarkMode ? styles.darkModalButton : styles.lightModalButton]}
                          onPress={() => setShowDeleteJobModal(false)}
                        >
                          <Text style={[styles.modalButtonText, isDarkMode ? styles.darkText : styles.lightText]}>
                            Cancel
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>,
                    styles.confirmModal
                  )}
                </Modal>

                <Modal
                  visible={showSeekerProfileModal}
                  transparent={true}
                  animationType="slide"
                  onRequestClose={handleCloseSeekerProfileModal}
                >
                  {renderModalContainer(
                    <>
                      <TouchableOpacity
                        style={styles.closeButton}
                        onPress={handleCloseSeekerProfileModal}
                      >
                        <Ionicons name="close" size={24} color={isDarkMode ? '#aaa' : '#555'} />
                      </TouchableOpacity>

                      {renderSeekerProfile(
                        seekers.find(s => s._id === selectedSeekerId) ||
                        applicants.find(a => a.seeker?._id === selectedSeekerId)?.seeker ||
                        null
                      )}
                    </>,
                    styles.profileModal
                  )}
                </Modal>

                <Modal
                  visible={!!selectedJobId}
                  transparent={true}
                  animationType="slide"
                  onRequestClose={() => setSelectedJobId(null)}
                >
                  {renderModalContainer(
                    <>
                      <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setSelectedJobId(null)}
                      >
                        <Ionicons name="close" size={20} color={isDarkMode ? '#aaa' : '#555'} />
                      </TouchableOpacity>

                      <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>
                        Applicants for {postedJobs.find(j => j._id === selectedJobId)?.skills?.join(', ')}
                      </Text>

                      {applicants.filter(applicant => applicant?.jobId === selectedJobId).length === 0 ? (
                        <View style={styles.emptyApplicants}>
                          <MaterialIcons name="people-outline" size={40} color={isDarkMode ? '#555' : '#aaa'} />
                          <Text style={[styles.modalText, isDarkMode ? styles.darkText : styles.lightText]}>
                            No applicants yet for this job.
                          </Text>
                        </View>
                      ) : (
                        // <FlatList
                        //   data={applicants.filter(applicant => applicant?.jobId === selectedJobId) || []}
                        //   keyExtractor={(item) => item?._id?.toString() || Math.random().toString()}
                        //   renderItem={renderApplicantItem}
                        // />
                        <FlatList
  data={applicants.filter(applicant => applicant?.jobId === selectedJobId) || []}
  keyExtractor={(item) => item?._id?.toString() || Math.random().toString()}
  renderItem={({ item }) => renderApplicantItem({ item, companyName: user.companyName, hrName: user.hrName , maxCTC: selectedJob?.maxCTC || 'Not specified',
    location: selectedJob?.location || 'Location not specified',
    skills: selectedJob?.skills?.join(', ') || 'Skills not specified',})}
/>

                      )}
                    </>,
                    styles.applicantsModal
                  )}
                </Modal>
              </>
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={isDarkMode ? '#4a6da7' : '#007AFF'} />
                <Text style={[styles.loadingText, isDarkMode ? styles.darkText : styles.lightText]}>
                  Loading profile...
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      <Footer isDarkMode={isDarkMode} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lightContainer: {
    backgroundColor: '#f5f5f5',
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  content: {
    padding: 16,
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  lightTopActions: {
    backgroundColor: '#fff',
    borderBottomColor: '#e0e0e0',
  },
  darkTopActions: {
    backgroundColor: '#1e1e1e',
    borderBottomColor: '#333',
  },
  topActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  lightTopActionBtn: {
    backgroundColor: '#f0f0f0',
  },
  darkTopActionBtn: {
    backgroundColor: '#2d2d2d',
  },
  topActionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  profileCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lightCard: {
    backgroundColor: '#fff',
  },
  darkCard: {
    backgroundColor: '#1e1e1e',
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileText: {
    marginLeft: 8,
    fontSize: 15,
  },
  primaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  lightPrimaryButton: {
    backgroundColor: '#007AFF',
  },
  darkPrimaryButton: {
    backgroundColor: '#4a6da7',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  searchSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lightSearchSection: {
    backgroundColor: '#fff',
  },
  darkSearchSection: {
    backgroundColor: '#1e1e1e',
  },
  searchContent: {
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 50,
  },
  lightSearchInputContainer: {
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  darkSearchInputContainer: {
    borderColor: '#444',
    backgroundColor: '#2d2d2d',
  },
  input: {
    flex: 1,
    height: '100%',
    paddingLeft: 8,
    fontSize: 14,
  },
  iconContainer: {
    paddingRight: 10,
  },
  searchButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  lightSearchButton: {
    backgroundColor: '#007AFF',
  },
  darkSearchButton: {
    backgroundColor: '#4a6da7',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
  },
  lightFilterContainer: {
    backgroundColor: '#e0e0e0',
  },
  darkFilterContainer: {
    backgroundColor: '#2d2d2d',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  activeFilterButton: {
    backgroundColor: '#4a6da7',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  lightEmptyState: {
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  darkEmptyState: {
    borderColor: '#333',
    backgroundColor: '#1e1e1e',
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyStateButton: {
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  jobCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lightJobCard: {
    backgroundColor: '#fff',
  },
  darkJobCard: {
    backgroundColor: '#1e1e1e',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#F44336',
  },

  inactiveBadge: {
    backgroundColor: '#4CAF50',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  jobDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
  },
  lightDetailText: {
    color: '#555',
  },
  darkDetailText: {
    color: '#aaa',
  },
  jobActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  viewApplicantsBtn: {
    backgroundColor: '#007AFF',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  iconActions: {
    flexDirection: 'row',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  lightIconBtn: {
    backgroundColor: '#e0e0e0',
  },
  darkIconBtn: {
    backgroundColor: '#2d2d2d',
  },
  deleteBtn: {
    backgroundColor: '#F44336',
  },
  seekerCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lightSeekerCard: {
    backgroundColor: '#fff',
  },
  darkSeekerCard: {
    backgroundColor: '#1e1e1e',
  },
  seekerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  seekerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  lightAvatar: {
    backgroundColor: '#4a6da7',
  },
  darkAvatar: {
    backgroundColor: '#3a5a8f',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  seekerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  seekerSkills: {
    fontSize: 14,
    marginBottom: 4,
  },
  seekerLocation: {
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 20,
  },
  confirmModal: {
    width: '80%',
    maxHeight: '30%',
  },
  profileModal: {
    width: '90%',
    maxHeight: '70%',
  },
  applicantsModal: {
    width: '90%',
    maxHeight: '70%',
  },
  lightModalContainer: {
    backgroundColor: '#fff',
  },
  darkModalContainer: {
    backgroundColor: '#1e1e1e',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 10,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalScroll: {
    maxHeight: height * 0.5,
  },
  modalInputGroup: {
    marginBottom: 10,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 10,
  },
  lightInput: {
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    color: '#000',
  },
  darkInput: {
    borderColor: '#444',
    backgroundColor: '#2d2d2d',
    color: '#ddd',
  },
  modalButtonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalPrimaryButton: {
    backgroundColor: '#4a6da7',
    marginRight: 10,
  },
  deleteButton: {
    backgroundColor: '#F44336',
    marginRight: 10,
  },
  lightModalButton: {
    backgroundColor: '#e0e0e0',
  },
  darkModalButton: {
    backgroundColor: '#2d2d2d',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    padding: 8,
  },
  applicantItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lightApplicantItem: {
    backgroundColor: '#f9f9f9',
  },
  darkApplicantItem: {
    backgroundColor: '#2d2d2d',
  },
  applicantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  applicantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  applicantName: {
    fontSize: 16,
    fontWeight: '600',
  },
  applicantEmail: {
    fontSize: 14,
  },
  applicantActionButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  emptyApplicants: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  lightButton: {
    backgroundColor: '#25D366',
  },
  darkButton: {
    backgroundColor: '#3a5a8f',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  lightText: {
    color: '#000',
  },
  darkText: {
    color: '#ddd',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  seekerModalName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
  },
  detailCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    backgroundColor: 'rgba(74, 109, 167, 0.1)',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  whatsappButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    marginTop: 10,
  },
  whatsappButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  fullWidthDropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 50,
    width: '100%',
    backgroundColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  // -----chnage by jay ------
  IconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10, // This adds space between the buttons
  },
  whatsappApplicantButton: {
    backgroundColor: '#25D366',
    borderRadius: 25, // More rounded corners
    paddingVertical: 6,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    minWidth: 45, // Minimum width for better proportions
    height: 33,
  },
  whatsappButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  whatsappIcon: {
    fontSize: 20,
  },
  whatsappButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  applicantActionButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
   searchcontainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchcontent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
   // ... your existing styles
  
  // ... your existing styles
  
  modalScrollContent: {
    paddingBottom: 10,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderRadius: 6,
    marginBottom: 12,
    overflow: 'hidden',
  },
  lightDropdown: {
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  darkDropdown: {
    borderColor: '#444',
    backgroundColor: '#222',
  },
  dropdown: {
    height: 50,  // Reduced from 50
    paddingHorizontal: 10,
    fontSize: 14,
  },
  modalInputGroup: {
    marginBottom: 16,  // Reduced from 20
  },
  modalLabel: {
    fontSize: 12,  // Reduced from 16
    marginBottom: 6,  // Reduced from 8
    fontWeight: '500',
  },
  modalInput: {
    height: 45,  // Reduced from 50
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 14,  // Reduced from 16
  },
  lightInput: {
    borderColor: '#ccc',
    backgroundColor: '#fff',
    color: '#000',
  },
  darkInput: {
    borderColor: '#444',
    backgroundColor: '#222',
    color: '#fff',
  },
  modalButtonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,  // Reduced from 10
  },
  modalButton: {
    flex: 1,
    padding: 12,  // Reduced from 15
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,  // Reduced from 5
  },
  modalPrimaryButton: {
    backgroundColor: '#4CAF50',
  },
  lightModalButton: {
    backgroundColor: '#f0f0f0',
  },
  darkModalButton: {
    backgroundColor: '#333',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,  // Reduced from 16
  },
  modalTitle: {
    fontSize: 18,  // Reduced from previous if it was larger
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
});