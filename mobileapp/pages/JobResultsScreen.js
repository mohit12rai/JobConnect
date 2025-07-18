import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Linking, Modal,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile, searchJobs, searchSeekers, applyToJob } from '../utils/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Ionicons, Entypo } from '@expo/vector-icons';
import Icon from 'react-native-vector-icons/FontAwesome';
import Toast from 'react-native-toast-message';
import RNPickerSelect from 'react-native-picker-select';

const skillOptions = [
  { label: 'Accountant', value: 'Accountant' },
  { label: 'Security Guard', value: 'Security Guard' },
  { label: 'Laundry', value: 'Laundry' },
  { label: 'Housekeeping', value: 'Housekeeping' },
  { label: 'Cook', value: 'Cook' },
  { label: 'Driver', value: 'Driver' },
  { label: 'Receptionist', value: 'Receptionist' },
];

const locationOptions = [
  { label: 'Bhopal', value: 'Bhopal' },
  { label: 'Indore', value: 'Indore' },
  { label: 'Gwalior', value: 'Gwalior' },
  { label: 'Delhi', value: 'Delhi' },
  { label: 'Mumbai', value: 'Mumbai' },
  { label: 'Bangalore', value: 'Bangalore' },
  { label: 'Pune', value: 'Pune' },
];

// const skillOptions = [
//   { label: 'Accounting', value: 'Accounting' },
//   { label: 'Security', value: 'Security' },
//   { label: 'Cleaning', value: 'Cleaning' },
//   { label: 'Cooking', value: 'Cooking' },
//   { label: 'Driving', value: 'Driving' },
//   { label: 'Customer Service', value: 'Customer Service' },
// ];

export default function JobResultsScreen({ isDarkMode, toggleDarkMode, route }) {
  const [user, setUser] = useState(route?.params?.user || null);
  const [searchSkills, setSearchSkills] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [suggestedJobs, setSuggestedJobs] = useState([]);
  const [suggestedSeekers, setSuggestedSeekers] = useState([]);
  const [message, setMessage] = useState('');
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [showSeekerDetails, setShowSeekerDetails] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedSeeker, setSelectedSeeker] = useState(null);
  const [seekerQuery, setSeekerQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const navigation = useNavigation();
  const [role, setRole] = useState(route.params?.role || 'seeker');
  const [showHRModal, setShowHRModal] = useState(false);
 console.log("user=",user)
  const pickerStyle = {
    inputIOS: {
      fontSize: 13,
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderRadius: 10,
      color: isDarkMode ? '#fff' : '#000',
      backgroundColor: isDarkMode ? '#333' : '#f2f2f2',
    },
    inputAndroid: {
      fontSize: 13,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 10,
      color: isDarkMode ? '#fff' : '#000',
      backgroundColor: isDarkMode ? '#333' : '#f2f2f2',
    },
    inputWeb: {
      fontSize: 13,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 10,
      color: isDarkMode ? '#fff' : '#000',
      backgroundColor: isDarkMode ? '#333' : '#f2f2f2',
      borderWidth: 0,
      appearance: 'none',
      outline: 'none',
    },
    placeholder: {
      color: '#888',
      fontSize: 15,
    },
    iconContainer: {
      top: 12,
      right: 12,
    },
  };

  useEffect(() => {
    const init = async () => {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setAppliedJobs(parsed.appliedJobs || []);
      }
    };
    init();
  }, []);

  const handleSearch = async () => {
    try {
      setHasSearched(true);
      
      if (role === 'seeker') {
        // Job search for seekers
        const searchData = {
          skills: searchSkills.split(',').map(s => s.trim()).filter(Boolean),
          location: searchLocation.trim(),
          available: true,
        };

        const response = await searchJobs(searchData);
        const jobs = response.data.map(job => ({
          ...job,
          applied: appliedJobs.some(j => j.jobId === job._id),
        }));

        setSuggestedJobs(jobs);
        setSuggestedSeekers([]);
        setMessage(jobs.length === 0 ? 'No jobs found' : '');
      } else if (role === 'provider') {
        // Seeker search for providers
        const searchData = {
          skills: searchSkills.split(',').map(s => s.trim()).filter(Boolean),
          location: searchLocation.trim(),
          available: true,
        };

        const response = await searchSeekers(searchData);
        console.log("seeker",response.data)
        setSuggestedSeekers(response.data);
        setSuggestedJobs([]);
        setMessage(response.data.length === 0 ? 'No seekers found' : '');
      }
    } catch (error) {
      console.error('Search error:', error);
      setMessage('Error searching');
    }
  };

  // const handleApply = async (jobId) => {
  //   try {
  //     await applyToJob({ seekerId: user._id, jobId });
  //     const updatedJobs = [
  //       ...appliedJobs.filter(j => j.jobId !== jobId),
  //       { jobId, title: 'Job', status: 'Applied' }
  //     ];
  //     setAppliedJobs(updatedJobs);
  //     setSuggestedJobs(jobs => jobs.map(j => j._id === jobId ? { ...j, applied: true } : j));
  //     Toast.show({ type: 'success', text1: 'Applied successfully', position: 'top' });
  //   } catch {
  //     Toast.show({ type: 'error', text1: 'Apply failed', position: 'top' });
  //   }
  // };




  const handleApply = async (jobId) => {
  const appliedJob = suggestedJobs.find(job => job._id === jobId);
  setSelectedJob(appliedJob);

  // 👉 If already applied, just show the HR modal
  if (appliedJob?.applied || appliedJobs.some(job => job.jobId === jobId)) {
    setShowHRModal(true);
    return;
  }

  try {
    await applyToJob({ seekerId: user._id, jobId });

    const updatedJobs = suggestedJobs.map(job =>
      job._id === jobId ? { ...job, applied: true } : job
    );
    setSuggestedJobs(updatedJobs);

    const updatedAppliedJobs = [
      ...appliedJobs.filter(job => job.jobId !== jobId),
      {
        jobId,
        title: appliedJob?.jobTitle || 'Unknown',
        status: 'Applied',
      },
    ];
    setAppliedJobs(updatedAppliedJobs);

    const updatedUser = { ...user, appliedJobs: updatedAppliedJobs };
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);

    Toast.show({ type: 'success', text1: 'Applied successfully', position: 'top' });

    // ✅ Show HR modal immediately after applying
    setShowHRModal(true);

  } catch (error) {
    Toast.show({
      type: 'error',
      text1: 'Apply Failed',
      text2: error.message || 'An error occurred.',
      position: 'top',
    });
  }
};
  const handleWhatsAppConnect = async (number, jobId, title) => {
    try {
      await axios.post(`https://jobconnectqa-2.onrender.com/api/jobs/apply-job`, {
        seekerId: user._id,
        jobId,
        title,
        status: 'Connected',
      });
      if (!number.startsWith('+')) number = '+91' + number;
      Linking.openURL(`https://api.whatsapp.com/send?phone=${number}&text=Hi, I'm interested in your job posting: ${title}`);
    } catch (e) {
      console.error('WhatsApp error:', e);
    }
  };

  const handleCallToHR = (phoneNumber) => {
    if (!phoneNumber) return;
    const phoneUrl = `tel:${phoneNumber}`;
    Linking.openURL(phoneUrl).catch(err =>
      console.error('Failed to open dialer', err)
    );
  };

