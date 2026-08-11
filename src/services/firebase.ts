import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBG_uOMWh17g3Oj7YLuC1BSA8l8G_0iY10",
  authDomain: "bible-song-pro-web.firebaseapp.com",
  projectId: "bible-song-pro-web",
  storageBucket: "bible-song-pro-web.firebasestorage.app",
  messagingSenderId: "916004474351",
  appId: "1:916004474351:web:cedbe68e3a1589b2e4ba1a",
  measurementId: "G-72JQKX1SZL"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
