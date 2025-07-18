import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Linking, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Toast from 'react-native-toast-message';

import {
  searchJobs,
  applyToJob,
  getProfile,
  getTrendingSkills,
} from '../utils/api';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function SeekerDashboard({ isDarkMode, toggleDarkMode, route }) {
 
  const [searchQuery, setSearchQuery] = useState('');
  const [jobs, setJobs] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [user, setUser] = useState(route?.params?.user |null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [filterApplied, setFilterApplied] = useState(null);
  const [showHRModal, setShowHRModal] = useState(false);
  const [selectedHRNumber, setSelectedHRNumber] = useState('');

  const navigation = useNavigation();

 useEffect(() => {
  const init = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      let currentUser = null;

      if (storedUser) {
        currentUser = JSON.parse(storedUser);
      } else if (route?.params?.contact) {
        const isEmail = route.params.contact.includes('@');
        const response = await getProfile({
          role: 'seeker',
          ...(isEmail
            ? { email: route.params.contact }
            : { whatsappNumber: route.params.contact }),
        });

        currentUser = response.data || {};

        // ✅ Handle missing name gracefully
        if (!currentUser.name) {
          currentUser.name =
            currentUser.fullName ||
            `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
            'Job Seeker';
        }

        await AsyncStorage.setItem('user', JSON.stringify(currentUser));
      }

      // ✅ Set name fallback again after loading from storage
      if (currentUser) {
        if (!currentUser.name) {
          currentUser.name =
            currentUser.fullName ||
            `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
            'Job Seeker';
        }

        setUser(currentUser);
        setAppliedJobs(currentUser.appliedJobs || []);
        fetchJobs(currentUser);
      } else {
        navigation.navigate('AuthForm', { role: 'seeker' });
      }
    } catch (error) {
      console.error('Init error:', error);
    }
  };

  init();
}, []);


  const fetchJobs = async (currentUser) => {
    try {
      const profile = {
        location: currentUser?.location || '',
        jobTitle:
          currentUser?.jobTitle ||
          (Array.isArray(currentUser?.skills) ? currentUser.skills[0] : ''),
      };

      const response = await getTrendingSkills(profile);

      const trendingJobs = (response?.data?.data || []).map(job => ({
        ...job,
        applied: currentUser.appliedJobs?.some(a => a.jobId === job._id),
      }));

      setJobs(trendingJobs);
    } catch (error) {
      console.error('Error fetching trending jobs:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to load jobs',
        text2: error.message || 'Unexpected error occurred.',
        position: 'top',
      });
    }
  };

 const handleApply = async (jobId) => {
  const appliedJob = jobs.find(job => job._id === jobId);
  setSelectedJob(appliedJob);

  // 👉 If already applied, open HR modal
  const alreadyApplied = appliedJobs.some(job => job.jobId === jobId);
  if (alreadyApplied || appliedJob?.applied) {
    setShowHRModal(true);
    return;
  }

  try {
    await applyToJob({ seekerId: user._id, jobId });

    const updatedJobs = jobs.map(job =>
      job._id === jobId ? { ...job, applied: true } : job
    );
    setJobs(updatedJobs);

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
  } catch (error) {
    Toast.show({
      type: 'error',
      text1: 'Apply Failed',
      text2: error.message || 'An error occurred.',
      position: 'top',
    });
  }
};


  const handleCallToHR = (number) => {
    if (!number) return;
    Linking.openURL(`tel:${number}`);
  };

  const handleWhatsAppConnect = async (
    number,
    jobId,
    jobTitle,
    jobLocation,
    companyName,
    hrName
  ) => {
    try {
      await axios.post(`https://jobconnectqa-2.onrender.com/api/jobs/apply-job`, {
        seekerId: user._id,
        jobId,
        title: jobTitle,
        status: 'Connected',
      });

      const updatedJobs = jobs.map(job =>
        job._id === jobId ? { ...job, applied: true } : job
      );
      setJobs(updatedJobs);

      const updatedAppliedJobs = [
        ...appliedJobs.filter(job => job.jobId !== jobId),
        {
          jobId,
          title: jobTitle,
          status: 'Connected',
        },
      ];
      const updatedUser = { ...user, appliedJobs: updatedAppliedJobs };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      if (!number.startsWith('+')) number = '+91' + number;

     const message = `Hello ${hrName || 'HR'},

I’m ${user?.name || 'a job seeker'}, and I’m interested in your job posting.

🔹 Job Title: ${jobTitle || 'Not specified'}
📍 Location: ${jobLocation || 'Not specified'}
🏢 Company: ${companyName || 'Not specified'}
📞 Seeker Contact: ${number || 'N/A'}

I believe my experience and skills match the requirements. Please let me know if the position is still open and how I can proceed further.

Thank you for your time!

Regards,
${user?.name || 'Job Seeker'}
📱 Contact: ${user?.phone || user?.email || 'N/A'}`;


      const whatsappURL = `https://api.whatsapp.com/send?phone=${number.replace(/\D/g, '')}&text=${encodeURIComponent(message)}`;
      Linking.openURL(whatsappURL);
    } catch (error) {
      console.error("Error connecting via WhatsApp:", error);
      Toast.show({
        type: 'error',
        text1: 'WhatsApp Connect Failed',
        text2: error.message || 'Something went wrong.',
        position: 'top',
      });
    }
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


  return (
    <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      <Header title="Seeker Dashboard" toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />

      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            isDarkMode ? styles.darkInput : styles.lightInput,
            { paddingRight: 40 },
          ]}
          placeholder="Search by job title or location..."
          placeholderTextColor={isDarkMode ? '#888' : '#999'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => {
            navigation.navigate('JobResultsScreen', { query: searchQuery.trim() });
          }}
        />
        <Icon
          name="search"
          size={20}
          color={isDarkMode ? '#aaa' : '#555'}
          style={styles.searchIconRight}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 15, marginBottom: 10 }}>
  <TouchableOpacity
    onPress={() => setFilterApplied(true)}
    style={{
      borderWidth: 1,
      borderColor: '#007AFF',
      borderTopLeftRadius: 50,
      borderBottomLeftRadius: 50,
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: filterApplied === true ? '#007AFF' : '#fff',
    }}
  >
    <Text style={{ color: filterApplied === true ? '#fff' : '#007AFF', fontWeight: 'bold' }}>Applied</Text>
  </TouchableOpacity>
  <TouchableOpacity
    onPress={() => setFilterApplied(false)}
    style={{
      borderWidth: 1,
      borderColor: '#007AFF',
      borderLeftWidth: 0,
      borderTopRightRadius: 50,
      borderBottomRightRadius: 50,
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: filterApplied === false ? '#007AFF' : '#fff',
    }}
  >
    <Text style={{ color: filterApplied === false ? '#fff' : '#007AFF', fontWeight: 'bold' }}>Not Applied</Text>
  </TouchableOpacity>
</View>


     <FlatList
  data={jobs.filter(job =>
    filterApplied === null
      ? true
      : filterApplied
        ? job.applied === true
        : job.applied === false
  )}
  renderItem={renderJobItem}
  keyExtractor={item => item._id}
  contentContainerStyle={styles.jobList}
/>

      {/* Job Details Modal */}
    {/* HR Contact Modal */}