const renderJobItem = ({ item }) => (
    <View
      style={[
        styles.jobCard,
        isDarkMode ? styles.darkCard : styles.lightCard,
        { position: 'relative' },
      ]}
    >
      {/* View More Button in Top Right */}
      <TouchableOpacity
        style={styles.viewMoreButton}
        onPress={() => {
          setSelectedJob(item);
          setShowJobDetails(true);
        }}
      >
        <Text style={styles.viewMoreText}>View More</Text>
      </TouchableOpacity>
  
      {/* Job Title */}
      {/* Job Title */}
  <Text
    style={[
      styles.jobTitle,
      isDarkMode ? styles.darkText : styles.lightText,
    ]}
  >
    <Text style={styles.bold}>Job Name: </Text>
    {item.jobTitle || item.skills?.join(', ') || 'Job Opportunity'}
  </Text>
  
  {/* Company Name */}
  <Text
    style={[
      styles.companyName,
      isDarkMode ? styles.darkText : styles.lightText,
    ]}
  >
    <Text style={styles.bold}>Company: </Text>
    {item.postedBy?.companyName || 'Company Name'}
  </Text>
  
  {/* Location */}
  <Text
    style={[
      styles.jobDetail,
      isDarkMode ? styles.darkText : styles.lightText,
    ]}
  >
    <Icon name="map-marker" size={12} /> <Text style={styles.bold}>Location: </Text>
    {item.location || 'Not specified'}
  </Text>
  
  {/* Salary */}
  <Text
    style={[
      styles.jobDetail,
      isDarkMode ? styles.darkText : styles.lightText,
    ]}
  >
    <Icon name="money" size={12} /> <Text style={styles.bold}>Salary: </Text>
    {item.maxCTC || 'Not disclosed'}
  </Text>
  
  
      {/* Action Buttons: Apply & WhatsApp */}
      <View style={styles.actionButtons}>
       <TouchableOpacity
    style={[styles.applyButton, item.applied && styles.appliedButton]}
    onPress={() => handleApply(item._id)} // This will now work even if applied
  >
    <Text style={styles.buttonText}>
      {item.applied ? 'Applied' : 'Apply'}
    </Text>
  </TouchableOpacity>
  
        {item.postedBy?.hrWhatsappNumber && (
          <TouchableOpacity
    style={styles.whatsappButton}
    onPress={() =>
      handleWhatsAppConnect(
        item?.postedBy?.hrWhatsappNumber,
        item?._id,
        item?.jobTitle || item?.skills?.[0] || 'Job',
        item?.location || 'N/A',
        item?.postedBy?.companyName || 'N/A',
        item?.postedBy?.hrName || 'HR'
      )
    }
  >
    <Icon name="whatsapp" size={16} color="#fff" />
    <Text style={styles.buttonText}> WhatsApp</Text>
  </TouchableOpacity>
  
        )}
      </View>
    </View>
  );

  const renderSeekerItem = ({ item }) => (
  
    <View
      style={[
        styles.jobCard,
        isDarkMode ? styles.darkCard : styles.lightCard,
        { position: 'relative' },
      ]}
    >
      <TouchableOpacity
        style={styles.viewMoreButton}
        onPress={() => {
          setSelectedSeeker(item);
          setShowSeekerDetails(true);
        }}
      >
        <Text style={styles.viewMoreText}>View More</Text>
      </TouchableOpacity>

      <Text
        style={[
          styles.jobTitle,
          isDarkMode ? styles.darkText : styles.lightText,
        ]}
      >
        <Text style={styles.bold}>Name: </Text>
        {item.fullName || 'Job Seeker'}
      </Text>
      
      <Text
        style={[
          styles.companyName,
          isDarkMode ? styles.darkText : styles.lightText,
        ]}
      >
        <Text style={styles.bold}>Skills: </Text>
        {item.skills?.join(', ') || 'Not specified'}
      </Text>
      
      <Text
        style={[
          styles.jobDetail,
          isDarkMode ? styles.darkText : styles.lightText,
        ]}
      >
        <Icon name="map-marker" size={12} /> <Text style={styles.bold}>Location: </Text>
        {item.location || 'Not specified'}
      </Text>
      
      <Text
        style={[
          styles.jobDetail,
          isDarkMode ? styles.darkText : styles.lightText,
        ]}
      >
        <Icon name="money" size={12} /> <Text style={styles.bold}>Expected Salary: </Text>
        {item.expectedCTC || 'Not disclosed'}
      </Text>

      
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Header title={role === 'seeker' ? "Search Jobs" : "Search Seekers"} toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
      <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
        <View
          style={[
            styles.searchInputContainer,
            isDarkMode ? styles.darkSearchInputContainer : styles.lightSearchInputContainer
          ]}
        >
          <Ionicons name={role === 'seeker' ? "briefcase" : "search"} size={20} color={isDarkMode ? '#ccc' : '#555'} style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <RNPickerSelect
              onValueChange={(value) => {
                setSeekerQuery(value);
                setSearchSkills(value);
              }}
              placeholder={{ label: role === 'seeker' ? 'Search by Skill' : 'Search by Seeker Skill', value: '' }}
              items={role === 'seeker' ? skillOptions : skillOptions}
              style={pickerStyle}
              value={seekerQuery}
              useNativeAndroidPickerStyle={false}
              Icon={() => (
                <Ionicons name="chevron-down" size={20} color={isDarkMode ? '#aaa' : '#555'} />
              )}
            />
          </View>
        </View>

        <View
          style={[
            styles.searchInputContainer,
            isDarkMode ? styles.darkSearchInputContainer : styles.lightSearchInputContainer
          ]}
        >
          <Entypo name="location-pin" size={20} color={isDarkMode ? '#ccc' : '#555'} style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <RNPickerSelect
              onValueChange={(value) => {
                setLocationQuery(value);
                setSearchLocation(value);
              }}
              placeholder={{ label: 'Location', value: '' }}
              items={locationOptions}
              style={pickerStyle}
              value={locationQuery}
              useNativeAndroidPickerStyle={false}
              Icon={() => (
                <Ionicons name="chevron-down" size={20} color={isDarkMode ? '#aaa' : '#555'} />
              )}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Ionicons name="search" size={20} color="white" />
          <Text style={styles.searchText}>Search</Text>
        </TouchableOpacity>

        {hasSearched && (
          message ? (
            <Text style={[styles.messageText, isDarkMode ? styles.darkText : styles.lightText]}>
              {message}
            </Text>
          ) : (
            <FlatList
              data={role === 'seeker' ? suggestedJobs : suggestedSeekers}
              keyExtractor={(item, index) => item?._id || `item-${index}`}
              renderItem={role === 'seeker' ? renderJobItem : renderSeekerItem}
              contentContainerStyle={{ marginTop: 20 }}
            />
          )
        )}

        {/* Job Details Modal */}
        <Modal visible={showJobDetails} transparent animationType="slide">
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, isDarkMode ? styles.darkCard : styles.lightCard]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>
                  ⚙ Job Details
                </Text>
                <TouchableOpacity onPress={() => setShowJobDetails(false)}>
                  <Text style={[styles.closeButtonText, isDarkMode ? styles.darkText : styles.lightText]}>
                    ✖
                  </Text>
                </TouchableOpacity>
              </View>

              {selectedJob && (
                <>
                  <Text style={[styles.modalRow, isDarkMode ? styles.darkText : styles.lightText]}>
                    <Text style={styles.bold}>HR Name:</Text> {selectedJob?.postedBy?.hrName || 'N/A'}
                  </Text>
                  <Text style={[styles.modalRow, isDarkMode ? styles.darkText : styles.lightText]}>
                    <Text style={styles.bold}>Company:</Text> {selectedJob?.postedBy?.companyName || 'N/A'}
                  </Text>
                  <Text style={[styles.modalRow, isDarkMode ? styles.darkText : styles.lightText]}>
                    <Text style={styles.bold}>Location:</Text> {selectedJob?.location || 'N/A'}
                  </Text>
                  <Text style={[styles.modalRow, isDarkMode ? styles.darkText : styles.lightText]}>
                    <Text style={styles.bold}>Salary:</Text> {selectedJob?.maxCTC || 'Not disclosed'}
                  </Text>
                  <Text style={[styles.modalRow, isDarkMode ? styles.darkText : styles.lightText]}>
                    <Text style={styles.bold}>WhatsApp:</Text> {selectedJob?.postedBy?.hrWhatsappNumber || 'N/A'}
                  </Text>

                  {selectedJob.postedBy?.hrWhatsappNumber && (
                    <TouchableOpacity
                      style={styles.callButton}
                      onPress={() =>
                        handleCallToHR(selectedJob.postedBy.hrWhatsappNumber)
                      }
                    >
                      <Text style={styles.callButtonText}>📞 Contact HR</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Seeker Details Modal */}
        {/* <Modal visible={showSeekerDetails} transparent animationType="slide">
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, isDarkMode ? styles.darkCard : styles.lightCard]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>
                  ⚙ Seeker Details
                </Text>
                <TouchableOpacity onPress={() => setShowSeekerDetails(false)}>
                  <Text style={[styles.closeButtonText, isDarkMode ? styles.darkText : styles.lightText]}>
                    ✖
                  </Text>
                </TouchableOpacity>
              </View>

              {selectedSeeker && (
                <>
                  <Text style={[styles.modalRow, isDarkMode ? styles.darkText : styles.lightText]}>
                    <Text style={styles.bold}>Name:</Text> {selectedSeeker?.fullName || 'N/A'}
                  </Text>
                  <Text style={[styles.modalRow, isDarkMode ? styles.darkText : styles.lightText]}>
                    <Text style={styles.bold}>Skills:</Text> {selectedSeeker?.skills?.join(', ') || 'N/A'}
                  </Text>
                  <Text style={[styles.modalRow, isDarkMode ? styles.darkText : styles.lightText]}>
                    <Text style={styles.bold}>Location:</Text> {selectedSeeker?.location || 'N/A'}
                  </Text>
                  <Text style={[styles.modalRow, isDarkMode ? styles.darkText : styles.lightText]}>
                    <Text style={styles.bold}>Experience:</Text> {selectedSeeker?.experience || 'Not specified'}
                  </Text>
                  <Text style={[styles.modalRow, isDarkMode ? styles.darkText : styles.lightText]}>
                    <Text style={styles.bold}>Expected Salary:</Text> {selectedSeeker?.
expectedCTC || 'Not disclosed'}
                  </Text>
                  <Text style={[styles.modalRow, isDarkMode ? styles.darkText : styles.lightText]}>
                    <Text style={styles.bold}>Phone:</Text> {selectedSeeker?.whatsappNumber || 'N/A'}
                  </Text>

                  {selectedSeeker?.phoneNumber && (
                    <TouchableOpacity
                      style={styles.callButton}
                      onPress={() => handleCallToHR(selectedSeeker.phoneNumber)}
                    >
                      <Text style={styles.callButtonText}>📞 Call Seeker</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        </Modal> */}

        {/* Seeker Details Modal */}
<Modal visible={showSeekerDetails} transparent animationType="slide">
  <View style={styles.modalContainer}>
    <View style={[styles.modalContent, isDarkMode ? styles.darkCard : styles.lightCard]}>
      
      {/* Modal Header */}
      <View style={styles.modalHeader}>
        <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>
          ⚙ Seeker Details
        </Text>
        <TouchableOpacity onPress={() => setShowSeekerDetails(false)}>
          <Text style={[styles.closeButtonText, isDarkMode ? styles.darkText : styles.lightText]}>
            ✖
          </Text>
        </TouchableOpacity>
      </View>

      {/* Seeker Details */}
      {selectedSeeker && (
        <>
          <View style={styles.detailRow}>
            <Ionicons name="person-circle-outline" size={20} color="#555" style={styles.detailIcon} />
            <Text style={[styles.modalRow, isDarkMode ? styles.darkText : styles.lightText]}>
              <Text style={styles.bold}>Name:</Text> {selectedSeeker?.fullName || 'N/A'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="code-slash-outline" size={20} color="#555" style={styles.detailIcon} />
            <Text style={[styles.modalRow, isDarkMode ? styles.darkText : styles.lightText]}>
              <Text style={styles.bold}>Skills:</Text> {selectedSeeker?.skills?.join(', ') || 'N/A'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color="#555" style={styles.detailIcon} />
            <Text style={[styles.modalRow, isDarkMode ? styles.darkText : styles.lightText]}>
              <Text style={styles.bold}>Location:</Text> {selectedSeeker?.location || 'N/A'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="briefcase-outline" size={20} color="#555" style={styles.detailIcon} />
            <Text style={[styles.modalRow, isDarkMode ? styles.darkText : styles.lightText]}>
              <Text style={styles.bold}>Experience:</Text> {selectedSeeker?.experience || 'Not specified'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={20} color="#555" style={styles.detailIcon} />
            <Text style={[styles.modalRow, isDarkMode ? styles.darkText : styles.lightText]}>
              <Text style={styles.bold}>Expected Salary:</Text> {selectedSeeker?.expectedCTC || 'Not disclosed'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={20} color="#555" style={styles.detailIcon} />
            <Text style={[styles.modalRow, isDarkMode ? styles.darkText : styles.lightText]}>
              <Text style={styles.bold}>Phone:</Text> {selectedSeeker?.whatsappNumber || 'N/A'}
            </Text>
          </View>
          
        </>
      )}

      {/* Full width Call Button at bottom */}
      {selectedSeeker?.whatsappNumber && (
        <TouchableOpacity
          style={styles.fullWidthCallButton}
          onPress={() => handleCallToHR(selectedSeeker.whatsappNumber)}
        >
          <Text style={styles.fullWidthCallButtonText}>📞 Contact Seeker</Text>
        </TouchableOpacity>
      )}

    </View>
  </View>
</Modal>

       <Modal visible={showHRModal} transparent animationType="slide">
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, isDarkMode ? styles.darkModalContent : styles.lightModalContent]}>
              
              {/* Modal Header with Close Button */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>📞 HR Contact</Text>
                <TouchableOpacity onPress={() => setShowHRModal(false)}>
                  <Text style={[styles.closeButtonText, isDarkMode ? styles.darkText : styles.lightText]}>✖</Text>
                </TouchableOpacity>
              </View>
        
              {/* HR Info */}
              {/* <Text style={[styles.modalRow, isDarkMode ? styles.darkText : styles.lightText]}>
                <Text style={styles.bold}>HR Name:</Text> {selectedJob?.postedBy?.hrName || 'N/A'}
              </Text> */}
              <Text style={[styles.modalRow, isDarkMode ? styles.darkText : styles.lightText]}>
                <Text style={styles.bold}>Contact:</Text> {selectedJob?.postedBy?.hrWhatsappNumber || 'N/A'}
              </Text>
        
              {/* Call Button */}
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => {
                  handleCallToHR(selectedJob?.postedBy?.hrWhatsappNumber);
                  setShowHRModal(false);
                }}
              >
                <Text style={styles.callButtonText}>📞 Call Now</Text>
              </TouchableOpacity>
        
            </View>
          </View>
        </Modal>


        <Toast />
      </View>
      <Footer isDarkMode={isDarkMode} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
   
  },
  lightContainer: {
    backgroundColor: '#fff',
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 50,
    marginBottom: 12,
  },
  lightSearchInputContainer: {
    backgroundColor: '#f0f0f0',
  },
  darkSearchInputContainer: {
    backgroundColor: '#222',
  },
  searchButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginTop: 16,
    elevation: 2,
  },
  searchText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '600',
  },
  jobCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  lightCard: {
    backgroundColor: '#fff',
    borderColor: '#eee',
  },
  darkCard: {
    backgroundColor: '#333',
    borderColor: '#444',
  },
  viewMoreButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#e0e0e0',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 5,
    zIndex: 10,
  },
  viewMoreText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    marginBottom: 4,
  },
  jobDetail: {
    fontSize: 14,
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 10,
  },
  applyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginRight: 10,
  },
  appliedButton: {
    backgroundColor: '#666',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00000099',
  },
  modalContent: {
    padding: 20,
    borderRadius: 10,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalRow: {
    fontSize: 14,
    marginBottom: 6,
  },
  bold: {
    fontWeight: 'bold',
  },
  callButton: {
    backgroundColor: '#007AFF',
    marginTop: 12,
    padding: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  callButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  messageText: {
    textAlign: 'center',
    marginTop: 20,
  },
  lightText: {
    color: '#000',
  },
  darkText: {
    color: '#fff',
  },
  detailRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginVertical: 5,
},

detailIcon: {
  marginRight: 8,
},fullWidthCallButton: {
  marginTop: 17,
  backgroundColor: '#28a745', // green button
  paddingVertical: 10,
  borderRadius: 8,
  alignItems: 'center',
  width: '100%', // ✅ makes button full width of container
},

fullWidthCallButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
},


  
});




















