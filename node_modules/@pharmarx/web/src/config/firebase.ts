import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'pharmarx-b9435.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'pharmarx-b9435',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'pharmarx-b9435.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'demo-app-id'
};

const isDevelopment = import.meta.env.DEV ||
                     import.meta.env.MODE === 'development' ||
                     (typeof window !== 'undefined' && window.location.hostname === 'localhost');

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Connect to emulators in development
if (isDevelopment) {
  try {
    // Connect to Auth emulator
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    console.log('🔐 Connected to Firebase Auth Emulator');
    
    // Connect to Firestore emulator
    connectFirestoreEmulator(db, '127.0.0.1', 8081);
    console.log('🗄️ Connected to Firebase Firestore Emulator');
  } catch (error) {
    console.warn('⚠️ Emulator connection failed, using production Firebase:', error);
  }
}

// Configuration validation in development
if (isDevelopment) {
  console.log('🔧 Firebase Configuration:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    isDevelopment,
    environment: import.meta.env.MODE
  });
}

// Export app and configuration
export { app, firebaseConfig, isDevelopment };
export default app; 