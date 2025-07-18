import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Animated, Modal, ScrollView, ActivityIndicator, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile, uploadExcel, searchSeekers, searchJobs, deleteSeeker, deleteJob, updateSeekerProfile, updateJob } from '../utils/api';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function AdminDashboard({ isDarkMode, toggleDarkMode, route }) {
  const navigation = useNavigation();
  const [user, setUser] = useState(route?.params?.user || null);
  const [file, setFile] = useState(null);
  const [uploadFileName, setUploadFileName] = useState('');
  const [type, setType] = useState('seekers');
  const [message, setMessage] = useState('');
  const [seekers, setSeekers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({ seekers: 0, providers: 0, jobs: 0 });
  const [editSeeker, setEditSeeker] = useState(null);
  const [editJob, setEditJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadScale] = useState(new Animated.Value(1));
  const [logoutScale] = useState(new Animated.Value(1));
  const [deleteScales, setDeleteScales] = useState({});
  const [editScales, setEditScales] = useState({});

useEffect(() => {
  const init = async () => {
    try {
      setLoading(true);

      let currentUser = user;
      if (!currentUser) {
        const stored = await AsyncStorage.getItem('user');
        if (stored) {
          currentUser = JSON.parse(stored);
          setUser(currentUser);
        }
      }

      if (!currentUser && route?.params?.contact) {
        const isEmail = route.params.contact.includes('@');
        const response = await getProfile({
          role: 'admin',
          ...(isEmail
            ? { email: route.params.contact }
            : { whatsappNumber: route.params.contact }),
        });
        currentUser = response.data;
        setUser(currentUser);
        await AsyncStorage.setItem('user', JSON.stringify({ ...currentUser, role: 'admin' }));
      }

      if (!currentUser) {
        console.log('No contact or user found, redirecting to AuthForm');
        navigation.navigate('JobsList');
        return;
      }

      // Fetch seekers
      const seekersResponse = await searchSeekers({});
      const seekers = seekersResponse.data || [];

      // Fetch jobs
      const jobsResponse = await searchJobs({});
      const jobs = jobsResponse.data || [];

      setSeekers(seekers);
      setJobs(jobs);

      // Stats
      setStats({
        seekers: seekers.length,
        jobs: jobs.length,
        providers: new Set(jobs.map(job => job.postedBy?._id)).size || 0,
      });

      // Set animation scales
      const scales = {};
      seekers.forEach(seeker => {
        scales[seeker._id] = { delete: new Animated.Value(1), edit: new Animated.Value(1) };
      });
      jobs.forEach(job => {
        scales[job._id] = { delete: new Animated.Value(1), edit: new Animated.Value(1) };
      });
      setDeleteScales(scales);
      setEditScales(scales);

    } catch (error) {
      console.error('Error fetching data:', error.message);
      setMessage('Error fetching data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  init();
}, []); // only run on mount
 const handleFilePick = async () => {
    try {
      console.log('Picking file...');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      });
      console.log('Picker result:', JSON.stringify(result, null, 2));
      if (!result.canceled && result.assets) {
        const selectedFile = result.assets[0];
        let fileData;
        if (Platform.OS === 'web') {
          const response = await fetch(selectedFile.uri);
          const blob = await response.blob();
          fileData = new File([blob], selectedFile.name || 'upload.xlsx', {
            type: selectedFile.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
          console.log('Web file picked:', fileData.name, fileData.type, fileData.size);
        } else {
          fileData = {
            uri: selectedFile.uri,
            name: selectedFile.name || 'upload.xlsx',
            type: selectedFile.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          };
          console.log('Mobile file picked:', fileData.uri, fileData.name, fileData.type);
        }
        setFile(fileData);
        setUploadFileName(selectedFile.name);
        setMessage('');
      } else {
        setMessage('No file selected');
        console.log('File pick canceled');
      }
    } catch (error) {
      console.error('handleFilePick error:', error.message, error.stack);
      setMessage('Error selecting file: ' + error.message);
      setFile(null);
      setUploadFileName('');
    }
  };

  const handleUpload = async () => {
  if (!file) {
    setMessage('Please select a file');
    console.log('No file selected for upload');
    return;
  }

  setLoading(true);
  const formData = new FormData();

  if (Platform.OS === 'web') {
    console.log('Appending File for web:', file.name, file.type, file.size);
    formData.append('file', file);
  } else {
    console.log('Appending file for mobile:', file.uri, file.name, file.type);
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    });
  }

  formData.append('type', type);

  try {
    console.log('Uploading file:', file.name, 'with type:', type);
    const response = await uploadExcel(formData);
    console.log('Upload response:', response);

    Alert.alert('Success', response.message || 'Data uploaded successfully!', [
      { text: 'OK', onPress: () => console.log('Success alert closed') },
    ]);

    setMessage(response.message || 'Data uploaded successfully!');
    setFile(null);
    setUploadFileName('');

    // Refresh data
    const seekersResponse = await searchSeekers({});
    const jobsResponse = await searchJobs({});

    setSeekers(seekersResponse.data || []);
    setJobs(jobsResponse.data || []);
    setStats({
      seekers: seekersResponse.data.length,
      jobs: jobsResponse.data.length,
      providers:
        new Set(jobsResponse.data.map(job => job.postedBy?._id)).size || 0,
    });

  } catch (error) {
    console.error('handleUpload error:', error.message, error.stack);
    const errorMsg = error?.message || 'Error uploading Excel. Please try again.';
    Alert.alert('Upload Error', errorMsg);
    setMessage(errorMsg);
  } finally {
    setLoading(false);
  }
};


  const handleDeleteSeeker = async (seekerId) => {
    try {
      console.log('Deleting seeker:', seekerId);
      await deleteSeeker({ seekerId });
      setSeekers(seekers.filter(seeker => seeker._id !== seekerId));
      setStats(prev => ({ ...prev, seekers: prev.seekers - 1 }));
      setMessage('Seeker deleted successfully');
    } catch (error) {
      console.error('handleDeleteSeeker error:', error.message, error.stack);
      setMessage('Error deleting seeker: ' + error.message);
    }
  };

  const handleDeleteJob = async (jobId) => {
    try {
      console.log('Deleting job:', jobId);
      await deleteJob({ jobId });
      setJobs(jobs.filter(job => job._id !== jobId));
      setStats(prev => ({ ...prev, jobs: prev.jobs - 1 }));
      setMessage('Job deleted successfully');
    } catch (error) {
      console.error('handleDeleteJob error:', error.message, error.stack);
      setMessage('Error deleting job: ' + error.message);
    }
  };

  const handleEditSeeker = (seeker) => {
    setEditSeeker(seeker);
  };

  const handleSaveSeeker = async () => {
    try {
      const formData = new FormData();
      formData.append('_id', editSeeker._id);
      formData.append('fullName', editSeeker.fullName || '');
      formData.append('whatsappNumber', editSeeker.whatsappNumber || '');
      formData.append('email', editSeeker.email || '');
      // Add other fields if needed, matching backend expectations
      formData.append('skillType', editSeeker.skillType || 'IT');
      formData.append('skills', Array.isArray(editSeeker.skills) ? editSeeker.skills.join(', ') : editSeeker.skills || '');
      formData.append('experience', editSeeker.experience ? editSeeker.experience.toString() : '0');
      formData.append('location', editSeeker.location || '');
      formData.append('currentCTC', editSeeker.currentCTC ? editSeeker.currentCTC.toString() : '0');
      formData.append('expectedCTC', editSeeker.expectedCTC ? editSeeker.expectedCTC.toString() : '0');
      formData.append('noticePeriod', editSeeker.noticePeriod || '');
      formData.append('lastWorkingDate', editSeeker.lastWorkingDate || '');
      formData.append('bio', editSeeker.bio || '');
  
      const response = await updateSeekerProfile(formData);
      setMessage(response.data.message);
      setSeekers(seekers.map(s => s._id === editSeeker._id ? { ...editSeeker, skills: editSeeker.skills || [] } : s));
      setEditSeeker(null);
    } catch (error) {
      setMessage('Error updating seeker: ' + error.message);
      console.error('Update seeker error:', error);
    }
  };

    const handleEditJob = (job) => {
      setEditJob(job);
    };

    const handleSaveJob = async () => {
      try {
        const payload = {
          _id: editJob._id, // Changed jobId to _id to match seeker update convention
          jobTitle: editJob.jobTitle || '',
          // name: editJob.name || '',
          skills: Array.isArray(editJob.skills) ? editJob.skills : editJob.skills ? editJob.skills.split(', ') : [],
          skillType: editJob.skillType || '',
          experienceRequired: editJob.experienceRequired ? parseInt(editJob.experienceRequired) : 0,
          location: editJob.location || '',
          maxCTC: editJob.maxCTC ? parseInt(editJob.maxCTC) : 0,
          noticePeriod: editJob.noticePeriod || '',
          postedBy: editJob.postedBy?._id || editJob.postedBy // Ensure postedBy is an ID or object
        };
        console.log('Updating job with payload:', payload); // Debug payload
        const response = await updateJob(payload);
        console.log('Update job response:', response.data); // Debug response
        setMessage(response.data.message);
        setJobs(jobs.map(j => j._id === editJob._id ? { ...editJob, skills: payload.skills } : j));
        setEditJob(null);
      } catch (error) {
        setMessage('Error updating job: ' + error.message);
        console.error('Update job error:', error);
      }
    };

  const handleLogout = () => {
    try {
      console.log('Logging out user');
      
      // Reset navigation to Home screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'JobsList' }],
      });
  
    } catch (error) {
      console.error('handleLogout error:', error.message, error.stack);
      setMessage('Error logging out: ' + error.message);
    }
  };
  

  const handlePressIn = (scale) => {
    if (scale) {
      Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
    }
  };

  const handlePressOut = (scale) => {
    if (scale) {
     Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    }
  };

  return (
    <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      <Header title="Admin Dashboard" toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
      <View style={styles.topActions}>
                    {/* <TouchableOpacity style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]} onPress={handleEditProfile} onPressIn={() => handlePressIn(profileScale)} onPressOut={() => handlePressOut(profileScale)} activeOpacity={0.8}>
                      <Animated.View style={{ transform: [{ scale: profileScale }] }}>
                        <Text style={styles.buttonText}>Edit Profile</Text>
                      </Animated.View>
                    </TouchableOpacity> */}
                    {/* <TouchableOpacity style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]} onPress={handleLogout} onPressIn={() => handlePressIn(logoutScale)} onPressOut={() => handlePressOut(logoutScale)} activeOpacity={0.8}>
                      <Animated.View style={{ transform: [{ scale: logoutScale }] }}>
                        <Text style={styles.buttonText}>Logout</Text>
                      </Animated.View>
                    </TouchableOpacity> */}
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {user ? (
          <>
            <Text style={[styles.welcome, isDarkMode ? styles.darkText : styles.lightText]}>
              Welcome, {user.fullName || 'Admin'}!
            </Text>
            <View style={styles.stats}>
              <Text style={[styles.statText, isDarkMode ? styles.darkText : styles.lightText]}>
                Total Job Seekers: {stats.seekers}
              </Text>
              <Text style={[styles.statText, isDarkMode ? styles.darkText : styles.lightText]}>
                Total Job Providers: {stats.providers}
              </Text>
              <Text style={[styles.statText, isDarkMode ? styles.darkText : styles.lightText]}>
                Total Jobs: {stats.jobs}
              </Text>
            </View>
            
            <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>Upload Excel Data</Text>
            <View style={styles.uploadContainer}>
              <TouchableOpacity
                style={[styles.typeButton, type === 'seekers' && styles.activeTypeButton]}
                onPress={() => setType('seekers')}
              >
                <Text style={styles.buttonText}>Seekers</Text>
              </TouchableOpacity>
            <TouchableOpacity
  style={[
    styles.typeButton,
    type === 'jobproviders' && styles.activeTypeButton,
    { opacity: 0.5 } // Optional: dim the button to show it's disabled
  ]}
  onPress={() => setType('jobproviders')}
  disabled={true} // 👈 This disables the button
>
  <Text style={styles.buttonText}>Provider</Text>
</TouchableOpacity>

              <TouchableOpacity
  style={[
    styles.typeButton,
    type === 'jobs' && styles.activeTypeButton,
    { opacity: 0.5 } // visually indicate it's disabled
  ]}
  onPress={() => setType('jobs')}
  disabled={true} // 👈 disables the button
>
  <Text style={styles.buttonText}>Jobs</Text>
</TouchableOpacity>

            </View>
            <Text style={[styles.subtitle, isDarkMode ? styles.darkText : styles.lightText]}>
              {uploadFileName ? `Selected: ${uploadFileName}` : 'No file selected'}
            </Text>
            <TouchableOpacity
              style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
              onPress={handleFilePick}
              onPressIn={() => handlePressIn(uploadScale)}
              onPressOut={() => handlePressOut(uploadScale)}
            >
              <Animated.View style={{ transform: [{ scale: uploadScale }] }}>
                <Text style={styles.buttonText}>Pick Excel File</Text>
              </Animated.View>
            </TouchableOpacity>
            {loading ? (
              <ActivityIndicator size="large" color={isDarkMode ? '#fff' : '#0000ff'} />
            ) : (
              <TouchableOpacity
                style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton, !file && styles.disabledButton]}
                onPress={handleUpload}
                onPressIn={() => handlePressIn(uploadScale)}
                onPressOut={() => handlePressOut(uploadScale)}
                disabled={!file}
              >
                <Animated.View style={{ transform: [{ scale: uploadScale }] }}>
                  <Text style={styles.buttonText}>Upload</Text>
                </Animated.View>
              </TouchableOpacity>
            )}
          
            {message && <Text style={[styles.message, isDarkMode ? styles.darkText : styles.lightText]}>{message}</Text>}

            <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>Job Seekers</Text>
            <FlatList
              data={seekers}
              keyExtractor={(item) => item._id.toString()}
              renderItem={({ item }) => (
                <View style={styles.listItem}>
                  <Text style={[styles.itemText, isDarkMode ? styles.darkText : styles.lightText]}>
                    {item.fullName || 'Unnamed Seeker'} ({item.email || 'No email'})
                  </Text>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.actionButton, isDarkMode ? styles.darkButton : styles.lightButton]}
                      onPress={() => handleEditSeeker(item)}
                      onPressIn={() => handlePressIn(editScales[item._id]?.edit)}
                      onPressOut={() => handlePressOut(editScales[item._id]?.edit)}
                    >
                      <Animated.View style={{ transform: [{ scale: editScales[item._id]?.edit || new Animated.Value(1) }] }}>
                        <Text style={styles.buttonText}>Edit</Text>
                      </Animated.View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteSeeker(item._id)}
                      onPressIn={() => handlePressIn(deleteScales[item._id]?.delete)}
                      onPressOut={() => handlePressOut(deleteScales[item._id]?.delete)}
                    >
                      <Animated.View style={{ transform: [{ scale: deleteScales[item._id]?.delete || new Animated.Value(1) }] }}>
                        <Text style={styles.buttonText}>Delete</Text>
                      </Animated.View>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={[styles.emptyText, isDarkMode ? styles.darkText : styles.lightText]}>No seekers found</Text>}
            />

            <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>Posted Jobs</Text>
            <FlatList
              data={jobs}
              keyExtractor={(item) => item._id.toString()}
              renderItem={({ item }) => (
                <View style={styles.listItem}>
                  <Text style={[styles.itemText, isDarkMode ? styles.darkText : styles.lightText]}>
                    {item.skills[0] || 'Unnamed Job'} - {item.postedBy?.companyName || user?.postedBy?.hrName || 'Ajay Dixit'}
                  </Text>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.actionButton, isDarkMode ? styles.darkButton : styles.lightButton]}
                      onPress={() => handleEditJob(item)}
                      onPressIn={() => handlePressIn(editScales[item._id]?.edit)}
                      onPressOut={() => handlePressOut(editScales[item._id]?.edit)}
                    >
                      <Animated.View style={{ transform: [{ scale: editScales[item._id]?.edit || new Animated.Value(1) }] }}>
                        <Text style={styles.buttonText}>Edit</Text>
                      </Animated.View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteJob(item._id)}
                      onPressIn={() => handlePressIn(deleteScales[item._id]?.delete)}
                      onPressOut={() => handlePressOut(deleteScales[item._id]?.delete)}
                    >
                      <Animated.View style={{ transform: [{ scale: deleteScales[item._id]?.delete || new Animated.Value(1) }] }}>
                        <Text style={styles.buttonText}>Delete</Text>
                      </Animated.View>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={[styles.emptyText, isDarkMode ? styles.darkText : styles.lightText]}>No jobs found</Text>}
            />

            <TouchableOpacity
              style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
              onPress={handleLogout}
              onPressIn={() => handlePressIn(logoutScale)}
              onPressOut={() => handlePressOut(logoutScale)}
            >
              <Animated.View style={{ transform: [{ scale: logoutScale }] }}>
                <Text style={styles.buttonText}>Logout</Text>
              </Animated.View>
            </TouchableOpacity>

            {/* Edit Seeker Modal */}
            <Modal visible={!!editSeeker} transparent={true} animationType="slide">
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, isDarkMode ? styles.darkModal : styles.lightModal]}>
                  <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>Edit Seeker</Text>
                  <Text syle={[styles.label]}>Seeker Name</Text>
                  <TextInput
                    style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
                    value={editSeeker?.fullName || ''}
                    onChangeText={(text) => setEditSeeker({ ...editSeeker, fullName: text })}
                    placeholder="Full Name"
                    placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
                  />
                  <Text syle={[styles.label]}>WhatsApp Number</Text>
                  <TextInput
                    style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
                    value={editSeeker?.whatsappNumber || ''}
                    onChangeText={(text) => setEditSeeker({ ...editSeeker, whatsappNumber: text })}
                    placeholder="WhatsApp Number"
                    placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
                  />
                  <Text syle={[styles.label]}>Seeker Email</Text>
                  <TextInput
                    style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
                    value={editSeeker?.email || ''}
                    onChangeText={(text) => setEditSeeker({ ...editSeeker, email: text })}
                    placeholder="Email"
                    placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
                  />
                  <TouchableOpacity
                    style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
                    onPress={handleSaveSeeker}
                  >
                    <Text style={styles.buttonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
                    onPress={() => setEditSeeker(null)}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* Edit Job Modal */}
            <Modal visible={!!editJob} transparent={true} animationType="slide">
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, isDarkMode ? styles.darkModal : styles.lightModal]}>
                  <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>Edit Job</Text>
                  <Text syle={[styles.label]}>Job Names</Text>
                  <TextInput
                    style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
                    value={editJob?.skills?.join(', ') || ''}
                    onChangeText={(text) => setEditJob({ ...editJob, skills: text.split(', ') })}
                    placeholder="Job Names (comma-separated)"
                    placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
                  />
                  <Text syle={[styles.label]}>Job Location</Text>
                  <TextInput
                    style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
                    value={editJob?.location || ''}
                    onChangeText={(text) => setEditJob({ ...editJob, location: text })}
                    placeholder="Location"
                    placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
                  />
                  <Text syle={[styles.label]}>Experience Required (Months)</Text>
                  <TextInput
                    style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
                    value={editJob?.experienceRequired?.toString() || ''}
                    onChangeText={(text) => setEditJob({ ...editJob, experienceRequired: parseInt(text) || 0 })}
                    placeholder="Experience Required (Months)"
                    keyboardType="numeric"
                    placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
                  />
                  <TouchableOpacity
                    style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
                    onPress={handleSaveJob}
                  >
                    <Text style={styles.buttonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
                    onPress={() => setEditJob(null)}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </>
        ) : (
          <Text style={[styles.loading, isDarkMode ? styles.darkText : styles.lightText]}>Loading profile...</Text>
        )}
      </ScrollView>
      <Footer isDarkMode={isDarkMode} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightContainer: { backgroundColor: '#f0f0f0' },
  darkContainer: { backgroundColor: '#111' },
  scrollContent: { padding: 10, paddingBottom: 60 },
  welcome: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  stats: { marginBottom: 20, padding: 10, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ccc' },
  statText: { fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginVertical: 10 },
  subtitle: { fontSize: 14, marginBottom: 10 },
  uploadContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  typeButton: { padding: 10, backgroundColor: '#007AFF', borderRadius: 5 },
  activeTypeButton: { backgroundColor: '#003F87' },
  button: { paddingVertical: 15, paddingHorizontal: 30, borderRadius: 25, alignItems: 'center', marginBottom: 10 },
  lightButton: { backgroundColor: '#007AFF' },
  darkButton: { backgroundColor: '#005BB5' },
  disabledButton: { backgroundColor: '#888', opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
message: {
  marginTop: 10,
  fontSize: 16,
  textAlign: 'center',
  color: 'green', // or red for errors
},

  loading: { fontSize: 16, textAlign: 'center' },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, backgroundColor: '#fff', borderRadius: 5, marginBottom: 5 },
  itemText: { fontSize: 16 },
  actions: { flexDirection: 'row', gap: 10 },
  actionButton: { padding: 5, borderRadius: 5 },
  deleteButton: { backgroundColor: '#FF3B30' },
  emptyText: { fontSize: 16, textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '80%', padding: 20, borderRadius: 10 },
  lightModal: { backgroundColor: '#fff' },
  darkModal: { backgroundColor: '#333' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
  lightInput: { borderColor: '#ccc', color: '#000' },
  darkInput: { borderColor: '#555', color: '#ddd', backgroundColor: '#333' },
  lightText: { color: '#333' },
  darkText: { color: '#ddd' },
  label: {
    position: "absolute",
    fontSize: 15,
    fontWeight: "700",
    zIndex: 10,
    paddingHorizontal: 4,
  },
});


//only chnage unknown provideer