<Modal visible={showJobDetails} transparent animationType="slide">
  <View style={styles.modalContainer}>
    <View
      style={[
        styles.modalContent,
        isDarkMode ? styles.darkModalContent : styles.lightModalContent,
      ]}
    >
      <View style={styles.modalHeader}>
        <Text
          style={[
            styles.modalTitle,
            isDarkMode ? styles.darkText : styles.lightText,
          ]}
        >
          ⚙ Job Details
        </Text>
        <TouchableOpacity onPress={() => setShowJobDetails(false)}>
          <Text
            style={[
              styles.closeButtonText,
              isDarkMode ? styles.darkText : styles.lightText,
            ]}
          >
            ✖
          </Text>
        </TouchableOpacity>
      </View>

      {/* Show job data */}
      {selectedJob && (
        <>
          <Text
            style={[
              styles.modalRow,
              isDarkMode ? styles.darkText : styles.lightText,
            ]}
          >
            <Text style={styles.bold}>HR Name:</Text>{' '}
            {selectedJob?.postedBy?.hrName || 'N/A'}
          </Text>
          <Text
            style={[
              styles.modalRow,
              isDarkMode ? styles.darkText : styles.lightText,
            ]}
          >
            <Text style={styles.bold}>Company Name:</Text>{' '}
            {selectedJob?.postedBy?.companyName || 'N/A'}
          </Text>
          <Text
            style={[
              styles.modalRow,
              isDarkMode ? styles.darkText : styles.lightText,
            ]}
          >
            <Text style={styles.bold}>Location:</Text>{' '}
            {selectedJob?.location || 'N/A'}
          </Text>
          <Text
            style={[
              styles.modalRow,
              isDarkMode ? styles.darkText : styles.lightText,
            ]}
          >
            <Text style={styles.bold}>Salary:</Text>{' '}
            {selectedJob?.maxCTC || 'Not disclosed'}
          </Text>
          <Text
            style={[
              styles.modalRow,
              isDarkMode ? styles.darkText : styles.lightText,
            ]}
          >
            <Text style={styles.bold}>HR WhatsApp No:</Text>{' '}
            {selectedJob?.postedBy?.hrWhatsappNumber || 'N/A'}
          </Text>

          {selectedJob?.postedBy?.hrWhatsappNumber && (
            <TouchableOpacity
              style={styles.callButton}
              onPress={() =>
                handleCallToHR(
                  selectedJob?.postedBy?.hrWhatsappNumber,
                  selectedJob?._id,
                  selectedJob?.jobTitle || selectedJob?.skills?.[0] || 'Job',
                  selectedJob?.location || 'N/A',
                  selectedJob?.postedBy?.companyName || 'N/A',
                  selectedJob?.postedBy?.hrName || 'HR'
                )
              }
            >
              <Text style={styles.callButtonText}>
                📞 Connect With HR
              </Text>
            </TouchableOpacity>
          )}
        </>
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
        <Text style={styles.callButtonText}>📞 Connect With HR</Text>
      </TouchableOpacity>

    </View>
  </View>
</Modal>

     


      <Toast/>
      <Footer isDarkMode={isDarkMode} />
    </View>
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

  // Search bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  darkSearchContainer: {
    backgroundColor: '#222',
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingRight: 35,
  },
  lightInput: {
    borderColor: '#ccc',
    backgroundColor: '#fff',
    color: '#333',
  },
  darkInput: {
    borderColor: '#444',
    backgroundColor: '#333',
    color: '#ddd',
  },
  searchIconRight: {
    position: 'absolute',
    right: 25,
    top: 26,
    zIndex: 1,
  },

  // Job List & Cards
  jobList: {
    padding: 10,
  },
  jobCard: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lightCard: {
    backgroundColor: '#fff',
  },
  darkCard: {
    backgroundColor: '#333',
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  companyName: {
    fontSize: 16,
    marginBottom: 5,
    color: '#555',
  },
  jobDetail: {
    fontSize: 14,
    marginBottom: 3,
  },
  darkText: {
    color: '#ddd',
  },
  lightText: {
    color: '#333',
  },

  // Buttons
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
  lightButton: {
    backgroundColor: '#007AFF',
  },
  darkButton: {
    backgroundColor: '#005BB5',
  },

  // View More (top-right)
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

  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    margin: 20,
    padding: 20,
    borderRadius: 10,
  },
  lightModalContent: {
    backgroundColor: '#fff',
  },
  darkModalContent: {
    backgroundColor: '#1e1e1e',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  jobDetailMain: {
    fontSize: 16,
    marginBottom: 5,
  },
  jobDetailText: {
    fontSize: 14,
    marginBottom: 4,
  },
  bold: {
    fontWeight: 'bold',
  },
  detailsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  closeButton: {
    marginTop: 15,
    alignItems: 'center',
    padding: 10,
    borderRadius: 6,
  },
  modalContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
},
modalContent: {
  width: '85%',
  borderRadius: 10,
  padding: 20,
},
lightModalContent: {
  backgroundColor: '#fff',
},
darkModalContent: {
  backgroundColor: '#1e1e1e',
},

modalHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 15,
},
modalTitle: {
  fontSize: 18,
  fontWeight: 'bold',
},
closeButtonText: {
  fontSize: 18,
},

modalRow: {
  fontSize: 16,
  marginBottom: 8,
},
bold: {
  fontWeight: 'bold',
},

callButton: {
  marginTop: 20,
  backgroundColor: '#007AFF',
  paddingVertical: 10,
  borderRadius: 6,
  alignItems: 'center',
},
callButtonText: {
  color: '#fff',
  fontWeight: 'bold',
  fontSize: 15,
},

});






// import React, { useState, useEffect } from 'react';
// import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Animated, Linking, ScrollView, Platform, Modal } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
// import * as FileSystem from 'expo-file-system';
// import { getProfile, searchJobs, applyToJob, getTrendingSkills, getJobsAppliedFor } from '../utils/api';
// import Header from '../components/Header';
// import Footer from '../components/Footer';
// import axios from 'axios';
// import Icon from 'react-native-vector-icons/FontAwesome';
// import AsyncStorage from '@react-native-async-storage/async-storage';


// export default function SeekerDashboard({ isDarkMode, toggleDarkMode, route }) {
//   const [user, setUser] = useState(route?.params?.user || null);
//   const [searchSkills, setSearchSkills] = useState('');
//   const [searchLocation, setSearchLocation] = useState('');
//   const [trendingJobs, setTrendingJobs] = useState([]);
//   const [suggestedJobs, setSuggestedJobs] = useState([]);
//   const [message, setMessage] = useState('');
//   const [appliedJobs, setAppliedJobs] = useState([]);
//   const [showAppliedJobs, setShowAppliedJobs] = useState(false);
//   const navigation = useNavigation();
//   const [applyScales, setApplyScales] = useState({});
//   const [connectScales, setConnectScales] = useState({});
//   const [profileScale] = useState(new Animated.Value(1));
//   const [logoutScale] = useState(new Animated.Value(1));
//   const [downloadScale] = useState(new Animated.Value(1));
//   const [searchScale] = useState(new Animated.Value(1));
//   const [showJobDetails, setShowJobDetails] = useState(false);
//   const [selectedJob, setSelectedJob] = useState(null);
// const [allJobs, setAllJobs] = useState([]);

// useEffect(() => {
//   const init = async () => {
//     try {
//       // Try to get the user from AsyncStorage first
//       const storedUser = await AsyncStorage.getItem('user');