// import React, { useState, useEffect } from 'react';
// import {
//   View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Linking, Modal,
// } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
// import axios from 'axios';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { getProfile, searchJobs, applyToJob } from '../utils/api';
// import Header from '../components/Header';
// import Footer from '../components/Footer';
// import { Ionicons, Entypo } from '@expo/vector-icons';
// import Icon from 'react-native-vector-icons/FontAwesome';
// import Toast from 'react-native-toast-message';
// import RNPickerSelect from 'react-native-picker-select'; // ✅ <-- ADD THIS LINE



// const jobOptions = [
//   { label: 'Accountant', value: 'Accountant' },
//   { label: 'Security Guard', value: 'Security Guard' },
//   { label: 'Laundry', value: 'Laundry' },
//   { label: 'Housekeeping', value: 'Housekeeping' },
//   { label: 'Cook', value: 'Cook' },
//   { label: 'Driver', value: 'Driver' },
//   { label: 'Receptionist', value: 'Receptionist' },
// ];

// const locationOptions = [
//   { label: 'Bhopal', value: 'Bhopal' },
//   { label: 'Indore', value: 'Indore' },
//   { label: 'Gwalior', value: 'Gwalior' },
//   { label: 'Delhi', value: 'Delhi' },
//   { label: 'Mumbai', value: 'Mumbai' },
//   { label: 'Bangalore', value: 'Bangalore' },
//   { label: 'Pune', value: 'Pune' },
// ];

