import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { loadGCPConfig } from './gcpConfig';

// Initialize Firebase Admin SDK
let app: any;
let firestore: FirebaseFirestore.Firestore;

export function initializeFirebase() {
  if (app) {
    return { app, firestore };
  }

  try {
    const gcpConfig = loadGCPConfig();
    
    // Initialize Firebase Admin with credentials
    if (gcpConfig.keyFilename) {
      // Use service account key file
      app = initializeApp({
        credential: cert(gcpConfig.keyFilename),
        projectId: gcpConfig.projectId
      });
    } else if (gcpConfig.credentials) {
      // Use credentials from environment variables
      const serviceAccount: ServiceAccount = {
        projectId: gcpConfig.projectId || process.env.GOOGLE_CLOUD_PROJECT_ID || '',
        clientEmail: gcpConfig.credentials.client_email,
        privateKey: gcpConfig.credentials.private_key
      };

      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.projectId
      });
    } else {
      // Use Application Default Credentials (for cloud environments)
      app = initializeApp({
        projectId: gcpConfig.projectId || process.env.GOOGLE_CLOUD_PROJECT_ID
      });
    }

    // Initialize Firestore
    firestore = getFirestore(app);
    
    // Enable offline persistence for better reliability
    firestore.settings({
      ignoreUndefinedProperties: true
    });

    console.log('Firebase initialized successfully');
    return { app, firestore };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw new Error('Failed to initialize Firebase');
  }
}

// Initialize Firebase on module load
const { app: firebaseApp, firestore: firestoreInstance } = initializeFirebase();

export { firebaseApp as app, firestoreInstance as firestore };

export default firestore;