//       if (storedUser) {
//         const parsedUser = JSON.parse(storedUser);
//         setUser(parsedUser);
//         setAppliedJobs(parsedUser.appliedJobs || []);
//         await fetchData(parsedUser);
//       } else {
//         // If no user in AsyncStorage, fallback to route.params
//         if (!route?.params?.contact) {
//           navigation.navigate('JobsList');
//           return;
//         }

//         const isEmail = route.params.contact.includes('@');
//         const response = await getProfile({
//           role: 'seeker',
//           ...(isEmail
//             ? { email: route.params.contact }
//             : { whatsappNumber: route.params.contact }),
//         });

//         const fetchedUser = response.data || {};
//         setUser(fetchedUser);
//         setAppliedJobs(fetchedUser.appliedJobs || []);
//         await AsyncStorage.setItem('user', JSON.stringify({ ...fetchedUser, role: 'seeker' }));
//         await fetchData(fetchedUser);
//       }
//     } catch (error) {
//       console.error('Initialization error:', error);
//       navigation.navigate('AuthForm', { role: 'seeker' });
//     }
//   };

//   init();
// }, [route, navigation]);

// const fetchData = async (currentUser) => {
//   try {
//     // Fetch only available jobs
//     const jobResponse = await searchJobs({ available: true });

//     const allJobs = jobResponse.data
//       .filter(job => job && job._id && job.available)
//       .map(job => ({
//         ...job,
//         applied: currentUser.appliedJobs?.some(applied => applied.jobId === job._id),
//       }));

//     setAllJobs(allJobs);

//     // Suggest top 5 based on skills
//     if (currentUser?.skills?.length) {
//       const userSkills = Array.isArray(currentUser.skills)
//         ? currentUser.skills
//         : currentUser.skills.split(',').map(s => s.trim());

//       const suggested = allJobs
//         .filter(job => job.skills?.some(skill => userSkills.includes(skill)))
//         .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
//         .slice(0, 5);

//       setSuggestedJobs(suggested);
//     }

//     // Trending
//     const trendingResponse = await getTrendingSkills();
//     setTrendingJobs(trendingResponse.data.data || []);

//     // Animation scales
//     const scales = {};
//     allJobs.forEach(job => {
//       scales[job._id] = {
//         apply: new Animated.Value(1),
//         connect: new Animated.Value(1),
//       };
//     });
//     setApplyScales(scales);
//     setConnectScales(scales);

//   } catch (error) {
//     console.error('Fetch data error:', error);
//     setMessage('Failed to fetch jobs: ' + error.message);
//   }
// };

//   const handleGetAppliedJobs = async () => {
//   try {
//     const seekerId = user?._id;
//     const response = await getJobsAppliedFor(seekerId);
//     console.log("API response for applied jobs:", response);
    
//     // Get the full job details from API response
//     const apiJobs = response.data.data || [];
//     console.log("Jobs from API:", apiJobs);
    
//     // Get the status information from user's appliedJobs
//     const userAppliedJobs = user?.appliedJobs || [];
//     console.log("User's applied jobs with status:", userAppliedJobs);
    
//     // Merge the data to include both job details and status
//     const mergedJobs = apiJobs.map(job => {
//       // Find matching job in user's appliedJobs to get status
//       const userJob = userAppliedJobs.find(
//         appliedJob => appliedJob.jobId === job._id
//       );
      
//       return {
//         ...job,
//         status: userJob?.status || 'Applied', // Default to 'Applied' if status not found
//         _id: job._id, // Ensure we have the job ID
//       };
//     });
    
//     console.log("Merged jobs with status:", mergedJobs);
//     setAppliedJobs(mergedJobs);
//     setShowAppliedJobs(true);
//   } catch (err) {
//     console.error('Error fetching applied jobs:', err);
//   }
// };

//   const handleSearch = async () => {
//     try {
//       const searchData = {
//         skills: searchSkills.split(',').map(skill => skill.trim()).filter(skill => skill),
//         location: searchLocation.trim(),
//         available: true
//       };

//       const response = await searchJobs(searchData);
//       const filteredJobs = response.data
//         .filter(job => job && job._id && job.available)
//         .map(job => ({
//           ...job,
//           applied: appliedJobs.some(applied => applied.jobId === job._id),
//         }));

//       setSuggestedJobs(filteredJobs.slice(0, 5));
//       setMessage(filteredJobs.length === 0 ? 'No active jobs found matching your criteria' : '');
//     } catch (error) {
//       console.error('Search Error:', error.response?.data || error);
//       setMessage('Error searching jobs: ' + (error.response?.data?.message || error.message));
//     }
//   };

//   const handleApply = async (jobId) => {
//     try {
//       const response = await applyToJob({ seekerId: user._id, jobId });
//       setAppliedJobs(prev => [
//         ...prev.filter(job => job.jobId !== jobId),
//         {
//           jobId,
//           title: suggestedJobs.find(job => job._id === jobId)?.jobTitle || 'Unknown',
//           status: 'Applied',
//           skills: suggestedJobs.find(job => job._id === jobId)?.skills || [],
//           location: suggestedJobs.find(job => job._id === jobId)?.location || 'N/A'
//         }
//       ]);
//       setSuggestedJobs(prev => prev.map(job => job._id === jobId ? { ...job, applied: true } : job));
//       setTrendingJobs(prev => prev.map(job => job._id === jobId ? { ...job, applied: true } : job));
//       setMessage(response.message || 'Applied successfully');
//     } catch (error) {
//       setMessage('Error applying to job: ' + error.message);
//     }
//   };

//   const handleWhatsAppConnect = async (number, jobId, jobTitle) => {
//     try {
//       const response = await axios.post(http://localhost:5000/api/jobs/apply-job, {
//         seekerId: user._id,
//         jobId: jobId,
//         title: jobTitle,
//         status: 'Connected'
//       });

//       const jobDetails = suggestedJobs.find(job => job._id === jobId) || trendingJobs.find(job => job._id === jobId);

//       setAppliedJobs(prev => [
//         ...prev.filter(job => job.jobId !== jobId),
//         {
//           jobId,
//           title: jobTitle,
//           status: 'Connected',
//           skills: jobDetails?.skills || [],
//           location: jobDetails?.location || 'N/A'
//         }
//       ]);

//       if (!number.startsWith('+')) {
//         number = '+91' + number;
//       }
//       const message = Hi, I'm interested in your job posting: ${jobTitle};
//       Linking.openURL(https://api.whatsapp.com/send?phone=${number.replace(/\D/g, '')}&text=${encodeURIComponent(message)});
//     } catch (error) {
//       console.error("Error connecting via WhatsApp:", error);
//     }
//   };

//   const handleEditProfile = () => {
//     navigation.navigate('SeekerProfile', { user });
//   };

//   const handlePressIn = (scale) => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
//   const handlePressOut = (scale) => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

//   const formatSkills = (skills) => {
//     if (Array.isArray(skills)) return skills.join(', ');
//     if (typeof skills === 'string') return skills;
//     return 'N/A';
//   };

//   const handleViewJobDetails = (job) => {
//     setShowJobDetails(true);
//     setSelectedJob(job);
//   }

