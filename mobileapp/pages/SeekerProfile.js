// import React, { useState, useEffect, useContext } from "react";
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Animated,
//   ScrollView,
//   Platform,
//   Alert,
// } from "react-native";
// import { Picker } from '@react-native-picker/picker';
// import { useNavigation } from "@react-navigation/native";
// import * as DocumentPicker from "expo-document-picker";
// import { createSeekerProfile, updateSeekerProfile } from "../utils/api";
// import Header from "../components/Header";
// import Footer from "../components/Footer";
// import { JobsContext } from "../components/context";
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const jobOptions = [
//   "Driver", 
//   "Cook", 
//   "Receptionist",
//   "Accountant", 
//   "Security Guard", 
//   "Laundry",
//   "Housekeeping"
// ];

// const locationOptions = [
//   "Bhopal", 
//   "Indore", 
//   "Gwalior",
//   "Mumbai", 
//   "Bangalore", 
//   "Pune"
// ];

// const experienceOptions = Array.from({ length: 12 }, (_, i) => `${i + 1} ${i + 1 === 1 ? 'month' : 'months'}`);

// const SeekerProfile = ({ isDarkMode, toggleDarkMode, route }) => {
//   const [formData, setFormData] = useState({
//     fullName: "",
//     whatsappNumber:
//       route?.params?.contact && !route?.params?.isEmail
//         ? route.params.contact
//         : "",
//     email:
//       route?.params?.contact && route?.params?.isEmail
//         ? route.params.contact
//         : "",
//     skills: "",
//     experience: "",
//     location: "",
//     currentCTC: "",
//     expectedCTC: "",
//     noticePeriod: "",
//   });
//   const [message, setMessage] = useState("");
//   const [profileCreated, setProfileCreated] = useState(false);
//   const [isEditMode, setIsEditMode] = useState(!!route?.params?.user);
//   const [focusedField, setFocusedField] = useState(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const navigation = useNavigation();
//   const [submitScale] = useState(new Animated.Value(1));
//   const [dashboardScale] = useState(new Animated.Value(1));
//   const [uploadScale] = useState(new Animated.Value(1));
//   const { userState, setUserState, globalState, setGlobalHandle, isAuthenticated, setIsAuthenticated } = useContext(JobsContext);

//   useEffect(() => {
//     if (isEditMode && route?.params?.user) {
//       setFormData({
//         fullName: route.params.user.fullName || "",
//         whatsappNumber: route.params.user.whatsappNumber || "",
//         email: route.params.user.email || "",
//         skills: route.params.user.skills || "",
//         experience: route.params.user.experience || "",
//         location: route.params.user.location || "",
//         currentCTC: route.params.user.currentCTC || "",
//         expectedCTC: route.params.user.expectedCTC || "",
//         noticePeriod: route.params.user.noticePeriod || "",
//       });
//     }
//   }, [route, isEditMode]);

//   const handleChange = (name, value) => {
//     if (["currentCTC", "expectedCTC", "noticePeriod"].includes(name)) {
//       const numericOnly = value.replace(/[^0-9]/g, "");
//       let cappedValue = numericOnly;

//       if (["currentCTC", "expectedCTC"].includes(name)) {
//         cappedValue = numericOnly ? Math.min(parseInt(numericOnly), 100000).toString() : "";
//       }

//       setFormData((prev) => ({ ...prev, [name]: cappedValue }));
//     } else {
//       setFormData((prev) => ({ ...prev, [name]: value }));
//     }
//   };

//   const handleFocus = (name) => setFocusedField(name);
//   const handleBlur = () => setFocusedField(null);

//   const handleSubmitProfile = async () => {
//     if (!formData.fullName) {
//       setMessage("Please fill in full name");
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       const profileData = new FormData();
//       profileData.append("fullName", formData.fullName);
//       profileData.append("whatsappNumber", formData.whatsappNumber || "");
//       profileData.append("email", formData.email || "");
//       profileData.append("skills", formData.skills || "");
//       profileData.append("experience", formData.experience || "");
//       profileData.append("location", formData.location || "");
//       profileData.append("currentCTC", formData.currentCTC || "");
//       profileData.append("expectedCTC", formData.expectedCTC || "");
//       profileData.append("noticePeriod", formData.noticePeriod || "");

//       if (isEditMode) {
//         profileData.append("_id", route.params.user._id);
//       }

//       let response;
//       if (isEditMode) {
//         response = await updateSeekerProfile(profileData);
//       } else {
//         response = await createSeekerProfile(profileData);

//         const safeSetItem = async (key, value) => {
//           if (value != null) {
//             await AsyncStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
//           } else {
//             await AsyncStorage.removeItem(key);
//           }
//         };

//         await safeSetItem('user', response.data.user);
//         await safeSetItem('token', response.data.token);

//         setUserState(response.data.user || null);
//         setIsAuthenticated(true);
//       }

//       setMessage(response.data.message);
//       setProfileCreated(true);

//       navigation.navigate("SeekerDashboard", {
//         user: response.data.user || {
//           ...formData,
//           _id: isEditMode ? route.params.user._id : response.data.user?._id,
//         },
//         contact: formData.whatsappNumber || formData.email,
//       });
//     } catch (error) {
//       console.error("API error:", error.response?.data || error.message);
//       setMessage("Error saving profile: " + (error.response?.data?.message || error.message));
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handleGoToDashboard = () => {
//     navigation.navigate("SeekerDashboard", {
//       user: { ...route.params.user, ...formData },
//     });
//   };

//   const handlePressIn = (scale) =>
//     Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
//   const handlePressOut = (scale) =>
//     Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

//   const renderInput = (label, name, type = "text", placeholder, additionalProps = {}) => {
//     if (type === "select") {
//       return (
//         <View style={[styles.inputContainer]}>
//           <Text
//             style={[
//               styles.label,
//               isDarkMode ? styles.darkText : styles.lightText,
//               formData[name] ? styles.labelActive : styles.labelInactive,
//               isDarkMode && formData[name] ? styles.darkLabelActive : {},
//               !isDarkMode && formData[name] ? styles.lightLabelActive : {},
//             ]}
//           >
//             {label}
//           </Text>
//           <View style={[styles.pickerContainer, isDarkMode ? styles.darkPicker : styles.lightPicker]}>
//             <Picker
//               selectedValue={formData[name]}
//               onValueChange={(value) => handleChange(name, value)}
//               dropdownIconColor={isDarkMode ? "#fff" : "#000"}
//               style={[styles.picker, { color: isDarkMode ? '#fff' : '#000' }]}
//               mode="dropdown"
//             >
//               <Picker.Item label={`Select ${label}`} value="" />
//               {additionalProps.options?.map((option, idx) => (
//                 <Picker.Item key={idx} label={option} value={option} />
//               ))}
//             </Picker>
//           </View>
//         </View>
//       );
//     }

//     return (
//       <View style={styles.inputContainer}>
//         <Text
//           style={[
//             styles.label,
//             isDarkMode ? styles.darkText : styles.lightText,
//             focusedField === name || formData[name] ? styles.labelActive : styles.labelInactive,
//             isDarkMode && (focusedField === name || formData[name]) ? styles.darkLabelActive : {},
//             !isDarkMode && (focusedField === name || formData[name]) ? styles.lightLabelActive : {},
//           ]}
//         >
//           {label}
//         </Text>
//         <TextInput
//           style={[
//             styles.input,
//             isDarkMode ? styles.darkInput : styles.lightInput,
//             focusedField === name ? styles.inputFocused : {},
//           ]}
//           value={formData[name]}
//           onChangeText={(text) => handleChange(name, text)}
//           onFocus={() => handleFocus(name)}
//           onBlur={handleBlur}
//           placeholder={focusedField === name ? placeholder : ""}
//           placeholderTextColor={isDarkMode ? "#888" : "#ccc"}
//           keyboardType={additionalProps.keyboardType || (type === "number" ? "numeric" : "default")}
//           maxLength={additionalProps.maxLength || undefined}
//         />
//       </View>
//     );
//   };
  

//   return (
//     <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
//       <Header title={isEditMode ? "Edit Seeker Profile" : "Create Seeker Profile"} toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         <View style={styles.main}>
//           <View style={[styles.formContainer, isDarkMode ? styles.darkFormContainer : styles.lightFormContainer]}>
//             <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>
//               {isEditMode ? "Update Your Profile" : "Create Seeker Profile"}
//             </Text>
//             {!profileCreated || isEditMode ? (
//               <>
//                 {renderInput("Full Name", "fullName", "text", "Enter full name")}
//                 {renderInput("WhatsApp Number", "whatsappNumber", "text", "Enter WhatsApp number")}
//                 {renderInput("Email", "email", "email", "Enter email")}
//                 {renderInput("Job Name", "skills", "select", "", { options: jobOptions })}
//                 {renderInput("Experience", "experience", "select", "", { options: experienceOptions })}
//                 {renderInput("Location", "location", "select", "", { options: locationOptions })}
//                 {renderInput("Current Salary", "currentCTC", "number", "Enter current Salary", { maxLength: 6, keyboardType: "numeric" })}
//                 {renderInput("Expected Salary", "expectedCTC", "number", "Enter Expected Salary", { maxLength: 6, keyboardType: "numeric" })}
//                 {renderInput("Join Within (Days)", "noticePeriod", "number", "Join Within Days", { keyboardType: "numeric" })}

//                 <View style={{ height: 10 }} />
//                 <TouchableOpacity
//                   style={styles.button}
//                   onPress={handleSubmitProfile}
//                   onPressIn={() => handlePressIn(submitScale)}
//                   onPressOut={() => handlePressOut(submitScale)}
//                   activeOpacity={0.8}
//                   disabled={isSubmitting}
//                 >
//                   <Animated.View style={[styles.buttonWrap, { transform: [{ scale: submitScale }] }]}>
//                     <Text style={styles.buttonText}>
//                       {isSubmitting ? "Saving..." : "Save Profile"}
//                     </Text>
//                   </Animated.View>
//                 </TouchableOpacity>
//               </>
//             ) : (
//               <TouchableOpacity
//                 style={styles.button}
//                 onPress={handleGoToDashboard}
//                 onPressIn={() => handlePressIn(dashboardScale)}
//                 onPressOut={() => handlePressOut(dashboardScale)}
//                 activeOpacity={0.8}
//               >
//                 <Animated.View style={[styles.buttonWrap, { transform: [{ scale: dashboardScale }] }]}>
//                   <Text style={styles.buttonText}>Go to Dashboard</Text>
//                 </Animated.View>
//               </TouchableOpacity>
//             )}
//             {message && (
//               <Text style={[styles.message, isDarkMode ? styles.darkText : styles.lightText]}>
//                 {message}
//               </Text>
//             )}
//           </View>
//         </View>
//       </ScrollView>
//       <Footer isDarkMode={isDarkMode} />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   lightContainer: { backgroundColor: "#F3F4F6" },
//   darkContainer: { backgroundColor: "#1F2937" },
//   scrollContent: { 
//     flexGrow: 1,
//     paddingBottom: 20,
//     paddingTop: 10,
//   },
//   main: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     paddingHorizontal: 16,
//   },
//   formContainer: {
//     width: "100%",
//     maxWidth: 400,
//     padding: 24,
//     borderRadius: 8,
//     elevation: 5,
//     borderWidth: 1,
//     marginVertical: 10,
//   },
//   lightFormContainer: { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" },
//   darkFormContainer: { backgroundColor: "#222", borderColor: "#4B5563" },
//   title: {
//     fontSize: 24,
//     fontWeight: "600",
//     marginBottom: 24,
//     textAlign: "center",
//   },
//   lightText: { color: "#1F2937" },
//   darkText: { color: "#F9FAFB" },
//   inputContainer: {
//     minHeight: 65,
//     width: "100%",
//     position: "relative",
//     marginBottom: 16,
//   },
//   label: {
//     position: "absolute",
//     fontSize: 15,
//     fontWeight: "700",
//     zIndex: 10,
//     paddingHorizontal: 4,
//   },
//   labelInactive: { top: 13, left: 10 },
//   labelActive: { 
//     top: -10, 
//     left: 10, 
//     transform: [{ translateY: -1 }],
//     fontSize: 13,
//   },
//   lightLabelActive: { backgroundColor: "#FFFFFF" },
//   darkLabelActive: { backgroundColor: "#222" },
//   input: {
//     width: "100%",
//     height: 45,
//     borderRadius: 6,
//     padding: 8,
//     fontSize: 15,
//     backgroundColor: "transparent",
//     borderWidth: 1,
//   },
//   lightInput: {
//     backgroundColor: "#FFFFFF",
//     color: "#1F2937",
//     borderColor: "#D1D5DB",
//   },
//   darkInput: {
//     backgroundColor: "#374151",
//     color: "#F9FAFB",
//     borderColor: "#4B5563",
//   },
//   inputFocused: {
//     borderWidth: 2,
//     borderColor: "#3B82F6",
//   },
//   pickerContainer: {
//     height: 45,
//     width: "100%",
//     borderRadius: 6,
//     justifyContent: "center",
//     borderWidth: 1,
//     marginTop: 8,
//   },
//   lightPicker: {
//     backgroundColor: "#FFFFFF",
//     borderColor: "#D1D5DB",
//   },
//   darkPicker: {
//     backgroundColor: "#374151",
//     borderColor: "#4B5563",
//   },
//   picker: {
//     width: "100%",
//     height: "100%",
//   },
//   button: {
//     width: "100%",
//     borderRadius: 25,
//     backgroundColor: "#080808",
//     elevation: 3,
//     marginTop: 10,
//   },
//   buttonWrap: {
//     paddingVertical: 12,
//     paddingHorizontal: 20,
//     borderRadius: 25,
//     backgroundColor: "rgba(255, 255, 255, 0.12)",
//   },
//   buttonText: {
//     fontSize: 16,
//     fontWeight: "500",
//     color: "rgba(255, 255, 255, 0.7)",
//     textAlign: "center",
//   },
//   message: { 
//     marginTop: 8, 
//     textAlign: "center",
//     fontSize: 14,
//   },
// });

// export default SeekerProfile;

































import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";
import { createSeekerProfile, updateSeekerProfile } from "../utils/api";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { JobsContext } from "../components/context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const jobOptions = ["Driver", "Cook", "Receptionist", "Accountant", "Security Guard", "Laundry", "Housekeeping"];
const locationOptions = ["Bhopal", "Indore", "Gwalior", "Mumbai", "Bangalore", "Pune"];
const experienceOptions = Array.from({ length: 12 }, (_, i) => `${i + 1} ${i + 1 === 1 ? "month" : "months"}`);

const SeekerProfile = ({ isDarkMode, toggleDarkMode, route }) => {
  const [formData, setFormData] = useState({
    fullName: "",
    whatsappNumber: route?.params?.contact && !route?.params?.isEmail ? route.params.contact : "",
    email: route?.params?.contact && route?.params?.isEmail ? route.params.contact : "",
    skills: "",
    experience: "",
    location: "",
    currentCTC: "",
    expectedCTC: "",
    noticePeriod: "",
    bio: "",
  });

  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!route?.params?.user;
  const navigation = useNavigation();
  const { setUserState, setIsAuthenticated } = useContext(JobsContext);

  useEffect(() => {
    if (isEditMode && route?.params?.user) {
      const user = route.params.user;
      setFormData({
        fullName: user.fullName || "",
        whatsappNumber: user.whatsappNumber || "",
        email: user.email || "",
        skills: user.skills || "",
        experience: user.experience?.toString() || "",
        location: user.location || "",
        currentCTC: user.currentCTC?.toString() || "",
        expectedCTC: user.expectedCTC?.toString() || "",
        noticePeriod: user.noticePeriod || "",
        bio: user.bio || "",
      });
    }
  }, [route, isEditMode]);

  const handleChange = (name, value) => {
    const numericFields = ["currentCTC", "expectedCTC", "experience", "noticePeriod"];
    if (numericFields.includes(name)) {
      const numericOnly = value.replace(/[^0-9]/g, "");
      setFormData((prev) => ({ ...prev, [name]: numericOnly }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmitProfile = async () => {
    if (!formData.fullName) {
      setMessage("Please enter full name");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const profileData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        profileData.append(key, value);
      });

      if (isEditMode) {
        profileData.append("_id", route.params.user._id);
      }

      let response;
      if (isEditMode) {
        response = await updateSeekerProfile(profileData);
        await AsyncStorage.setItem("user", JSON.stringify(response.data.user));
        setUserState(response.data.user || null);
      } else {
        response = await createSeekerProfile(profileData);
        await AsyncStorage.setItem("user", JSON.stringify(response.data.user));
        setUserState(response.data.user || null);
        setIsAuthenticated(true);
      }

      setMessage(response.data.message || "Profile saved successfully");
      navigation.navigate("SeekerDashboard", {
        user: response.data.user || formData,
        contact: formData.whatsappNumber || formData.email,
      });
    } catch (error) {
      console.error("API error:", error.response?.data || error.message);
      setMessage(error.response?.data?.message || "Error saving profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInput = (label, name, type = "text", placeholder) => (
    <View style={styles.fieldContainer}>
      <Text style={[styles.label, isDarkMode ? styles.darkText : styles.lightText]}>{label}</Text>
      <TextInput
        style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
        value={formData[name]}
        onChangeText={(text) => handleChange(name, text)}
        placeholder={placeholder}
        placeholderTextColor={isDarkMode ? "#888" : "#ccc"}
        keyboardType={type === "number" ? "numeric" : "default"}
      />
    </View>
  );

  const renderPicker = (label, name, options) => (
    <View style={styles.fieldContainer}>
      <Text style={[styles.label, isDarkMode ? styles.darkText : styles.lightText]}>{label}</Text>
      <View style={[styles.pickerContainer, isDarkMode ? styles.darkPicker : styles.lightPicker]}>
        <Picker
          selectedValue={formData[name]}
          onValueChange={(value) => handleChange(name, value)}
          dropdownIconColor={isDarkMode ? "#fff" : "#000"}
          style={[styles.picker, { color: isDarkMode ? "#fff" : "#000" }]}
        >
          <Picker.Item label={`Select ${label}`} value="" />
          {options.map((option, idx) => (
            <Picker.Item key={idx} label={option} value={option} />
          ))}
        </Picker>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      <Header title={isEditMode ? "Edit Seeker Profile" : "Create Seeker Profile"} toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formContainer}>
          <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>
            {isEditMode ? "Update Your Profile" : "Create Seeker Profile"}
          </Text>

          {renderInput("Full Name", "fullName", "text", "Enter full name")}
          {renderInput("WhatsApp Number", "whatsappNumber", "number", "Enter WhatsApp number")}
          {renderInput("Email", "email", "text", "Enter email")}
          {renderPicker("Job Name", "skills", jobOptions)}
          {renderPicker("Experience", "experience", experienceOptions)}
          {renderPicker("Location", "location", locationOptions)}
          {renderInput("Current Salary", "currentCTC", "number", "Enter current salary")}
          {renderInput("Expected Salary", "expectedCTC", "number", "Enter expected salary")}
          {renderInput("Join Within (Days)", "noticePeriod", "number", "Join within days")}

          <TouchableOpacity style={styles.button} onPress={handleSubmitProfile} disabled={isSubmitting}>
            <Text style={styles.buttonText}>{isSubmitting ? "Saving..." : "Save Profile"}</Text>
          </TouchableOpacity>

          {message ? <Text style={[styles.message, isDarkMode ? styles.darkText : styles.lightText]}>{message}</Text> : null}
        </View>
      </ScrollView>
      <Footer isDarkMode={isDarkMode} />
    </View>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1 },
  lightContainer: { backgroundColor: "#F3F4F6" },
  darkContainer: { backgroundColor: "#1F2937" },
  scrollContent: { padding: 16 },
  formContainer: { backgroundColor: "#fff", borderRadius: 8, padding: 16, elevation: 3 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 16, textAlign: "center" },
  label: { fontSize: 14, marginBottom: 4 },
  lightText: { color: "#000" },
  darkText: { color: "#fff" },
  fieldContainer: { marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, height: 45 },
  lightInput: { borderColor: "#ccc", backgroundColor: "#fff", color: "#000" },
  darkInput: { borderColor: "#555", backgroundColor: "#333", color: "#fff" },
  pickerContainer: { borderWidth: 1, borderRadius: 4 },
  lightPicker: { borderColor: "#ccc", backgroundColor: "#fff" },
  darkPicker: { borderColor: "#555", backgroundColor: "#333" },
  picker: { height: 50 },
  button: { backgroundColor: "#007BFF", padding: 12, borderRadius: 4, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold" },
  message: { marginTop: 12, textAlign: "center" },
});

export default SeekerProfile;