// export default function JobResultsScreen({ isDarkMode, toggleDarkMode, route }) {
//   const [user, setUser] = useState(route?.params?.user || null);
//   const [searchSkills, setSearchSkills] = useState('');
//   const [searchLocation, setSearchLocation] = useState('');
//   const [suggestedJobs, setSuggestedJobs] = useState([]);
//   const [message, setMessage] = useState('');
//   const [appliedJobs, setAppliedJobs] = useState([]);
//   const [hasSearched, setHasSearched] = useState(false);
//   const [showJobDetails, setShowJobDetails] = useState(false);
//   const [selectedJob, setSelectedJob] = useState(null);
//   const [seekerQuery, setSeekerQuery] = useState('');
// const [locationQuery, setLocationQuery] = useState('');
//   const navigation = useNavigation();

//  const pickerStyle = {
//   inputIOS: {
//     fontSize: 15,
//     paddingVertical: 12,
//     paddingHorizontal: 14,
//     borderRadius: 10,
//     color: isDarkMode ? '#fff' : '#000',
//     backgroundColor: isDarkMode ? '#333' : '#f2f2f2',
//   },
//   inputAndroid: {
//     fontSize: 15,
//     paddingVertical: 12,
//     paddingHorizontal: 14,
//     borderRadius: 10,
//     color: isDarkMode ? '#fff' : '#000',
//     backgroundColor: isDarkMode ? '#333' : '#f2f2f2',
//   },
//   inputWeb: {
//     fontSize: 15,
//     paddingVertical: 12,
//     paddingHorizontal: 14,
//     borderRadius: 10,
//     color: isDarkMode ? '#fff' : '#000',
//     backgroundColor: isDarkMode ? '#333' : '#f2f2f2',
//     borderWidth: 0,
//     appearance: 'none',
//     outline: 'none',
//   },
//   placeholder: {
//     color: '#888',
//     fontSize: 15,
//   },
//   iconContainer: {
//     top: 12,
//     right: 12,
//   },
// };

//   useEffect(() => {
//     const init = async () => {
//       const storedUser = await AsyncStorage.getItem('user');
//       if (storedUser) {
//         const parsed = JSON.parse(storedUser);
//         setUser(parsed);
//         setAppliedJobs(parsed.appliedJobs || []);
//       }
//     };
//     init();
//   }, []);

//   const handleSearch = async () => {
//     try {
//       setHasSearched(true);
//       const searchData = {
//         skills: searchSkills.split(',').map(s => s.trim()).filter(Boolean),
//         location: searchLocation.trim(),
//         available: true,
//       };

//       const response = await searchJobs(searchData);
//       const jobs = response.data.map(job => ({
//         ...job,
//         applied: appliedJobs.some(j => j.jobId === job._id),
//       }));

