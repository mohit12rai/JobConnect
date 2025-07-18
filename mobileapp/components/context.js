// JobsContext.js
import React, { createContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ 1️⃣ Create context
export const JobsContext = createContext();


export const JobsProvider = ({ children }) => {
  const [userState, setUserState,] = useState([]);
const [globalState, setGlobalHandle] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          setUserState(JSON.parse(storedUser));
        }
        // console.log("userState=",storedUser)
      } catch (e) {
        console.error('Error loading user from storage', e);
      }
    };

    loadUser();
  }, []);
  return (
    <JobsContext.Provider value={{ userState, setUserState,globalState,setGlobalHandle,isAuthenticated, setIsAuthenticated }}>
      {children}
    </JobsContext.Provider>
  );
};
