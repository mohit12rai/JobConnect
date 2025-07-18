import axios from 'axios';
import { Platform } from 'react-native';

// Local backend URL with your IP
// API_URL = "http://localhost:5000/api";

// const BASE_URL = Platform.OS === 'web' ? 'http://localhost:5000/api' : 'http://192.168.31.124:5000/api';
const BASE_URL = Platform.OS === 'web' ? 'https://jobconnectqa-2.onrender.com/api' : 'https://jobconnectqa-2.onrender.com/api';
API_URL = "https://jobconnectqa-2.onrender.com/api";


// const BASE_URL = 'https://jobconnectqa-2.onrender.com'
// Default axios instance for JSON requests
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});


// Authentication
export const requestOTP = (data) => api.post('/auth/request-otp', data);
export const verifyOTP = (data) => api.post('/auth/verify-otp', data);



export const getProfile = async (data) => {
  try {
    // Changed to use api instance instead of raw axios for consistency
    const response = await api.get('/auth/profile', { params: data });
    return response;
  } catch (error) {
    console.error('getProfile error:', error.response?.data || error.message);
    throw error;
  }
};  

// Seeker profile with FormData for resume upload
export const createSeekerProfile = (data) => {
  console.log('Sending createSeekerProfile request with data:', [...data.entries()]);
  return axios.post(`${BASE_URL}/profile/seeker`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Updated updateSeekerProfile to handle FormData for resume upload and fix endpoint
export const updateSeekerProfile = (data) => {
  console.log('Sending updateSeekerProfile request with data:', [...data.entries()]);
  return axios.post(`${BASE_URL}/profile/seeker/update`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const createProviderProfile = (data) => api.post('/profile/provider', data);
export const updateProviderProfile = (data) => api.post('/profile/provider/update', data);

// Jobs
// export const postJob = async (jobData) => {
//   // Log the full request details for debugging
//   console.log('Sending postJob request:', { 
//     url: `${API_URL}/jobs/post`, 
//     data: jobData, 
//     headers: { Authorization: `Bearer ${localStorage.getItem('token') || 'none'}` }
//   });
//   try {
//     // Make the POST request to /jobs/post
//     const response = await api.post('/jobs/post', jobData);
//     // Log the successful response data
//     console.log('postJob response:', response.data);
//     // Return the response data directly (consistent with current behavior)
//     return response.data;
//   } catch (error) {
//     // Log the full error details, including status and response data if available
//     console.error('postJob error:', {
//       message: error.message,
//       status: error.response?.status,
//       data: error.response?.data || 'No response data'
//     });
//     // Throw the error with detailed info (backend response or generic error)
//     throw error.response?.data || error;
//   }
// };
export const postJob = (data) => api.post('/jobs/post', data); //new line

export const searchJobs = async (data) => {
  try {
    const params = {
      ...data,
      skills: data.skills ? data.skills.join(",") : undefined,
    };
    console.log("Sending searchJobs request with params:", params);

    // Fetch all jobs if skills are provided, otherwise use filters
    const response = await api.get("/jobs/search", { 
      params: data.skills ? {} : params // Fetch all jobs if skills search, else use filters
    });
    let jobs = response.data;

    // Client-side filtering for partial, case-insensitive skill matches
    if (data.skills && Array.isArray(data.skills) && data.skills.length > 0) {
      // Function to remove spaces and lowercase a string
      const normalize = (str) => str.replace(/\s+/g, '').toLowerCase();

      // If multiple terms (comma-separated), require all to match
      if (data.skills.length > 1) {
        const skillTerms = data.skills.map(skill => normalize(skill.trim()));
        console.log("Comma-separated skill terms:", skillTerms);
        jobs = jobs.filter(job => 
          job.skills && Array.isArray(job.skills) && 
          skillTerms.every(term => 
            job.skills.some(skill => normalize(skill).includes(term))
          )
        );
      } else {
        // Single term: match as a whole, ignoring spaces
        const searchTerm = normalize(data.skills[0].trim());
        console.log("Single skill term (normalized):", searchTerm);
        jobs = jobs.filter(job => 
          job.skills && Array.isArray(job.skills) && 
          job.skills.some(skill => normalize(skill).includes(searchTerm))
        );
      }
    }

    // Apply location filter client-side if provided
    if (data.location) {
      const locationLower = data.location.trim().toLowerCase();
      jobs = jobs.filter(job => 
        job.location && job.location.toLowerCase().includes(locationLower)
      );
    }

    console.log("Filtered jobs:", jobs);
    return { ...response, data: jobs }; // Return filtered results in response format
  } catch (error) {
    console.error("searchJobs error:", error.response?.data || error.message);
    throw error;
  }
};

export const sendWhatsAppMessage = (data) => api.post('/jobs/whatsapp', data);
export const getTrendingSkills = () => api.get('/jobs/trending-skills');
export const sendMassEmail = (data) => api.post('/jobs/mass-email', data);
export const searchSeekers = (data) => api.get('/jobs/seekers', { params: data });

// Excel upload using fetch (unchanged, already handles FormData)
export const uploadExcel = (formData) => {
  console.log('API Request - uploadExcel FormData:', formData._parts);

  return fetch(`${BASE_URL}/jobs/upload-excel`, {
    method: 'POST',
    body: formData,
  })
    .then(response => {
      console.log('Response status:', response.status);

      return response.text().then(text => {
        console.log('Raw server response:', text);

        let json;
        try {
          json = JSON.parse(text);
        } catch (e) {
          throw new Error('Invalid JSON response: ' + text);
        }

        if (!response.ok) {
          throw new Error(json.message || `Upload failed with status ${response.status}`);
        }

        return json;
      });
    })
    .catch(error => {
      console.error('Fetch error:', error.message, error.stack);
      throw error;
    });
};


export const getJobsAppliedFor = (seekerId) => api.get('/jobs/get/appliedfor', {params:{seekerId}});

export const deleteSeeker = (data) => api.post('/jobs/delete-seeker', data);
export const deleteJob = (data) => api.post('/jobs/delete', data);
export const saveSearch = (data) => api.post('/jobs/save-search', data);
export const applyToJob = async ({ seekerId, jobId }) => {
  console.log("Sending apply request with:", { seekerId, jobId }); // check log here
  return axios.post(`${BASE_URL}/jobs/apply-job`, { seekerId, jobId });

};
console.log("api ")
export const getPostedJobs = async () => {
  try {
    const response = await api.get('/jobs/posted');
    return response;
  } catch (error) {
    console.error('getPostedJobs error:', error.response?.data || error.message);
    throw error;
  }
};
// api.js

export const changeJobAvailibility = (jobId) => {
  return axios.post(`${BASE_URL}/jobs/change/availibility/${jobId}`);
};

// export const changeJobAvailibility = (data) => {
//   return axios.post(`${BASE_URL}/jobs/change/availibility`, data);
// };

export const getApplicants = (providerId, jobId) => api.get('/jobs/applicants', { params: {providerId, jobId } });

export const updateJob = async (jobData) => {
  console.log('Sending updateJob request:', { url: `${API_URL}/jobs/update-job`, data: jobData, method: 'POST' });
  try {
    const response = await api.post('/jobs/update-job', jobData);
    console.log('updateJob response:', response.data);
    return response; // Return full response, not just response.data
  } catch (error) {
    console.error('updateJob error:', error.response?.data || error.message);
    throw error.response?.data || error;
  }
};
export default api;



// Working code with admin and with seeker