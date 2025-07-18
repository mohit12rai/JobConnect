import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Modal, Linking, ScrollView, Alert, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyToJob, searchJobs } from '../utils/api';
import { JobsContext } from '../components/context';
import axios from 'axios';


const JobCard = ({ item, isDarkMode, isSelected, onSelect, handleApply, handleWhatsApp, appliedJobs, whatsappedJobs }) => {
  const glowAnim = useRef(new Animated.Value(0)).current;

  const triggerGlow = () => {
    Animated.sequence([
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Modified glow style to use opacity instead of borderWidth
  const glowStyle = {
    borderColor: glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [
        'transparent',
        isDarkMode ? '#00ffcc' : '#007AFF'
      ]
    }),
    borderWidth: isSelected ? 2 : 0,
  };

  const isApplied = appliedJobs.has(item._id);
  const isWhatsapped = whatsappedJobs.has(item._id);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onSelect(item._id)}
    >
      <Animated.View
        style={[
          styles.jobCard,
          isDarkMode ? styles.darkJobCard : styles.lightJobCard,
          isSelected && (isDarkMode ? styles.darkSelectedCard : styles.lightSelectedCard),
          glowStyle,
        ]}
      >
        {/* Rest of the JobCard content remains the same */}
        <Text style={[styles.jobTitle, isDarkMode ? styles.darkText : styles.lightText]}>
          {item.skills?.map((skill, index) => (
            <Text key={index}>
              {skill}
              {index !== item.skills.length - 1 ? " | " : ""}
            </Text>
          ))}
        </Text>
        <Text style={[styles.jobDetails, isDarkMode ? styles.darkSubText : styles.lightSubText]}>
          Company: {item.postedBy?.companyName || 'N/A'}
        </Text>
        {/* <Text style={[styles.jobDetails, isDarkMode ? styles.darkSubText : styles.lightSubText]}>
          name: {item.name || 'N/A'}
        </Text> */}
        <Text style={[styles.jobDetails, isDarkMode ? styles.darkSubText : styles.lightSubText]}>
          Location: {item.location || 'N/A'}
        </Text>
        <Text style={[styles.jobDetails, isDarkMode ? styles.darkSubText : styles.lightSubText]}>
          Salary: {item.maxCTC || 'N/A'}
        </Text>
        
        <View style={styles.jobActions}>
          {/* <TouchableOpacity
            onPress={() => {
             if(!isApplied){
              console.log("Button pressed:", item._id);  // ✅ confirm press works
              handleApply(item._id);                      // ✅ call your handler
               triggerGlow();
             } // ⏸️ comment this for now, add back after testing
            }}
            style={[
              styles.actionButton,
              isDarkMode ? styles.darkApplyButton : styles.lightApplyButton,
              isApplied && (isDarkMode ? styles.darkAppliedButton : styles.lightAppliedButton),
            ]}
          >
            <Text style={styles.buttonText}>
              {isApplied ? "Applied" : "Apply"}
            </Text>
          </TouchableOpacity> */}
          <TouchableOpacity
            onPress={() => {
              // console.log("Button pressed:", item._id);
              handleApply(item._id);
              triggerGlow();
            }}
            style={[
              styles.actionButton,
              isDarkMode ? styles.darkApplyButton : styles.lightApplyButton,
              isApplied && (isDarkMode ? styles.darkAppliedButton : styles.lightAppliedButton),
            ]}
          >
            <Text style={styles.buttonText}>
              {isApplied ? "Applied" : "Apply"}
            </Text>
          </TouchableOpacity>


          {item.postedBy?.hrWhatsappNumber && (
            <TouchableOpacity
              onPress={() => {
                handleWhatsApp(item.postedBy.hrWhatsappNumber, item.postedBy.companyName, item._id);
                triggerGlow();
              }}
              style={[
                styles.actionButton,
                isDarkMode ? styles.darkWhatsAppButton : styles.lightWhatsAppButton,
                isWhatsapped && (isDarkMode ? styles.darkWhatsappedButton : styles.lightWhatsappedButton),
              ]}
            >
              <Text style={styles.buttonText}>WhatsApp</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function JobsList({ isDarkMode, toggleDarkMode, route }) {
  const [jobs, setJobs] = useState([]);
  const [searchSkills, setSearchSkills] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  // const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [appliedJobs, setAppliedJobs] = useState(new Set());
  const [whatsappedJobs, setWhatsappedJobs] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [user, setUser] = useState(route?.params?.user || null);
  // console.log("user", user)
   const { userState, setUserState, globalState, setGlobalHandle, isAuthenticated, setIsAuthenticated } = useContext(JobsContext)
  const [token, setToken] = useState('')
  const [pendingWhatsApp, setPendingWhatsApp] = useState(null);
  const [pendingApply, setPendingApply] = useState(null);



  useEffect(() => {
    const loadToken = async () => {
      const token = await AsyncStorage.getItem('token');
      setToken(token)
      // console.log("Loaded token:", token);
    };

    loadToken();
  }, []);
  // console.log("token", token)

  useEffect(() => {
    // Create an async function inside the effect
    const checkAuthAndFetchJobs = async () => {
      try {
        // const user = await AsyncStorage.getItem('user') || null;
        // if(!user){}

        // setWId(user)
        // console.log("wId user",wId)
        // console.log("user Joblist=",user)
        setIsAuthenticated(!!user);
        await fetchJobs();
      } catch (error) {
        console.error('Error in useEffect:', error);
      }
    };

    // Call the async function
    checkAuthAndFetchJobs();
  }, [route]); // Make sure to include all dependencies



  useEffect(() => {
    if (jobs.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [jobs]);

  const fetchJobs = async (filters = {}) => {
    try {
      setLoading(true);
      const searchFilters = { ...filters, available: true };
      const response = await searchJobs(searchFilters);
      const fetchedJobs = (response.data || []).filter(job => job.available === true);
      setJobs(fetchedJobs);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch jobs: ' + error.message);
      console.error('fetchJobs error:', error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      const searchData = {
        skills: searchSkills.split(',').map(skill => skill.trim()).filter(skill => skill),
        location: searchLocation.trim(),
        available: true,
      };
      const response = await searchJobs(searchData);
      const fetchedJobs = (response.data || []).filter(job => job.available === true);
      // console.log('Searched Jobs in JobsList:', fetchedJobs);
      setJobs(fetchedJobs);
      setSelectedJobId(null);
    } catch (error) {
      console.error('Search Error:', error.response?.data || error);
      Alert.alert('Error', 'Error searching jobs: ' + (error.response?.data?.message || error.message));
      setJobs([]);
    }
  };

  // const handleApply = async (jobId) => {
  //   const jobIdStr = typeof jobId === 'object' && jobId._id ? jobId._id : jobId;

  //   // 👤 Not logged in
  //   console.log("IsAuthenticated?", isAuthenticated);
  //   console.log("User ID:", userState?._id);

  //   if (!isAuthenticated) {
  //     console.log("User not authenticated — showing modal & storing pending job.");
  //     setPendingApply({seekerId: userState._id, jobId: jobIdStr });
  //     setShowAuthModal(true); // show login
  //     return// exit for now
  //   }

  //   // ✅ Logged-in user: Proceed with apply API
  //   try {
  //     const response = await applyToJob({ seekerId: userState._id, jobId: jobIdStr });

  //     setAppliedJobs(prev => {
  //       const updated = new Set(prev);
  //       updated.add(jobIdStr);
  //       return updated;
  //     });

  //     Alert.alert('Success', 'Application submitted!');
  //   } catch (error) {
  //     console.error('❌ Apply API error:', error);
  //     Alert.alert('Error', error?.response?.data?.message || 'Failed to apply');
  //   }
  // };

const handleApply = async (jobId) => {
  const jobIdStr = typeof jobId === 'object' && jobId._id ? jobId._id : jobId;

  const seekerId = userState?._id; // you always have this if logged in

  // console.log("IsAuthenticated?", isAuthenticated);
  // console.log("Seeker ID:", seekerId);
  // console.log("Job ID:", jobIdStr);

  if (!isAuthenticated) {
    // console.log("User NOT authenticated — storing pending jobId");
    setPendingApply(jobIdStr); // store ONLY jobId — seekerId will be known later!
    setShowAuthModal(true);
    return; // stop for now
  }

  try {
    const response = await applyToJob({ seekerId, jobId: jobIdStr });

    setAppliedJobs(prev => {
      const updated = new Set(prev);
      updated.add(jobIdStr);
      return updated;
    });

    Alert.alert('Success', 'Application submitted!');
  } catch (error) {
    console.error('❌ Apply API error:', error);
    Alert.alert('Error', error?.response?.data?.message || 'Failed to apply');
  }
};


useEffect(() => {
  if (isAuthenticated && pendingApply) {
    // console.log("User authenticated — applying pending job");
    handleApply(pendingApply); // only jobId is stored
    setPendingApply(null);
    setShowAuthModal(false);
  }
}, [isAuthenticated, pendingApply]);



  // const handleWhatsApp = (whatsappNumber, companyName, jobId) => {
  //   if (!isAuthenticated) {
  //     setShowAuthModal(true);
  //   } else {
  //     const message = `Hi ${companyName}, I'm interested in your job posting!`;
  //     Linking.openURL(`https://api.whatsapp.com/send?phone=${whatsappNumber.replace(/\D/g, '')}&text=${encodeURIComponent(message)}`);
  //     Alert.alert('Success', `Connected via WhatsApp to ${companyName}`);
  //     setWhatsappedJobs(prev => new Set(prev).add(jobId));
  //   }
  // };

  // const handleWhatsApp = async (number, jobTitle, jobId) => {
  //   console.log("IsAuthenticated?", isAuthenticated);
  //   console.log("User ID:", userState?._id);

  //   if (!isAuthenticated) {
  //     console.log("User not authenticated — showing modal & exiting.");
  //     setShowAuthModal(true);
  //    // ✅ EXIT IMMEDIATELY
  //   }

  //   try {
  //     // ✅ Apply for the job on backend
  //     const response = await axios.post(`http://localhost:5000/api/jobs/apply-job`, {
  //       seekerId: userState._id,
  //       jobId: jobId,
  //       title: jobTitle,
  //       status: 'Connected'
  //     });

  //     console.log("Apply response:", response.data);

  //     // ✅ Mark job as applied
  //     setAppliedJobs(prev => new Set(prev).add(jobId));

  //     // ✅ Format number and open WhatsApp
  //     if (!number.startsWith('+')) {
  //       number = '+91' + number;
  //     }

  //     const message = `Hi, I'm interested in your job posting: ${jobTitle}`;
  //     Linking.openURL(
  //       `https://api.whatsapp.com/send?phone=${number.replace(/\D/g, '')}&text=${encodeURIComponent(message)}`
  //     );
  //   } catch (error) {
  //     console.error("Error applying or opening WhatsApp:", error);
  //   }
  // };


  const handleWhatsApp = async (number, jobTitle, jobId) => {
    // console.log("IsAuthenticated?", isAuthenticated);
    // console.log("User ID:", userState?._id);

    if (!isAuthenticated) {
      // console.log("User not authenticated — showing modal & storing pending job.");
      setPendingWhatsApp({ number, jobTitle, jobId });
      setShowAuthModal(true); // show login
      return; // exit for now
    }

    // ✅ same as before:
    try {
      const response = await axios.post(`https://jobconnectqa-2.onrender.com/api/jobs/apply-job`, {
        seekerId: userState._id,
        jobId,
        title: jobTitle,
        status: 'Connected'
      });


      // console.log("Apply response:", response.data);

      setAppliedJobs(prev => new Set(prev).add(jobId));

      if (!number.startsWith('+')) {
        number = '+91' + number;
      }

      const message = `Hi, I'm interested in your job posting: ${jobTitle}`;
      Linking.openURL(`https://api.whatsapp.com/send?phone=${number.replace(/\D/g, '')}&text=${encodeURIComponent(message)}`);

    } catch (error) {
      console.error("Error applying or opening WhatsApp:", error);
    }
  };
  
  // console.log("JobList ");
  // console.log("User ID:", userState?._id);


  useEffect(() => {
    if (isAuthenticated && pendingWhatsApp) {
      // console.log("User authenticated & pending WhatsApp job exists — applying now");
      handleWhatsApp(pendingWhatsApp.number, pendingWhatsApp.jobTitle, pendingWhatsApp.jobId);
      setPendingWhatsApp(null); // clear it
      setShowAuthModal(false); // close modal if still open
    }
  }, [isAuthenticated, pendingWhatsApp]);

  const handleLoginRedirect = () => {
    setShowAuthModal(false);
    navigation.navigate('Home');
  };

  const handleRegisterRedirect = () => {
    setShowAuthModal(false);
    navigation.navigate('Register');
  };

  const renderJobItem = ({ item }) => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <JobCard
        item={item}
        isDarkMode={isDarkMode}
        isSelected={selectedJobId === item._id}
        onSelect={setSelectedJobId}
        handleApply={handleApply}
        handleWhatsApp={handleWhatsApp}
        appliedJobs={appliedJobs}
        whatsappedJobs={whatsappedJobs}
      />
    </Animated.View>
  );


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
        <Header title="Job Connect" toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {<View style={styles.authButtonsContainer}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Home')}
                style={[styles.authButton, isDarkMode ? styles.darkAuthButton : styles.lightAuthButton]}
              >
                <Text style={styles.buttonText}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                style={[styles.authButton, isDarkMode ? styles.darkAuthButton : styles.lightAuthButton]}
              >
                <Text style={styles.buttonText}>Register</Text>
              </TouchableOpacity>
            </View>}

            <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>
              Search Jobs
            </Text>
            <TextInput
              style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
              placeholder="Search by Skills (e.g., Floor, Manager)"
              value={searchSkills}
              onChangeText={setSearchSkills}
              placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
            />
            <TextInput
              style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
              placeholder="Search by Location (e.g., Mumbai)"
              value={searchLocation}
              onChangeText={setSearchLocation}
              placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
            />
            <TouchableOpacity
              onPress={handleSearch}
              style={[styles.searchButton, isDarkMode ? styles.darkSearchButton : styles.lightSearchButton]}
            >
              <Text style={styles.buttonText}>Search</Text>
            </TouchableOpacity>

            <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>
              All Jobs
            </Text>
            <FlatList
              data={jobs}
              keyExtractor={(item) => item._id.toString()}
              renderItem={renderJobItem}
              ListEmptyComponent={
                <Text style={[styles.emptyText, isDarkMode ? styles.darkText : styles.lightText]}>
                  {loading ? 'Loading Jobs...' : 'No Jobs Found'}
                </Text>
              }
              scrollEnabled={false}
              contentContainerStyle={styles.jobList}
            />

            <Modal
              visible={showAuthModal}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowAuthModal(false)}
            >
              <View style={styles.modalOverlay}>
                && <View style={[styles.modalContent, isDarkMode ? styles.darkModal : styles.lightModal]}>
                  <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>
                    Please Log In or Register
                  </Text>
                  <Text style={[styles.modalText, isDarkMode ? styles.darkSubText : styles.lightSubText]}>
                    You need to log in or create a profile to apply for jobs or contact providers.
                  </Text>
                  <TouchableOpacity
                    onPress={handleLoginRedirect}
                    style={[styles.modalButton, isDarkMode ? styles.darkAuthButton : styles.lightAuthButton]}
                  >
                    <Text style={styles.buttonText}>Login</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleRegisterRedirect}
                    style={[styles.modalButton, isDarkMode ? styles.darkAuthButton : styles.lightAuthButton]}
                  >
                    <Text style={styles.buttonText}>Register</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowAuthModal(false)}
                    style={[styles.closeButton, isDarkMode ? styles.darkCloseButton : styles.lightCloseButton]}
                  >
                    <Text style={styles.buttonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </View>
        </ScrollView>
        <Footer isDarkMode={isDarkMode} />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightContainer: { backgroundColor: '#f5f5f5' },
  darkContainer: { backgroundColor: '#1a1a1a' },
  scrollContent: { paddingBottom: 60, flexGrow: 1 },
  content: { padding: 12 },
  authButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  authButton: {
    flex: 1,
    padding: 10,
    borderRadius: 25,
    alignItems: 'center',
    marginHorizontal: 5,
    elevation: 3,
  },
  lightAuthButton: { backgroundColor: '#007AFF' },
  darkAuthButton: { backgroundColor: '#00cc99' },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginVertical: 8,
    textAlign: 'center',
  },
  lightText: { color: '#333' },
  darkText: { color: '#fff' },
  input: {
    borderWidth: 1,
    padding: 9,
    marginBottom: 15,
    borderRadius: 12,
    fontSize: 13,
    backgroundColor: '#fff',
  },
  lightInput: {
    borderColor: '#ddd',
    color: '#333',
    backgroundColor: '#fff',
    elevation: 2,
  },
  darkInput: {
    borderColor: '#444',
    color: '#fff',
    backgroundColor: '#2a2a2a',
    elevation: 2,
  },
  searchButton: {
    padding: 10,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
  },
  lightSearchButton: { backgroundColor: '#007AFF' },
  darkSearchButton: { backgroundColor: '#ff3366' },
  jobList: {
    paddingBottom: 20,
    paddingTop: 10,
  },
  jobCard: {
    padding: 20,
    marginVertical: 12,
    marginHorizontal: 10,
    borderRadius: 15,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  lightJobCard: { backgroundColor: '#fff' },
  darkJobCard: { backgroundColor: '#2a2a2a' },
  lightSelectedCard: {
    backgroundColor: '#e6f0ff',
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  darkSelectedCard: {
    backgroundColor: '#3a3a3a',
    borderColor: '#00cc99',
    borderWidth: 2,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8
  },
  jobDetails: {
    fontSize: 14,
    marginVertical: 3
  },
  lightSubText: { color: '#666' },
  darkSubText: { color: '#bbb' },
  jobActions: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 15
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    elevation: 2,
  },
  lightApplyButton: { backgroundColor: '#28a745' },
  darkApplyButton: { backgroundColor: '#00cc99' },
  lightAppliedButton: { backgroundColor: '#d4edda' },
  darkAppliedButton: { backgroundColor: '#66ffcc' },
  lightWhatsAppButton: { backgroundColor: '#6f42c1' },
  darkWhatsAppButton: { backgroundColor: '#9933ff' },
  lightWhatsappedButton: { backgroundColor: '#e2d6f5' },
  darkWhatsappedButton: { backgroundColor: '#cc99ff' },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)'
  },
  modalContent: {
    width: '85%',
    padding: 20,
    borderRadius: 20,
    elevation: 5
  },
  lightModal: { backgroundColor: '#fff' },
  darkModal: { backgroundColor: '#2a2a2a' },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
  modalButton: {
    padding: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginVertical: 5,
    elevation: 2,
  },
  closeButton: {
    marginTop: 15,
    padding: 12,
    borderRadius: 25,
    alignItems: 'center'
  },
  lightCloseButton: { backgroundColor: '#dc3545' },
  darkCloseButton: { backgroundColor: '#ff3366' },
});