//   const renderJobItem = ({ item }) => (
//     <View style={styles.jobItem}>
//       <Text style={[isDarkMode ? styles.darkText : styles.lightText]}>
//         {item.skills?.map((skill, index) => (
//           <Text key={index}>
//             {skill}
//             {index !== item.skills.length - 1 ? " | " : ""}
//           </Text>
//         ))}
//       </Text>
//       <Text style={[styles.jobDetail, isDarkMode ? styles.darkText : styles.lightText]}>
//         Location: {item.location || 'N/A'}
//       </Text>
//       <View style={styles.jobActions}>
//         <TouchableOpacity
//           style={[styles.actionButton, isDarkMode ? styles.darkButton : styles.lightButton, item.applied && styles.disabledButton]}
//           onPress={() => handleApply(item._id)}
//           onPressIn={() => handlePressIn(applyScales[item._id]?.apply)}
//           onPressOut={() => handlePressOut(applyScales[item._id]?.apply)}
//           disabled={item.applied}
//         >
//           <Animated.View style={{ transform: [{ scale: applyScales[item._id]?.apply || new Animated.Value(1) }] }}>
//             <Text style={styles.buttonText}>
//               {item.applied ? 'Applied' : 'Apply'}
//             </Text>
//           </Animated.View>
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={[styles.actionButton, isDarkMode ? styles.darkButton : styles.lightButton]}
//           onPress={() => handleWhatsAppConnect(item.postedBy?.hrWhatsappNumber || '', item._id, item.jobTitle || item.skills[0])}
//           onPressIn={() => handlePressIn(connectScales[item._id]?.connect)}
//           onPressOut={() => handlePressOut(connectScales[item._id]?.connect)}
//         >
//           <Animated.View style={{ transform: [{ scale: connectScales[item._id]?.connect || new Animated.Value(1) }] }}>
//             <Text style={styles.buttonText}>WhatsApp</Text>
//           </Animated.View>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );

//   const keyExtractor = (item, index) => {
//     return item?._id ? item._id.toString() : index-${index};
//   };

//   return (
//     <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
//       <Header title="Seeker Dashboard" toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         <View style={styles.topButtons}>
//           <TouchableOpacity
//             style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
//             onPress={handleEditProfile}
//             onPressIn={() => handlePressIn(profileScale)}
//             onPressOut={() => handlePressOut(profileScale)}
//           >
//             <Animated.View style={{ transform: [{ scale: profileScale }] }}>
//               <Text style={styles.buttonText}>Edit Profile</Text>
//             </Animated.View>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
//             onPress={handleGetAppliedJobs}
//             onPressIn={() => handlePressIn(profileScale)}
//             onPressOut={() => handlePressOut(profileScale)}
//           >
//             <Animated.View style={{ transform: [{ scale: profileScale }] }}>
//               <Text style={styles.buttonText}>View Applied Jobs</Text>
//             </Animated.View>
//           </TouchableOpacity>
//         </View>

//         <View style={styles.content}>
//           {user ? (
//             <>
//               {/* <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>Your Profile</Text>
//               <View style={[styles.profileContainer, isDarkMode ? styles.darkProfileContainer : styles.lightProfileContainer]}>
//                 <Text style={[styles.profileText, isDarkMode ? styles.darkText : styles.lightText]}>
//                   Name: {user.fullName || 'N/A'}
//                 </Text>
//                 <Text style={[styles.profileText, isDarkMode ? styles.darkText : styles.lightText]}>
//                   Email: {user.email || 'N/A'}
//                 </Text>
//                 <Text style={[styles.profileText, isDarkMode ? styles.darkText : styles.lightText]}>
//                   WhatsApp: {user.whatsappNumber || 'N/A'}
//                 </Text>
//                 <Text style={[styles.profileText, isDarkMode ? styles.darkText : styles.lightText]}>
//                   Job Names: {formatSkills(user.skills)}
//                 </Text>
//                 <Text style={[styles.profileText, isDarkMode ? styles.darkText : styles.lightText]}>
//                   Experience: {user.experience || 0} years
//                 </Text>
//                 <Text style={[styles.profileText, isDarkMode ? styles.darkText : styles.lightText]}>
//                   Location: {user.location || 'N/A'}
//                 </Text>
//               </View> */}

//               <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>Search Jobs</Text>
//               <Text style={[styles.label, isDarkMode ? styles.darkText : styles.lightText]}>Search By Job Name</Text>
//               <TextInput
//                 style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
//                 value={searchSkills}
//                 onChangeText={setSearchSkills}
//                 placeholder="Enter Job Names (comma-separated)"
//                 placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
//               />
//               <Text style={[styles.label, isDarkMode ? styles.darkText : styles.lightText]}>Search By Location</Text>
//               <TextInput
//                 style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
//                 value={searchLocation}
//                 onChangeText={setSearchLocation}
//                 placeholder="Enter location"
//                 placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
//               />
//               <TouchableOpacity
//                 style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
//                 onPress={handleSearch}
//                 onPressIn={() => handlePressIn(searchScale)}
//                 onPressOut={() => handlePressOut(searchScale)}
//               >
//                 <Animated.View style={{ transform: [{ scale: searchScale }] }}>
//                   <Text style={styles.buttonText}>Search</Text>
//                 </Animated.View>
//               </TouchableOpacity>

//               <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>Suggested Jobs</Text>
//               <FlatList
//                 data={suggestedJobs}
//                 keyExtractor={keyExtractor}
//                 renderItem={renderJobItem}
//                 scrollEnabled={false}
//               />

//               <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>Trending Jobs</Text>
//               <FlatList
//                 data={trendingJobs}
//                 keyExtractor={keyExtractor}
//                 renderItem={renderJobItem}
//                 scrollEnabled={false}
//               />

//               {message && <Text style={[styles.message, isDarkMode ? styles.darkText : styles.lightText]}>{message}</Text>}
//             </>
//           ) : (
//             <Text style={[styles.loading, isDarkMode ? styles.darkText : styles.lightText]}>Loading profile...</Text>
//           )}
//         </View>
//       </ScrollView>

//       {/* Applied Jobs Modal */}
//       <Modal visible={showAppliedJobs} transparent animationType="slide">
//         <View style={styles.modalContainer}>
//           <View style={[styles.modalContent, isDarkMode ? styles.darkModalContent : styles.lightModalContent]}>
//             <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>Applied Jobs</Text>
//             <FlatList
//               data={appliedJobs}
//               keyExtractor={(item, index) => item?._id ? item._id.toString() : index.toString()}
//               renderItem={({ item }) => (
//                 <View style={styles.appliedJobItem}>
//                   <View style={styles.jobDetails}>
//                     <Text style={styles.appliedJobText}>
//                       {item.title || item.skills?.join(' | ') || 'Unknown Job'}
//                     </Text>
//                     <Text style={styles.jobLocation}>
//                       Location: {item.location || 'N/A'}
//                     </Text>
//                   </View>

//                   <TouchableOpacity
//                     style={[
//                       styles.detailsButton,
//                       item.status === 'Connected' ? styles.whatsappButton : styles.normalButton
//                     ]}
//                     onPress={() => handleViewJobDetails(item)}
//                   >
//                     <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//                       {item.status === 'Connected' && (
//                         <Icon
//                           name="whatsapp"
//                           size={20}
//                           color="#fff"
//                           style={{ marginRight: 5 }}
//                         />
//                       )}
//                       <Text style={styles.detailsButtonText}>
//                         {item.status === 'Connected' ? 'Applied via WhatsApp' : 'View Details'}
//                       </Text>
//                     </View>
//                   </TouchableOpacity>
//                 </View>
//               )}
//             />
//             <TouchableOpacity
//               style={[styles.closeButton, isDarkMode ? styles.darkButton : styles.lightButton]}
//               onPress={() => setShowAppliedJobs(false)}
//             >
//               <Text style={styles.buttonText}>Close</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>