//       setSuggestedJobs(jobs);
//       setMessage(jobs.length === 0 ? 'No jobs found' : '');
//     } catch (error) {
//       console.error('Search error:', error);
//       setMessage('Error searching jobs');
//     }
//   };

//   const handleApply = async (jobId) => {
//     try {
//       await applyToJob({ seekerId: user._id, jobId });
//       const updatedJobs = [
//         ...appliedJobs.filter(j => j.jobId !== jobId),
//         { jobId, title: 'Job', status: 'Applied' }
//       ];
//       setAppliedJobs(updatedJobs);
//       setSuggestedJobs(jobs => jobs.map(j => j._id === jobId ? { ...j, applied: true } : j));
//       Toast.show({ type: 'success', text1: 'Applied successfully', position: 'top' });
//     } catch {
//       Toast.show({ type: 'error', text1: 'Apply failed', position: 'top' });
//     }
//   };

//   const handleWhatsAppConnect = async (number, jobId, title) => {
//     try {
//       await axios.post(`https://jobconnectqa-2.onrender.com/api/jobs/apply-job`, {
//         seekerId: user._id,
//         jobId,
//         title,
//         status: 'Connected',
//       });
//       if (!number.startsWith('+')) number = '+91' + number;
//       Linking.openURL(`https://api.whatsapp.com/send?phone=${number}&text=Hi, I'm interested in your job posting: ${title}`);
//     } catch (e) {
//       console.error('WhatsApp error:', e);
//     }
//   };

//   const handleCallToHR = (phoneNumber) => {
//     if (!phoneNumber) return;
//     const phoneUrl = `tel:${phoneNumber}`;
//     Linking.openURL(phoneUrl).catch(err =>
//       console.error('Failed to open dialer', err)
//     );
//   };

//   const renderJobItem = ({ item }) => (
//     <View
//       style={[
//         styles.jobCard,
//         isDarkMode ? styles.darkCard : styles.lightCard,
//         { position: 'relative' },
//       ]}
//     >
//       <TouchableOpacity
//         style={styles.viewMoreButton}
//         onPress={() => {
//           setSelectedJob(item);
//           setShowJobDetails(true);
//         }}
//       >
//         <Text style={styles.viewMoreText}>View More</Text>
//       </TouchableOpacity>

//       <Text
//         style={[
//           styles.jobTitle,
//           isDarkMode ? styles.darkText : styles.lightText,
//         ]}
//       >
//         <Text style={styles.bold}>Job Name: </Text>
//         {item.jobTitle || item.skills?.join(', ') || 'Job Opportunity'}
//       </Text>
      
//       {/* Company Name */}
//       <Text
//         style={[
//           styles.companyName,
//           isDarkMode ? styles.darkText : styles.lightText,
//         ]}
//       >
//         <Text style={styles.bold}>Company: </Text>
//         {item.postedBy?.companyName || 'Company Name'}
//       </Text>
      
//       {/* Location */}
//       <Text
//         style={[
//           styles.jobDetail,
//           isDarkMode ? styles.darkText : styles.lightText,
//         ]}
//       >
//         <Icon name="map-marker" size={12} /> <Text style={styles.bold}>Location: </Text>
//         {item.location || 'Not specified'}
//       </Text>
      
//       {/* Salary */}
//       <Text
//         style={[
//           styles.jobDetail,
//           isDarkMode ? styles.darkText : styles.lightText,
//         ]}
//       >
//         <Icon name="money" size={12} /> <Text style={styles.bold}>Salary: </Text>
//         {item.maxCTC || 'Not disclosed'}
//       </Text>

//       <View style={styles.actionButtons}>
//         <TouchableOpacity
//           style={[styles.applyButton, item.applied && styles.appliedButton]}
//           onPress={() => handleApply(item._id)}
//           disabled={item.applied}
//         >
//           <Text style={styles.buttonText}>
//             {item.applied ? 'Applied' : 'Apply'}
//           </Text>
//         </TouchableOpacity>

//         {item.postedBy?.hrWhatsappNumber && (
//           <TouchableOpacity
//             style={styles.whatsappButton}
//             onPress={() =>
//               handleWhatsAppConnect(
//                 item.postedBy.hrWhatsappNumber,
//                 item._id,
//                 item.jobTitle
//               )
//             }
//           >
//             <Icon name="whatsapp" size={16} color="#fff" />
//             <Text style={styles.buttonText}> WhatsApp</Text>
//           </TouchableOpacity>
//         )}
//       </View>
//     </View>
//   );

//   return (
//     <View style={{ flex: 1 }}>
//       <Header title="Search Jobs" toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
//       <View style={styles.container}>
//       <View
//   style={{
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     borderRadius: 50,
//     backgroundColor: isDarkMode ? '#222' : '#f0f0f0',
//     marginBottom: 12,
//   }}
// >
//   <Ionicons name="briefcase" size={20} color={isDarkMode ? '#ccc' : '#555'} style={{ marginRight: 8 }} />
//   <View style={{ flex: 1 }}>
//     <RNPickerSelect
//       onValueChange={(value) => {
//         setSeekerQuery(value);
//         setSearchSkills(value);
//       }}
//       placeholder={{ label: 'Search by Skill (Dropdown)', value: '' }}
//       items={jobOptions}
//       style={pickerStyle}
//       value={seekerQuery}
//       useNativeAndroidPickerStyle={false}
//       Icon={() => (
//         <Ionicons name="chevron-down" size={20} color={isDarkMode ? '#aaa' : '#555'} />
//       )}
//     />
//   </View>
// </View>


// <View
//   style={{
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     borderRadius: 50,
//     backgroundColor: isDarkMode ? '#222' : '#f0f0f0',
//     marginBottom: 12,
//   }}
// >
//   <Entypo name="location-pin" size={20} color={isDarkMode ? '#ccc' : '#555'} style={{ marginRight: 8 }} />
//   <View style={{ flex: 1 }}>
//     <RNPickerSelect
//       onValueChange={(value) => {
//         setLocationQuery(value);
//         setSearchLocation(value);
//       }}
//       placeholder={{ label: 'Location (Dropdown)', value: '' }}
//       items={locationOptions}
//       style={pickerStyle}
//       value={locationQuery}
//       useNativeAndroidPickerStyle={false}
//       Icon={() => (
//         <Ionicons name="chevron-down" size={20} color={isDarkMode ? '#aaa' : '#555'} />
//       )}
//     />
//   </View>
// </View>


//         <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
//           <Ionicons name="search" size={20} color="white" />
//           <Text style={styles.searchText}>Search</Text>
//         </TouchableOpacity>

//         {hasSearched && (
//           message ? (
//             <Text style={{ textAlign: 'center', marginTop: 20 }}>{message}</Text>
//           ) : (
//             <FlatList
//               data={suggestedJobs}
//               keyExtractor={(item, index) => item?._id || `job-${index}`}
//               renderItem={renderJobItem}
//               contentContainerStyle={{ marginTop: 20 }}
//             />
//           )
//         )}

