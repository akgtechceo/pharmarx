import admin from 'firebase-admin';
import { Firestore } from 'firebase-admin/firestore';

class DatabaseService {
  private static instance: DatabaseService;
  private db?: Firestore;
  private initialized: boolean = false;

  private constructor() {
    // Don't initialize immediately in constructor - lazy initialization
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private initializeFirebase(): void {
    if (this.initialized) {
      return;
    }

    // Environment detection
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isDevelopment = ['development', 'dev'].includes(nodeEnv);
    const isTest = ['test', 'testing'].includes(nodeEnv);
    const isProduction = nodeEnv === 'production';

    // Firebase project configuration
    const projectId = process.env.FIREBASE_PROJECT_ID || 
                     (isDevelopment ? 'pharmarx-dev' : 'pharmarx-dev');
    
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    // Check if Firebase app is already initialized
    if (admin.apps.length === 0) {
      try {
        if (isDevelopment || isTest) {
          // Development/Test: Use emulator or minimal configuration
          console.log(`🔧 Initializing Firebase Admin for ${nodeEnv} environment`);
          console.log(`📋 Project ID: ${projectId}`);
          
          if (serviceAccountKey) {
            // Use service account if provided (for CI/CD in dev)
            const serviceAccount = JSON.parse(serviceAccountKey);
            admin.initializeApp({
              credential: admin.credential.cert(serviceAccount),
              projectId: projectId
            });
            console.log('🔐 Using service account credentials for development');
          } else {
            // Use minimal configuration for emulator
            admin.initializeApp({
              projectId: projectId
            });
            console.log('🧪 Using minimal configuration for Firebase emulators');
          }
        } else if (isProduction) {
          // Production: Use service account or application default credentials
          console.log('🚀 Initializing Firebase Admin for production');
          
          if (serviceAccountKey) {
            const serviceAccount = JSON.parse(serviceAccountKey);
            admin.initializeApp({
              credential: admin.credential.cert(serviceAccount),
              projectId: projectId
            });
            console.log('🔐 Using service account credentials');
          } else {
            // Fall back to application default credentials (for GCP environments)
            admin.initializeApp({
              credential: admin.credential.applicationDefault(),
              projectId: projectId
            });
            console.log('🔐 Using application default credentials');
          }
        } else {
          // Staging or other environments
          console.log(`🔧 Initializing Firebase Admin for ${nodeEnv} environment`);
          
          if (serviceAccountKey) {
            const serviceAccount = JSON.parse(serviceAccountKey);
            admin.initializeApp({
              credential: admin.credential.cert(serviceAccount),
              projectId: projectId
            });
            console.log('🔐 Using service account credentials');
          } else {
            admin.initializeApp({
              credential: admin.credential.applicationDefault(),
              projectId: projectId
            });
            console.log('🔐 Using application default credentials');
          }
        }
        
        console.log(`✅ Firebase Admin initialized successfully`);
      } catch (error) {
        console.error('❌ Failed to initialize Firebase Admin:', error);
        throw new Error(`Firebase initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    this.initialized = true;
  }

  public getDb(): Firestore {
    if (!this.db) {
      this.initializeFirebase();
      this.db = admin.firestore();
      
      // Configure Firestore settings
      const nodeEnv = process.env.NODE_ENV || 'development';
      const isDevelopment = ['development', 'dev'].includes(nodeEnv);
      const isTest = ['test', 'testing'].includes(nodeEnv);
      
      if (isDevelopment || isTest) {
        // Use emulator settings if configured
        const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
        if (firestoreEmulatorHost) {
          console.log(`🧪 Using Firestore emulator: ${firestoreEmulatorHost}`);
        }
      }
    }
    return this.db;
  }

  public async healthCheck(): Promise<{ status: string; projectId: string; timestamp: Date }> {
    try {
      const db = this.getDb();
      const testDoc = db.collection('_health').doc('check');
      const timestamp = new Date();
      
      await testDoc.set({
        status: 'healthy',
        timestamp: timestamp,
        environment: process.env.NODE_ENV || 'development'
      });

      const result = await testDoc.get();
      
      return {
        status: result.exists ? 'healthy' : 'unhealthy',
        projectId: admin.app().options.projectId || 'unknown',
        timestamp
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        projectId: 'unknown',
        timestamp: new Date()
      };
    }
  }

  public async close(): Promise<void> {
    if (this.initialized && admin.apps.length > 0) {
      await Promise.all(admin.apps.map(app => app?.delete()));
      this.initialized = false;
      this.db = undefined;
      console.log('🔌 Firebase Admin connection closed');
    }
  }
}

// Export singleton instance
const databaseService = DatabaseService.getInstance();
export default databaseService; 