//       {/* Job Details Modal */}
//       <Modal visible={showJobDetails} transparent animationType="slide">
//         <View style={styles.modalContainer}>
//           <View style={[styles.modalContent, isDarkMode ? styles.darkModalContent : styles.lightModalContent]}>
//             <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>Job Details</Text>
//             {selectedJob && (
//               <>
//                 <Text style={[styles.jobDetailMain, isDarkMode ? styles.darkText : styles.lightText]}>
//                   {selectedJob.skills?.map((skill, index) => (
//                     <Text key={index}>
//                       {skill}
//                       {index !== selectedJob.skills.length - 1 ? " | " : ""}
//                     </Text>
//                   ))}
//                 </Text>
//                 <Text style={[styles.jobDetailText, isDarkMode ? styles.darkText : styles.lightText]}>
//                   <Text style={styles.bold}>Company:</Text> {selectedJob.postedBy?.companyName || 'N/A'}
//                 </Text>
//                 <Text style={[styles.jobDetailText, isDarkMode ? styles.darkText : styles.lightText]}>
//                   <Text style={styles.bold}>Location:</Text> {selectedJob.location || 'N/A'}
//                 </Text>
//                 <Text style={[styles.jobDetailText, isDarkMode ? styles.darkText : styles.lightText]}>
//                   <Text style={styles.bold}>Salary:</Text> {selectedJob.maxCTC || 'Not disclosed'}
//                 </Text>
//                 {selectedJob.postedBy?.hrWhatsappNumber && (
//                   <TouchableOpacity
//                     style={styles.whatsappButton}
//                     onPress={() => handleWhatsAppConnect(
//                       selectedJob.postedBy.hrWhatsappNumber,
//                       selectedJob._id,
//                       selectedJob.jobTitle || selectedJob.skills[0]
//                     )}
//                   >
//                     <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
//                       <Icon
//                         name="whatsapp"
//                         size={20}
//                         color="#fff"
//                         style={{ marginRight: 5 }}
//                       />
//                       <Text style={styles.detailsButtonText}>Connect via WhatsApp</Text>
//                     </View>
//                   </TouchableOpacity>
//                 )}
//               </>
//             )}
//             <TouchableOpacity
//               style={[styles.closeButton, isDarkMode ? styles.darkButton : styles.lightButton]}
//               onPress={() => setShowJobDetails(false)}
//             >
//               <Text style={styles.buttonText}>Close</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//       <Footer isDarkMode={isDarkMode} />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   lightContainer: { backgroundColor: '#fff' },
//   darkContainer: { backgroundColor: '#111' },
//   scrollContent: { paddingBottom: 60, flexGrow: 1 },
//   topButtons: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20, marginTop: 10 },
//   content: { padding: 10, flexGrow: 1 },
//   title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
//   profileContainer: { padding: 10, borderRadius: 5, marginBottom: 20 },
//   lightProfileContainer: { backgroundColor: '#f0f0f0' },
//   darkProfileContainer: { backgroundColor: '#333' },
//   profileText: { fontSize: 16, marginBottom: 5 },
//   input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
//   lightInput: { borderColor: '#ccc', color: '#000' },
//   darkInput: { borderColor: '#555', color: '#ddd', backgroundColor: '#333' },
//   jobItem: { padding: 10, borderBottomWidth: 1, borderColor: '#ccc' },
//   jobText: { fontSize: 16, fontWeight: 'bold' },
//   jobDetail: { fontSize: 14, color: '#666', marginTop: 2 },
//   jobActions: { flexDirection: 'row', gap: 10, marginTop: 5 },
//   actionButton: { padding: 5, borderRadius: 5 },
//   disabledButton: { backgroundColor: '#666' },
//   button: { paddingVertical: 15, paddingHorizontal: 30, borderRadius: 25, alignItems: 'center', marginBottom: 10 },
//   lightButton: { backgroundColor: '#007AFF' },
//   darkButton: { backgroundColor: '#005BB5' },
//   buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
//   message: { marginTop: 10, textAlign: 'center' },
//   loading: { fontSize: 16, textAlign: 'center' },
//   lightText: { color: '#000' },
//   darkText: { color: '#ddd' },
//   modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
//   modalContent: { width: '80%', padding: 20, borderRadius: 10 },
//   lightModalContent: { backgroundColor: '#fff' },
//   darkModalContent: { backgroundColor: '#333' },
//   modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
//   appliedJobItem: { padding: 10, borderBottomWidth: 1, marginBottom: 10 },
//   lightAppliedJobItem: { borderColor: '#ddd', backgroundColor: '#f9f9f9' },
//   darkAppliedJobItem: { borderColor: '#555', backgroundColor: '#222' },
//   appliedJobText: { fontSize: 16 },
//   jobDetails: { flex: 1, marginBottom: 5 },
//   label: {
//     fontSize: 15,
//     fontWeight: "700",
//     paddingHorizontal: 4,
//     marginBottom: 5,
//   },
//   detailsButton: {
//     padding: 8,
//     borderRadius: 5,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginTop: 5
//   },
//   whatsappButton: {
//     backgroundColor: '#25D366',
//     padding: 10,
//     borderRadius: 5,
//     alignItems: 'center',
//     marginVertical: 5,
//   },
//   normalButton: {
//     backgroundColor: '#007AFF',
//   },
//   detailsButtonText: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: 'bold'
//   },
//   statusText: {
//     fontSize: 14,
//     marginTop: 3,
//     fontStyle: 'italic',
//   },
//   connectedStatus: {
//     color: '#25D366',
//   },
//   appliedStatus: {
//     color: '#007AFF',
//   },
//   jobDetailText: {
//     fontSize: 16,
//     marginBottom: 5,
//     lineHeight: 22
//   },
//   bold: {
//     fontWeight: 'bold'
//   },
//   closeButton: {
//     padding: 10,
//     borderRadius: 5,
//     alignItems: 'center',
//     marginTop: 10
//   },
//   jobDetailMain: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     marginBottom: 10
//   }
// });







// import React, { useState, useEffect } from 'react';
// import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Animated, Linking, ScrollView, Platform, Modal } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
// import * as FileSystem from 'expo-file-system';
// import { getProfile, searchJobs, applyToJob, getTrendingSkills, getJobsAppliedFor } from '../utils/api';
// import Header from '../components/Header';
// import Footer from '../components/Footer';
// import axios from 'axios';
// import Icon from 'react-native-vector-icons/FontAwesome';
// import AsyncStorage from '@react-native-async-storage/async-storage';