//         <Modal visible={showJobDetails} transparent animationType="slide">
//           <View style={styles.modalContainer}>
//             <View style={styles.modalContent}>
//               <View style={styles.modalHeader}>
//                 <Text style={styles.modalTitle}>⚙ Job Details</Text>
//                 <TouchableOpacity onPress={() => setShowJobDetails(false)}>
//                   <Text style={styles.closeButtonText}>✖</Text>
//                 </TouchableOpacity>
//               </View>

//               {selectedJob && (
//                 <>
//                   <Text style={styles.modalRow}><Text style={styles.bold}>HR Name:</Text> {selectedJob?.postedBy?.hrName || 'N/A'}</Text>
//                   <Text style={styles.modalRow}><Text style={styles.bold}>Company:</Text> {selectedJob?.postedBy?.companyName || 'N/A'}</Text>
//                   <Text style={styles.modalRow}><Text style={styles.bold}>Location:</Text> {selectedJob?.location || 'N/A'}</Text>
//                   <Text style={styles.modalRow}><Text style={styles.bold}>Salary:</Text> {selectedJob?.maxCTC || 'Not disclosed'}</Text>
//                   <Text style={styles.modalRow}><Text style={styles.bold}>WhatsApp:</Text> {selectedJob?.postedBy?.hrWhatsappNumber || 'N/A'}</Text>

//                   {selectedJob.postedBy?.hrWhatsappNumber && (
//                     <TouchableOpacity
//                       style={styles.callButton}
//                       onPress={() =>
//                         handleCallToHR(selectedJob.postedBy.hrWhatsappNumber)
//                       }
//                     >
//                       <Text style={styles.callButtonText}>📞 Call to HR WhatsApp No</Text>
//                     </TouchableOpacity>
//                   )}
//                 </>
//               )}
//             </View>
//           </View>
//         </Modal>

//         <Toast />
//       </View>
//       <Footer isDarkMode={isDarkMode} />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, padding: 16, backgroundColor: '#fff' },
//   inputContainer: {
//     flexDirection: 'row', alignItems: 'center',
//     borderWidth: 1, borderColor: '#ddd', borderRadius: 12,
//     paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, backgroundColor: '#f9f9f9'
//   },
//   icon: { marginRight: 8, color: '#555' },
//   textInput: { flex: 1, fontSize: 15, color: '#000' },
//   searchButton: {
//     flexDirection: 'row', backgroundColor: '#007AFF',
//     paddingVertical: 14, justifyContent: 'center',
//     alignItems: 'center', borderRadius: 10, marginTop: 16, elevation: 2
//   },
//   searchText: { color: '#fff', fontSize: 16, marginLeft: 8, fontWeight: '600' },
//   jobCard: {
//     backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee',
//     borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2
//   },
//  // View More (top-right)
//   viewMoreButton: {
//     position: 'absolute',
//     top: 8,
//     right: 8,
//     backgroundColor: '#e0e0e0',
//     paddingVertical: 4,
//     paddingHorizontal: 10,
//     borderRadius: 5,
//     zIndex: 10,
//   },
//   viewMoreText: {
//     fontSize: 12,
//     fontWeight: 'bold',
//     color: '#333',
//   },

//    // Buttons
//   actionButtons: {
//     flexDirection: 'row',
//     marginTop: 10,
//   },
//   applyButton: {
//     backgroundColor: '#007AFF',
//     paddingVertical: 8,
//     paddingHorizontal: 15,
//     borderRadius: 5,
//     marginRight: 10,
//   },
//   appliedButton: {
//     backgroundColor: '#666',
//   },
//   whatsappButton: {
//     backgroundColor: '#25D366',
//     paddingVertical: 8,
//     paddingHorizontal: 15,
//     borderRadius: 5,
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   buttonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//   },
//   lightButton: {
//     backgroundColor: '#007AFF',
//   },
//   darkButton: {
//     backgroundColor: '#005BB5',
//   },

//   jobTitle: { fontSize: 16, fontWeight: 'bold', color: '#222', marginBottom: 4 },
//   companyName: { fontSize: 14, color: '#666', marginBottom: 4 },
//   jobDetail: { fontSize: 14, color: '#444', marginBottom: 4 },
//   jobActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
//   actionButton: {
//     flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
//     paddingVertical: 12, borderRadius: 8, width: '48%'
//   },
//   lightButton: { backgroundColor: '#25D366' },
//   darkButton: { backgroundColor: '#555' },
//   disabledButton: { backgroundColor: '#ccc' },
//   buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginLeft: 6 },
//   modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#00000099' },
//   modalContent: {
//     backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '90%',
//     shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4
//   },
//   modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
//   modalTitle: { fontSize: 18, fontWeight: 'bold' },
//   closeButtonText: { fontSize: 16, fontWeight: 'bold', },
//   modalRow: { fontSize: 14, marginBottom: 6 },
//   bold: { fontWeight: 'bold' },
//   callButton: {
//     backgroundColor: '#007AFF', marginTop: 12, padding: 10,
//     borderRadius: 8, alignItems: 'center'
//   },
//   callButtonText: { color: '#fff', fontWeight: 'bold' },
//   fullWidthDropdownContainer: {
//   flexDirection: 'row',
//   alignItems: 'center',
//   borderRadius: 12,
//   paddingHorizontal: 12,
//   paddingVertical: 10,
//   marginBottom: 12,
//   width: '100%',
// },

// lightSearchInputContainer: {
//   backgroundColor: '#f9f9f9',
// },

// darkSearchInputContainer: {
//   backgroundColor: '#333',
// },

// });














// // import React, { useState, useEffect, useReducer } from 'react';
// // import {
// //   View, Text, TouchableOpacity, FlatList, StyleSheet, Animated, Linking, ActivityIndicator
// // } from 'react-native';
// // import { useNavigation } from '@react-navigation/native';
// // import AsyncStorage from '@react-native-async-storage/async-storage';
// // import { getProfile, searchJobs, applyToJob, getTrendingSkills, searchSeekers } from '../utils/api';
// // import { Ionicons, MaterialIcons } from '@expo/vector-icons';
// // import Toast from 'react-native-toast-message';
// // import RNPickerSelect from 'react-native-picker-select';

// // const jobOptions = [
// //   { label: 'Accountant', value: 'Accountant' },
// //   { label: 'Security Guard', value: 'Security Guard' },
// //   { label: 'Laundry', value: 'Laundry' },
// //   { label: 'Housekeeping', value: 'Housekeeping' },
// //   { label: 'Cook', value: 'Cook' },
// //   { label: 'Driver', value: 'Driver' },
// //   { label: 'Receptionist', value: 'Receptionist' },
// // ];

// // const locationOptions = [
// //   { label: 'Bhopal', value: 'Bhopal' },
// //   { label: 'Indore', value: 'Indore' },
// //   { label: 'Gwalior', value: 'Gwalior' },
// //   { label: 'Delhi', value: 'Delhi' },
// //   { label: 'Mumbai', value: 'Mumbai' },
// //   { label: 'Bangalore', value: 'Bangalore' },
// //   { label: 'Pune', value: 'Pune' },
// // ];

