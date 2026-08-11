import { auth } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

// Placeholder functions for authentication
export const login = async (email: string, pass: string) => {
  return signInWithEmailAndPassword(auth, email, pass);
};

export const register = async (email: string, pass: string) => {
  return createUserWithEmailAndPassword(auth, email, pass);
};

export const logout = async () => {
  return signOut(auth);
};

export const subscribeToAuthChanges = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, callback);
};
