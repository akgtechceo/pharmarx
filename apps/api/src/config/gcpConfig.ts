import { resolve } from 'path';

export interface GCPConfig {
  projectId?: string;
  keyFilename?: string;
  credentials?: {
    client_email: string;
    private_key: string;
  };
}

export interface OCRConfig {
  maxRetries: number;
  retryDelay: number;
  gcpConfig: GCPConfig;
}

/**
 * Load Google Cloud Platform configuration
 */
export function loadGCPConfig(): GCPConfig {
  const config: GCPConfig = {};

  // Option 1: Use service account key file (for local development)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    config.keyFilename = resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    console.log('Using Google Cloud credentials from file:', config.keyFilename);
  }
  
  // Option 2: Use environment variables (for cloud deployment)
  else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    config.credentials = {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };
    console.log('Using Google Cloud credentials from environment variables');
  }
  
  // Option 3: Default to Application Default Credentials (ADC)
  else {
    console.log('Using Google Cloud Application Default Credentials');
  }

  // Set project ID if provided
  if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
    config.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  }

  return config;
}

/**
 * Load OCR service configuration
 */
export function loadOCRConfig(): OCRConfig {
  return {
    maxRetries: parseInt(process.env.GCV_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.GCV_RETRY_DELAY || '1000', 10),
    gcpConfig: loadGCPConfig()
  };
}

/**
 * Validate OCR configuration
 */
export function validateOCRConfig(config: OCRConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.maxRetries < 1 || config.maxRetries > 10) {
    errors.push('maxRetries must be between 1 and 10');
  }

  if (config.retryDelay < 100 || config.retryDelay > 10000) {
    errors.push('retryDelay must be between 100ms and 10000ms');
  }

  // Check if we have some form of authentication configured
  const hasKeyFile = config.gcpConfig.keyFilename;
  const hasCredentials = config.gcpConfig.credentials?.client_email && config.gcpConfig.credentials?.private_key;
  
  if (!hasKeyFile && !hasCredentials) {
    console.warn('No explicit Google Cloud credentials found. Falling back to Application Default Credentials (ADC)');
    // This is not an error as ADC might be available in cloud environments
  }

  return {
    isValid: errors.length === 0,
    errors
  };
} 