// // export default function JobResultsScreen({ isDarkMode, toggleDarkMode, route }) {
// //   const [user, setUser] = useState(route?.params?.user || null);
// //   const [searchSkills, setSearchSkills] = useState('');
// //   const [searchLocation, setSearchLocation] = useState('');
// //   const [suggestedJobs, setSuggestedJobs] = useState([]);
// //   const [message, setMessage] = useState('');
// //   const [appliedJobs, setAppliedJobs] = useState([]);
// //   const navigation = useNavigation();
// //   const [role, setRole] = useState(route.params?.role || 'seeker');
// //   const [isSearching, setIsSearching] = useState(false);
// //   const [seekers, setSeekers] = useState([]);
// //  console.log("user",user)
// //   const pickerStyle = {
// //     inputIOS: {
// //       fontSize: 15,
// //       paddingVertical: 7,
// //       paddingHorizontal: 9,
// //       color: isDarkMode ? '#ddd' : '#333',
// //       width: '100%',
// //       borderWidth: 0,
// //       borderColor: 'transparent',
// //     },
// //     inputAndroid: {
// //       fontSize: 15,
// //       paddingVertical: 7,
// //       paddingHorizontal: 9,
// //       color: isDarkMode ? '#ddd' : '#333',
// //       width: '100%',
// //       borderWidth: 0,
// //       borderColor: 'transparent',
// //     },
// //     placeholder: {
// //       color: isDarkMode ? '#888' : '#999',
// //     },
// //   };

// //   const normalizeString = (str) => str.replace(/\s+/g, '').toLowerCase();

// //   const handleSearch = async () => {
// //     setIsSearching(true);
// //     try {
// //       if (role === 'provider') {
// //         const response = await searchSeekers({
// //           skills: searchSkills ? [searchSkills] : [],
// //           location: searchLocation,
// //         });
// //         setSeekers(response.data);
// //         setMessage(response.data.length === 0 ? 'No seekers found matching your criteria' : '');
// //       } else {
// //         // For seekers, use the searchJobs API with client-side filtering
// //         const response = await searchJobs({
// //           skills: searchSkills ? [searchSkills] : [],
// //           location: searchLocation,
// //           available: true,
// //         });
        
// //         setSuggestedJobs(response.data);
// //         setMessage(response.data.length === 0 ? 'No jobs found matching your criteria' : '');
// //       }
// //     } catch (error) {
// //       console.error('Search Error:', error);
// //       setMessage('Error searching: ' + (error.response?.data?.message || error.message));
// //       Toast.show({
// //         type: 'error',
// //         text1: 'Search Failed',
// //         text2: 'Failed to perform search',
// //       });
// //     } finally {
// //       setIsSearching(false);
// //     }
// //   };

// //   const renderSeekerItem = ({ item }) => (
// //     <View style={[styles.itemContainer, isDarkMode ? styles.darkItem : styles.lightItem]}>
// //       <Text style={[styles.itemTitle, isDarkMode ? styles.darkText : styles.lightText]}>
// //         {item.name}
// //       </Text>
// //       <Text style={[styles.itemDetail, isDarkMode ? styles.darkDetailText : styles.lightDetailText]}>
// //         Skills: {item.skills}
// //       </Text>
// //       <Text style={[styles.itemDetail, isDarkMode ? styles.darkDetailText : styles.lightDetailText]}>
// //         Location: {item.location}
// //       </Text>
// //       <TouchableOpacity
// //         style={[styles.contactButton, isDarkMode ? styles.darkButton : styles.lightButton]}
// //         onPress={() => Linking.openURL(`tel:${item.contactPhone}`)}
// //       >
// //         <Text style={styles.buttonText}>Contact</Text>
// //       </TouchableOpacity>
// //     </View>
// //   );

// //   const renderJobItem = ({ item }) => (
// //     <View style={[styles.itemContainer, isDarkMode ? styles.darkItem : styles.lightItem]}>
// //       <Text style={[styles.itemTitle, isDarkMode ? styles.darkText : styles.lightText]}>
// //         {item.title}
// //       </Text>
// //       <Text style={[styles.itemDetail, isDarkMode ? styles.darkDetailText : styles.lightDetailText]}>
// //         {item.company} - {item.location}
// //       </Text>
// //       <Text style={[styles.itemDetail, isDarkMode ? styles.darkDetailText : styles.lightDetailText]}>
// //         Skills: {item.skills?.join(', ')}
// //       </Text>
// //       <View style={styles.buttonContainer}>
// //         <TouchableOpacity
// //           style={[
// //             styles.actionButton,
// //             item.applied ? styles.disabledButton : (isDarkMode ? styles.darkButton : styles.lightButton)
// //           ]}
// //           disabled={item.applied}
// //           onPress={() => handleApply(item._id)}
// //         >
// //           <Text style={styles.buttonText}>
// //             {item.applied ? 'Applied' : 'Apply'}
// //           </Text>
// //         </TouchableOpacity>
// //         <TouchableOpacity
// //           style={[styles.actionButton, isDarkMode ? styles.darkButton : styles.lightButton]}
// //           onPress={() => Linking.openURL(`tel:${item.contactPhone}`)}
// //         >
// //           <Text style={styles.buttonText}>Contact</Text>
// //         </TouchableOpacity>
// //       </View>
// //     </View>
// //   );

// //   const keyExtractor = (item) => item._id || item.id;

// //   const handleApply = async (jobId) => {
// //     try {
// //       const response = await applyToJob({ jobId, seekerId: user._id });
// //       if (response.success) {
// //         Toast.show({
// //           type: 'success',
// //           text1: 'Application submitted',
// //           text2: 'Your application has been sent successfully',
// //         });
// //         setAppliedJobs([...appliedJobs, { jobId }]);
// //         setSuggestedJobs(suggestedJobs.map(job => 
// //           job._id === jobId ? { ...job, applied: true } : job
// //         ));
// //       }
// //     } catch (error) {
// //       Toast.show({
// //         type: 'error',
// //         text1: 'Application failed',
// //         text2: error.response?.data?.message || 'Failed to submit application',
// //       });
// //     }
// //   };

// //   useEffect(() => {
// //     const init = async () => {
// //       try {
// //         const storedUser = await AsyncStorage.getItem('user');
// //         if (storedUser) {
// //           const parsedUser = JSON.parse(storedUser);
// //           setUser(parsedUser);
// //           setAppliedJobs(parsedUser.appliedJobs || []);
// //         } else if (route?.params?.contact) {
// //           const isEmail = route.params.contact.includes('@');
// //           const response = await getProfile({
// //             role: 'seeker',
// //             ...(isEmail ? { email: route.params.contact } : { whatsappNumber: route.params.contact }),
// //           });
// //           const fetchedUser = response.data || {};
// //           setUser(fetchedUser);
// //           setAppliedJobs(fetchedUser.appliedJobs || []);
// //           await AsyncStorage.setItem('user', JSON.stringify({ ...fetchedUser, role: 'seeker' }));
// //         } else {
// //           navigation.navigate('JobsList');
// //         }
// //       } catch (error) {
// //         console.error('Initialization error:', error);
// //         navigation.navigate('AuthForm', { role: 'seeker' });
// //       }
// //     };

// //     init();
// //   }, [route, navigation]);