// export default function SeekerDashboard({ isDarkMode, toggleDarkMode, route }) {
//   const [user, setUser] = useState(route?.params?.user || null);
//   const [searchSkills, setSearchSkills] = useState('');
//   const [searchLocation, setSearchLocation] = useState('');
//   const [trendingJobs, setTrendingJobs] = useState([]);
//   const [suggestedJobs, setSuggestedJobs] = useState([]);
//   const [message, setMessage] = useState('');
//   const [appliedJobs, setAppliedJobs] = useState([]);
//   const [showAppliedJobs, setShowAppliedJobs] = useState(false);
//   const navigation = useNavigation();
//   const [applyScales, setApplyScales] = useState({});
//   const [connectScales, setConnectScales] = useState({});
//   const [profileScale] = useState(new Animated.Value(1));
//   const [logoutScale] = useState(new Animated.Value(1));
//   const [downloadScale] = useState(new Animated.Value(1));
//   const [searchScale] = useState(new Animated.Value(1));
//   const [showJobDetails, setShowJobDetails] = useState(false);
//   const [selectedJob, setSelectedJob] = useState(null);
// const [allJobs, setAllJobs] = useState([]);

// useEffect(() => {
//   const init = async () => {
//     try {
//       // Try to get the user from AsyncStorage first
//       const storedUser = await AsyncStorage.getItem('user');

//       if (storedUser) {
//         const parsedUser = JSON.parse(storedUser);
//         setUser(parsedUser);
//         setAppliedJobs(parsedUser.appliedJobs || []);
//         await fetchData(parsedUser);
//       } else {
//         // If no user in AsyncStorage, fallback to route.params
//         if (!route?.params?.contact) {
//           navigation.navigate('JobsList');
//           return;
//         }

//         const isEmail = route.params.contact.includes('@');
//         const response = await getProfile({
//           role: 'seeker',
//           ...(isEmail
//             ? { email: route.params.contact }
//             : { whatsappNumber: route.params.contact }),
//         });

//         const fetchedUser = response.data || {};
//         setUser(fetchedUser);
//         setAppliedJobs(fetchedUser.appliedJobs || []);
//         await AsyncStorage.setItem('user', JSON.stringify({ ...fetchedUser, role: 'seeker' }));
//         await fetchData(fetchedUser);
//       }
//     } catch (error) {
//       console.error('Initialization error:', error);
//       navigation.navigate('AuthForm', { role: 'seeker' });
//     }
//   };

//   init();
// }, [route, navigation]);

// const fetchData = async (currentUser) => {
//   try {
//     // Fetch only available jobs
//     const jobResponse = await searchJobs({ available: true });

//     const allJobs = jobResponse.data
//       .filter(job => job && job._id && job.available)
//       .map(job => ({
//         ...job,
//         applied: currentUser.appliedJobs?.some(applied => applied.jobId === job._id),
//       }));

//     setAllJobs(allJobs);

//     // Suggest top 5 based on skills
//     if (currentUser?.skills?.length) {
//       const userSkills = Array.isArray(currentUser.skills)
//         ? currentUser.skills
//         : currentUser.skills.split(',').map(s => s.trim());

//       const suggested = allJobs
//         .filter(job => job.skills?.some(skill => userSkills.includes(skill)))
//         .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
//         .slice(0, 5);

//       setSuggestedJobs(suggested);
//     }

//     // Trending
//     const trendingResponse = await getTrendingSkills();
//     setTrendingJobs(trendingResponse.data.data || []);

//     // Animation scales
//     const scales = {};
//     allJobs.forEach(job => {
//       scales[job._id] = {
//         apply: new Animated.Value(1),
//         connect: new Animated.Value(1),
//       };
//     });
//     setApplyScales(scales);
//     setConnectScales(scales);

//   } catch (error) {
//     console.error('Fetch data error:', error);
//     setMessage('Failed to fetch jobs: ' + error.message);
//   }
// };

//   const handleGetAppliedJobs = async () => {
//   try {
//     const seekerId = user?._id;
//     const response = await getJobsAppliedFor(seekerId);
//     console.log("API response for applied jobs:", response);
    
//     // Get the full job details from API response
//     const apiJobs = response.data.data || [];
//     console.log("Jobs from API:", apiJobs);
    
//     // Get the status information from user's appliedJobs
//     const userAppliedJobs = user?.appliedJobs || [];
//     console.log("User's applied jobs with status:", userAppliedJobs);
    
//     // Merge the data to include both job details and status
//     const mergedJobs = apiJobs.map(job => {
//       // Find matching job in user's appliedJobs to get status
//       const userJob = userAppliedJobs.find(
//         appliedJob => appliedJob.jobId === job._id
//       );
      
//       return {
//         ...job,
//         status: userJob?.status || 'Applied', // Default to 'Applied' if status not found
//         _id: job._id, // Ensure we have the job ID
//       };
//     });
    
//     console.log("Merged jobs with status:", mergedJobs);
//     setAppliedJobs(mergedJobs);
//     setShowAppliedJobs(true);
//   } catch (err) {
//     console.error('Error fetching applied jobs:', err);
//   }
// };

//   const handleSearch = async () => {
//     try {
//       const searchData = {
//         skills: searchSkills.split(',').map(skill => skill.trim()).filter(skill => skill),
//         location: searchLocation.trim(),
//         available: true
//       };

//       const response = await searchJobs(searchData);
//       const filteredJobs = response.data
//         .filter(job => job && job._id && job.available)
//         .map(job => ({
//           ...job,
//           applied: appliedJobs.some(applied => applied.jobId === job._id),
//         }));

//       setSuggestedJobs(filteredJobs.slice(0, 5));
//       setMessage(filteredJobs.length === 0 ? 'No active jobs found matching your criteria' : '');
//     } catch (error) {
//       console.error('Search Error:', error.response?.data || error);
//       setMessage('Error searching jobs: ' + (error.response?.data?.message || error.message));
//     }
//   };

//   const handleApply = async (jobId) => {
//     try {
//       const response = await applyToJob({ seekerId: user._id, jobId });
//       setAppliedJobs(prev => [
//         ...prev.filter(job => job.jobId !== jobId),
//         {
//           jobId,
//           title: suggestedJobs.find(job => job._id === jobId)?.jobTitle || 'Unknown',
//           status: 'Applied',
//           skills: suggestedJobs.find(job => job._id === jobId)?.skills || [],
//           location: suggestedJobs.find(job => job._id === jobId)?.location || 'N/A'
//         }
//       ]);
//       setSuggestedJobs(prev => prev.map(job => job._id === jobId ? { ...job, applied: true } : job));
//       setTrendingJobs(prev => prev.map(job => job._id === jobId ? { ...job, applied: true } : job));
//       setMessage(response.message || 'Applied successfully');
//     } catch (error) {
//       setMessage('Error applying to job: ' + error.message);
//     }
//   };

//   const handleWhatsAppConnect = async (number, jobId, jobTitle) => {
//     try {
//       const response = await axios.post(`http://localhost:5000/api/jobs/apply-job`, {
//         seekerId: user._id,
//         jobId: jobId,
//         title: jobTitle,
//         status: 'Connected'
//       });

//       const jobDetails = suggestedJobs.find(job => job._id === jobId) || trendingJobs.find(job => job._id === jobId);

//       setAppliedJobs(prev => [
//         ...prev.filter(job => job.jobId !== jobId),
//         {
//           jobId,
//           title: jobTitle,
//           status: 'Connected',
//           skills: jobDetails?.skills || [],
//           location: jobDetails?.location || 'N/A'
//         }
//       ]);

