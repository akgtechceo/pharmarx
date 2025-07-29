import { Router, Request, Response } from 'express';
import { UserRole, CreateUserInput } from '@pharmarx/shared-types';
import userService from './users';
import admin from 'firebase-admin';

const router = Router();

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  // In development, use the emulator
  if (process.env.NODE_ENV === 'development') {
    admin.initializeApp({
      projectId: 'pharmarx-demo',
      credential: admin.credential.applicationDefault()
    });
  } else {
    // In production, use service account
    admin.initializeApp();
  }
}

/**
 * Middleware to verify Firebase ID token
 */
const verifyFirebaseToken = async (req: Request, res: Response, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized - Missing or invalid authorization header'
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Add the decoded token to the request for use in route handlers
    (req as any).user = decodedToken;
    next();
  } catch (error) {
    console.error('Firebase token verification error:', error);
    res.status(401).json({
      error: 'Unauthorized - Invalid token'
    });
  }
};

/**
 * POST /auth/register - Register a new user
 * Creates a user record in Firestore after Firebase Auth account creation
 */
router.post('/register', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const { uid, role, email, phoneNumber, displayName }: 
      { uid: string } & CreateUserInput = req.body;

    // Validate required fields
    if (!uid) {
      return res.status(400).json({
        error: 'UID is required'
      });
    }

    if (!role || !Object.values(UserRole).includes(role)) {
      return res.status(400).json({
        error: 'Valid role is required (patient, caregiver, doctor, pharmacist)'
      });
    }

    if (!displayName?.trim()) {
      return res.status(400).json({
        error: 'Display name is required'
      });
    }

    // Validate that either email or phone number is provided
    if (!email?.trim() && !phoneNumber?.trim()) {
      return res.status(400).json({
        error: 'Either email or phone number must be provided'
      });
    }

    // Verify that the UID from the token matches the UID in the request
    const tokenUser = (req as any).user;
    if (tokenUser.uid !== uid) {
      return res.status(403).json({
        error: 'Token UID does not match request UID'
      });
    }

    // Check if user already exists
    const existingUser = await userService.getUserById(uid);
    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists'
      });
    }

    // Create user record
    const userData: CreateUserInput = {
      role,
      email: email?.trim() || undefined,
      phoneNumber: phoneNumber?.trim() || undefined,
      displayName: displayName.trim()
    };

    const user = await userService.createUser(uid, userData);

    // Set custom claims for role-based access control
    try {
      await admin.auth().setCustomUserClaims(uid, { role });
    } catch (error) {
      console.warn('Failed to set custom claims:', error);
      // Don't fail the registration if custom claims fail
    }

    res.status(201).json({
      success: true,
      data: user,
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('Error in POST /auth/register:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Validation failed')) {
        return res.status(400).json({
          error: error.message
        });
      }
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          error: 'User already exists'
        });
      }
    }

    res.status(500).json({
      error: 'Registration failed. Please try again.'
    });
  }
});

/**
 * GET /auth/me - Get current user profile
 */
router.get('/me', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const tokenUser = (req as any).user;
    const uid = tokenUser.uid;

    const user = await userService.getUserById(uid);
    if (!user) {
      return res.status(404).json({
        error: 'User profile not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error in GET /auth/me:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get user profile'
    });
  }
});

/**
 * POST /auth/login - Login user (validate token and return user profile)
 * This endpoint validates that the user is authenticated and returns their profile
 */
router.post('/login', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const tokenUser = (req as any).user;
    const uid = tokenUser.uid;

    // Get user profile from database
    const user = await userService.getUserById(uid);
    if (!user) {
      return res.status(404).json({
        error: 'User profile not found. Please contact support.'
      });
    }

    res.json({
      success: true,
      data: user,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Error in POST /auth/login:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Login failed. Please try again.'
    });
  }
});

/**
 * PUT /auth/profile - Update user profile
 */
router.put('/profile', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const tokenUser = (req as any).user;
    const uid = tokenUser.uid;
    const updateData: Partial<CreateUserInput> = req.body;

    // Remove uid from update data if present (it shouldn't be updated)
    delete (updateData as any).uid;

    const user = await userService.updateUser(uid, updateData);
    
    res.json({
      success: true,
      data: user,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error in PUT /auth/profile:', error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      error: error instanceof Error ? error.message : 'Failed to update profile'
    });
  }
});

export default router; 