// //   const renderDropdown = (options, selectedValue, onChange, placeholder, iconName) => (
// //     <View style={[
// //       styles.dropdownContainer,
// //       isDarkMode ? styles.darkDropdown : styles.lightDropdown
// //     ]}>
// //       <MaterialIcons
// //         name={iconName}
// //         size={20}
// //         color={isDarkMode ? '#aaa' : '#555'}
// //       />
// //       <View style={{ flex: 1 }}>
// //         <RNPickerSelect
// //           onValueChange={onChange}
// //           placeholder={{ label: placeholder, value: '' }}
// //           items={options}
// //           style={{
// //             ...pickerStyle,
// //             inputIOS: {
// //               ...pickerStyle.inputIOS,
// //               width: '100%',
// //             },
// //             inputAndroid: {
// //               ...pickerStyle.inputAndroid,
// //               width: '100%',
// //             },
// //           }}
// //           value={selectedValue}
// //           useNativeAndroidPickerStyle={false}
// //           Icon={() => (
// //             <MaterialIcons
// //               name="arrow-drop-down"
// //               size={20}
// //               color={isDarkMode ? '#aaa' : '#555'}
// //             />
// //           )}
// //         />
// //       </View>
// //     </View>
// //   );

// //   return (
// //     <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
// //       <View style={[styles.searchSection, isDarkMode ? styles.darkSearchSection : styles.lightSearchSection]}>
// //         <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : styles.lightText]}>
// //           {role === 'provider' ? 'Search Job Seekers' : 'Search Jobs'}
// //         </Text>

// //         <View style={styles.searchContent}>
// //           {renderDropdown(
// //             jobOptions,
// //             searchSkills,
// //             setSearchSkills,
// //             role === 'provider' ? 'Search by Skill' : 'Search by Job Type',
// //             'work'
// //           )}

// //           {renderDropdown(
// //             locationOptions,
// //             searchLocation,
// //             setSearchLocation,
// //             'Select Location',
// //             'location-on'
// //           )}

// //           <TouchableOpacity
// //             style={[
// //               styles.searchButton,
// //               isDarkMode ? styles.darkSearchButton : styles.lightSearchButton,
// //             ]}
// //             onPress={handleSearch}
// //             disabled={isSearching}
// //           >
// //             {isSearching ? (
// //               <ActivityIndicator color="#fff" />
// //             ) : (
// //               <>
// //                 <Ionicons name="search" size={20} color="white" />
// //                 <Text style={styles.searchButtonText}>
// //                   {role === 'provider' ? 'Search Seekers' : 'Search Jobs'}
// //                 </Text>
// //               </>
// //             )}
// //           </TouchableOpacity>
// //         </View>
// //       </View>

// //       {message ? (
// //         <Text style={[styles.messageText, isDarkMode ? styles.darkText : styles.lightText]}>{message}</Text>
// //       ) : (
// //         <FlatList
// //           data={role === 'provider' ? seekers : suggestedJobs}
// //           renderItem={role === 'provider' ? renderSeekerItem : renderJobItem}
// //           keyExtractor={keyExtractor}
// //           contentContainerStyle={{ paddingBottom: 20 }}
// //         />
// //       )}

// //       <Toast />
// //     </View>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: {
// //     flex: 1,
// //     padding: 16,
// //   },
// //   lightContainer: {
// //     backgroundColor: '#f5f5f5',
// //   },
// //   darkContainer: {
// //     backgroundColor: '#121212',
// //   },
// //   searchSection: {
// //     borderRadius: 12,
// //     padding: 16,
// //     marginBottom: 20,
// //     shadowColor: '#000',
// //     shadowOffset: { width: 0, height: 2 },
// //     shadowOpacity: 0.1,
// //     shadowRadius: 4,
// //     elevation: 2,
// //   },
// //   lightSearchSection: {
// //     backgroundColor: '#fff',
// //   },
// //   darkSearchSection: {
// //     backgroundColor: '#1e1e1e',
// //   },
// //   searchContent: {
// //     paddingTop: 12,
// //   },
// //   sectionTitle: {
// //     fontSize: 18,
// //     fontWeight: 'bold',
// //     marginBottom: 12,
// //   },
// //   dropdownContainer: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     borderWidth: 1,
// //     borderRadius: 8,
// //     paddingHorizontal: 12,
// //     marginBottom: 12,
// //     height: 50,
// //   },
// //   lightDropdown: {
// //     borderColor: '#ddd',
// //     backgroundColor: '#f9f9f9',
// //   },
// //   darkDropdown: {
// //     borderColor: '#444',
// //     backgroundColor: '#2d2d2d',
// //   },
// //   searchButton: {
// //     padding: 14,
// //     borderRadius: 8,
// //     alignItems: 'center',
// //     justifyContent: 'center',
// //     marginTop: 8,
// //     shadowColor: '#000',
// //     shadowOffset: { width: 0, height: 2 },
// //     shadowOpacity: 0.2,
// //     shadowRadius: 4,
// //     elevation: 3,
// //     flexDirection: 'row',
// //   },
// //   lightSearchButton: {
// //     backgroundColor: '#007AFF',
// //   },
// //   darkSearchButton: {
// //     backgroundColor: '#4a6da7',
// //   },
// //   searchButtonText: {
// //     color: '#fff',
// //     fontSize: 16,
// //     fontWeight: '600',
// //     marginLeft: 8,
// //   },
// //   itemContainer: {
// //     borderWidth: 1,
// //     borderRadius: 10,
// //     padding: 12,
// //     marginBottom: 16,
// //   },
// //   lightItem: {
// //     backgroundColor: '#fff',
// //     borderColor: '#ddd',
// //   },
// //   darkItem: {
// //     backgroundColor: '#1e1e1e',
// //     borderColor: '#444',
// //   },
// //   itemTitle: {
// //     fontSize: 16,
// //     fontWeight: 'bold',
// //     marginBottom: 4,
// //   },
// //   itemDetail: {
// //     fontSize: 14,
// //     marginTop: 6,
// //   },
// //   buttonContainer: {
// //     flexDirection: 'row',
// //     justifyContent: 'space-between',
// //     marginTop: 12,
// //   },
// //   actionButton: {
// //     padding: 10,
// //     borderRadius: 8,
// //     width: '48%',
// //     alignItems: 'center',
// //   },
// //   contactButton: {
// //     padding: 10,
// //     borderRadius: 8,
// //     width: '100%',
// //     alignItems: 'center',
// //     marginTop: 12,
// //   },
// //   lightButton: {
// //     backgroundColor: '#e0f7e9',
// //   },
// //   darkButton: {
// //     backgroundColor: '#333',
// //   },
// //   disabledButton: {
// //     opacity: 0.6,
// //   },
// //   buttonText: {
// //     fontWeight: 'bold',
// //     color: '#000',
// //   },
// //   lightText: {
// //     color: '#000',
// //   },
// //   darkText: {
// //     color: '#ddd',
// //   },
// //   lightDetailText: {
// //     color: '#555',
// //   },
// //   darkDetailText: {
// //     color: '#aaa',
// //   },
// //   messageText: {
// //     textAlign: 'center',
// //     marginTop: 20,
// //     paddingHorizontal: 20,
// //   },
// // });