//       if (!number.startsWith('+')) {
//         number = '+91' + number;
//       }
//       const message = `Hi, I'm interested in your job posting: ${jobTitle}`;
//       Linking.openURL(`https://api.whatsapp.com/send?phone=${number.replace(/\D/g, '')}&text=${encodeURIComponent(message)}`);
//     } catch (error) {
//       console.error("Error connecting via WhatsApp:", error);
//     }
//   };

//   const handleEditProfile = () => {
//     navigation.navigate('SeekerProfile', { user });
//   };

//   const handlePressIn = (scale) => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
//   const handlePressOut = (scale) => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

//   const formatSkills = (skills) => {
//     if (Array.isArray(skills)) return skills.join(', ');
//     if (typeof skills === 'string') return skills;
//     return 'N/A';
//   };

//   const handleViewJobDetails = (job) => {
//     setShowJobDetails(true);
//     setSelectedJob(job);
//   }

//   const renderJobItem = ({ item }) => (
//     <View style={styles.jobItem}>
//       <Text style={[isDarkMode ? styles.darkText : styles.lightText]}>
//         {item.skills?.map((skill, index) => (
//           <Text key={index}>
//             {skill}
//             {index !== item.skills.length - 1 ? " | " : ""}
//           </Text>
//         ))}
//       </Text>
//       <Text style={[styles.jobDetail, isDarkMode ? styles.darkText : styles.lightText]}>
//         Location: {item.location || 'N/A'}
//       </Text>
//       <View style={styles.jobActions}>
//         <TouchableOpacity
//           style={[styles.actionButton, isDarkMode ? styles.darkButton : styles.lightButton, item.applied && styles.disabledButton]}
//           onPress={() => handleApply(item._id)}
//           onPressIn={() => handlePressIn(applyScales[item._id]?.apply)}
//           onPressOut={() => handlePressOut(applyScales[item._id]?.apply)}
//           disabled={item.applied}
//         >
//           <Animated.View style={{ transform: [{ scale: applyScales[item._id]?.apply || new Animated.Value(1) }] }}>
//             <Text style={styles.buttonText}>
//               {item.applied ? 'Applied' : 'Apply'}
//             </Text>
//           </Animated.View>
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={[styles.actionButton, isDarkMode ? styles.darkButton : styles.lightButton]}
//           onPress={() => handleWhatsAppConnect(item.postedBy?.hrWhatsappNumber || '', item._id, item.jobTitle || item.skills[0])}
//           onPressIn={() => handlePressIn(connectScales[item._id]?.connect)}
//           onPressOut={() => handlePressOut(connectScales[item._id]?.connect)}
//         >
//           <Animated.View style={{ transform: [{ scale: connectScales[item._id]?.connect || new Animated.Value(1) }] }}>
//             <Text style={styles.buttonText}>WhatsApp</Text>
//           </Animated.View>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );

//   const keyExtractor = (item, index) => {
//     return item?._id ? item._id.toString() : `index-${index}`;
//   };

//   return (
//     <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
//       <Header title="Seeker Dashboard" toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         <View style={styles.topButtons}>
//           <TouchableOpacity
//             style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
//             onPress={handleEditProfile}
//             onPressIn={() => handlePressIn(profileScale)}
//             onPressOut={() => handlePressOut(profileScale)}
//           >
//             <Animated.View style={{ transform: [{ scale: profileScale }] }}>
//               <Text style={styles.buttonText}>Edit Profile</Text>
//             </Animated.View>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
//             onPress={handleGetAppliedJobs}
//             onPressIn={() => handlePressIn(profileScale)}
//             onPressOut={() => handlePressOut(profileScale)}
//           >
//             <Animated.View style={{ transform: [{ scale: profileScale }] }}>
//               <Text style={styles.buttonText}>View Applied Jobs</Text>
//             </Animated.View>
//           </TouchableOpacity>
//         </View>

//         <View style={styles.content}>
//           {user ? (
//             <>
//               {/* <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>Your Profile</Text>
//               <View style={[styles.profileContainer, isDarkMode ? styles.darkProfileContainer : styles.lightProfileContainer]}>
//                 <Text style={[styles.profileText, isDarkMode ? styles.darkText : styles.lightText]}>
//                   Name: {user.fullName || 'N/A'}
//                 </Text>
//                 <Text style={[styles.profileText, isDarkMode ? styles.darkText : styles.lightText]}>
//                   Email: {user.email || 'N/A'}
//                 </Text>
//                 <Text style={[styles.profileText, isDarkMode ? styles.darkText : styles.lightText]}>
//                   WhatsApp: {user.whatsappNumber || 'N/A'}
//                 </Text>
//                 <Text style={[styles.profileText, isDarkMode ? styles.darkText : styles.lightText]}>
//                   Job Names: {formatSkills(user.skills)}
//                 </Text>
//                 <Text style={[styles.profileText, isDarkMode ? styles.darkText : styles.lightText]}>
//                   Experience: {user.experience || 0} years
//                 </Text>
//                 <Text style={[styles.profileText, isDarkMode ? styles.darkText : styles.lightText]}>
//                   Location: {user.location || 'N/A'}
//                 </Text>
//               </View> */}

//               <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>Search Jobs</Text>
//               <Text style={[styles.label, isDarkMode ? styles.darkText : styles.lightText]}>Search By Job Name</Text>
//               <TextInput
//                 style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
//                 value={searchSkills}
//                 onChangeText={setSearchSkills}
//                 placeholder="Enter Job Names (comma-separated)"
//                 placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
//               />
//               <Text style={[styles.label, isDarkMode ? styles.darkText : styles.lightText]}>Search By Location</Text>
//               <TextInput
//                 style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
//                 value={searchLocation}
//                 onChangeText={setSearchLocation}
//                 placeholder="Enter location"
//                 placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
//               />
//               <TouchableOpacity
//                 style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
//                 onPress={handleSearch}
//                 onPressIn={() => handlePressIn(searchScale)}
//                 onPressOut={() => handlePressOut(searchScale)}
//               >
//                 <Animated.View style={{ transform: [{ scale: searchScale }] }}>
//                   <Text style={styles.buttonText}>Search</Text>
//                 </Animated.View>
//               </TouchableOpacity>

//               <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>Suggested Jobs</Text>
//               <FlatList
//                 data={suggestedJobs}
//                 keyExtractor={keyExtractor}
//                 renderItem={renderJobItem}
//                 scrollEnabled={false}
//               />

//               <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>Trending Jobs</Text>
//               <FlatList
//                 data={trendingJobs}
//                 keyExtractor={keyExtractor}
//                 renderItem={renderJobItem}
//                 scrollEnabled={false}
//               />

//               {message && <Text style={[styles.message, isDarkMode ? styles.darkText : styles.lightText]}>{message}</Text>}
//             </>
//           ) : (
//             <Text style={[styles.loading, isDarkMode ? styles.darkText : styles.lightText]}>Loading profile...</Text>
//           )}
//         </View>
//       </ScrollView>

//       {/* Applied Jobs Modal */}
//       <Modal visible={showAppliedJobs} transparent animationType="slide">
//         <View style={styles.modalContainer}>
//           <View style={[styles.modalContent, isDarkMode ? styles.darkModalContent : styles.lightModalContent]}>
//             <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>Applied Jobs</Text>
//             <FlatList
//               data={appliedJobs}
//               keyExtractor={(item, index) => item?._id ? item._id.toString() : index.toString()}
//               renderItem={({ item }) => (
//                 <View style={styles.appliedJobItem}>
//                   <View style={styles.jobDetails}>
//                     <Text style={styles.appliedJobText}>
//                       {item.title || item.skills?.join(' | ') || 'Unknown Job'}
//                     </Text>
//                     <Text style={styles.jobLocation}>
//                       Location: {item.location || 'N/A'}
//                     </Text>
//                   </View>

//                   <TouchableOpacity
//                     style={[
//                       styles.detailsButton,
//                       item.status === 'Connected' ? styles.whatsappButton : styles.normalButton
//                     ]}
//                     onPress={() => handleViewJobDetails(item)}
//                   >
//                     <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//                       {item.status === 'Connected' && (
//                         <Icon
//                           name="whatsapp"
//                           size={20}
//                           color="#fff"
//                           style={{ marginRight: 5 }}
//                         />
//                       )}
//                       <Text style={styles.detailsButtonText}>
//                         {item.status === 'Connected' ? 'Applied via WhatsApp' : 'View Details'}
//                       </Text>
//                     </View>
//                   </TouchableOpacity>
//                 </View>
//               )}
//             />
//             <TouchableOpacity
//               style={[styles.closeButton, isDarkMode ? styles.darkButton : styles.lightButton]}
//               onPress={() => setShowAppliedJobs(false)}
//             >
//               <Text style={styles.buttonText}>Close</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>

//       {/* Job Details Modal */}
//       <Modal visible={showJobDetails} transparent animationType="slide">
//         <View style={styles.modalContainer}>
//           <View style={[styles.modalContent, isDarkMode ? styles.darkModalContent : styles.lightModalContent]}>
//             <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>Job Details</Text>
//             {selectedJob && (
//               <>
//                 <Text style={[styles.jobDetailMain, isDarkMode ? styles.darkText : styles.lightText]}>
//                   {selectedJob.skills?.map((skill, index) => (
//                     <Text key={index}>
//                       {skill}
//                       {index !== selectedJob.skills.length - 1 ? " | " : ""}
//                     </Text>
//                   ))}
//                 </Text>
//                 <Text style={[styles.jobDetailText, isDarkMode ? styles.darkText : styles.lightText]}>
//                   <Text style={styles.bold}>Company:</Text> {selectedJob.postedBy?.companyName || 'N/A'}
//                 </Text>
//                 <Text style={[styles.jobDetailText, isDarkMode ? styles.darkText : styles.lightText]}>
//                   <Text style={styles.bold}>Location:</Text> {selectedJob.location || 'N/A'}
//                 </Text>
//                 <Text style={[styles.jobDetailText, isDarkMode ? styles.darkText : styles.lightText]}>
//                   <Text style={styles.bold}>Salary:</Text> {selectedJob.maxCTC || 'Not disclosed'}
//                 </Text>
//                 {selectedJob.postedBy?.hrWhatsappNumber && (
//                   <TouchableOpacity
//                     style={styles.whatsappButton}
//                     onPress={() => handleWhatsAppConnect(
//                       selectedJob.postedBy.hrWhatsappNumber,
//                       selectedJob._id,
//                       selectedJob.jobTitle || selectedJob.skills[0]
//                     )}
//                   >
//                     <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
//                       <Icon
//                         name="whatsapp"
//                         size={20}
//                         color="#fff"
//                         style={{ marginRight: 5 }}
//                       />
//                       <Text style={styles.detailsButtonText}>Connect via WhatsApp</Text>
//                     </View>
//                   </TouchableOpacity>
//                 )}
//               </>
//             )}
//             <TouchableOpacity
//               style={[styles.closeButton, isDarkMode ? styles.darkButton : styles.lightButton]}
//               onPress={() => setShowJobDetails(false)}
//             >
//               <Text style={styles.buttonText}>Close</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//       <Footer isDarkMode={isDarkMode} />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   lightContainer: { backgroundColor: '#fff' },
//   darkContainer: { backgroundColor: '#111' },
//   scrollContent: { paddingBottom: 60, flexGrow: 1 },
//   topButtons: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20, marginTop: 10 },
//   content: { padding: 10, flexGrow: 1 },
//   title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
//   profileContainer: { padding: 10, borderRadius: 5, marginBottom: 20 },
//   lightProfileContainer: { backgroundColor: '#f0f0f0' },
//   darkProfileContainer: { backgroundColor: '#333' },
//   profileText: { fontSize: 16, marginBottom: 5 },
//   input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
//   lightInput: { borderColor: '#ccc', color: '#000' },
//   darkInput: { borderColor: '#555', color: '#ddd', backgroundColor: '#333' },
//   jobItem: { padding: 10, borderBottomWidth: 1, borderColor: '#ccc' },
//   jobText: { fontSize: 16, fontWeight: 'bold' },
//   jobDetail: { fontSize: 14, color: '#666', marginTop: 2 },
//   jobActions: { flexDirection: 'row', gap: 10, marginTop: 5 },
//   actionButton: { padding: 5, borderRadius: 5 },
//   disabledButton: { backgroundColor: '#666' },
//   button: { paddingVertical: 15, paddingHorizontal: 30, borderRadius: 25, alignItems: 'center', marginBottom: 10 },
//   lightButton: { backgroundColor: '#007AFF' },
//   darkButton: { backgroundColor: '#005BB5' },
//   buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
//   message: { marginTop: 10, textAlign: 'center' },
//   loading: { fontSize: 16, textAlign: 'center' },
//   lightText: { color: '#000' },
//   darkText: { color: '#ddd' },
//   modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
//   modalContent: { width: '80%', padding: 20, borderRadius: 10 },
//   lightModalContent: { backgroundColor: '#fff' },
//   darkModalContent: { backgroundColor: '#333' },
//   modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
//   appliedJobItem: { padding: 10, borderBottomWidth: 1, marginBottom: 10 },
//   lightAppliedJobItem: { borderColor: '#ddd', backgroundColor: '#f9f9f9' },
//   darkAppliedJobItem: { borderColor: '#555', backgroundColor: '#222' },
//   appliedJobText: { fontSize: 16 },
//   jobDetails: { flex: 1, marginBottom: 5 },
//   label: {
//     fontSize: 15,
//     fontWeight: "700",
//     paddingHorizontal: 4,
//     marginBottom: 5,
//   },
//   detailsButton: {
//     padding: 8,
//     borderRadius: 5,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginTop: 5
//   },
//   whatsappButton: {
//     backgroundColor: '#25D366',
//     padding: 10,
//     borderRadius: 5,
//     alignItems: 'center',
//     marginVertical: 5,
//   },
//   normalButton: {
//     backgroundColor: '#007AFF',
//   },
//   detailsButtonText: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: 'bold'
//   },
//   statusText: {
//     fontSize: 14,
//     marginTop: 3,
//     fontStyle: 'italic',
//   },
//   connectedStatus: {
//     color: '#25D366',
//   },
//   appliedStatus: {
//     color: '#007AFF',
//   },
//   jobDetailText: {
//     fontSize: 16,
//     marginBottom: 5,
//     lineHeight: 22
//   },
//   bold: {
//     fontWeight: 'bold'
//   },
//   closeButton: {
//     padding: 10,
//     borderRadius: 5,
//     alignItems: 'center',
//     marginTop: 10
  
//   jobDetailMain: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     marginBottom: 10
//   }
// });