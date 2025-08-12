import { Router, Request, Response } from 'express';
import { CreateProfileRequest, UpdateProfileRequest } from '@pharmarx/shared-types';
import profileService from './profiles';
import { verifyAuth } from '../middleware/auth';

const router = Router();

/**
 * POST /profiles - Create a new patient profile for caregiver
 */
router.post('/', verifyAuth, async (req: Request, res: Response) => {
  try {
    const profileData: CreateProfileRequest = req.body;
    const managedByUid = req.user?.uid;

    if (!managedByUid) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const profile = await profileService.createProfile(managedByUid, profileData);
    res.status(201).json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error in POST /profiles:', error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      error: error instanceof Error ? error.message : 'Failed to create profile'
    });
  }
});

/**
 * GET /profiles - Get all profiles managed by authenticated caregiver
 */
router.get('/', verifyAuth, async (req: Request, res: Response) => {
  try {
    const managedByUid = req.user?.uid;

    if (!managedByUid) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const profiles = await profileService.getProfilesByCaregiver(managedByUid);
    res.json({
      success: true,
      data: {
        profiles,
        activeProfileId: undefined
      }
    });
  } catch (error) {
    console.error('Error in GET /profiles:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to get profiles';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorMessage = 'Profiles not found';
      } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        statusCode = 403;
        errorMessage = 'Access denied';
      } else {
        errorMessage = error.message;
      }
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * GET /profiles/:profileId - Get specific profile by ID
 */
router.get('/:profileId', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const managedByUid = req.user?.uid;

    if (!managedByUid) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const profile = await profileService.getProfileById(profileId);
    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found'
      });
    }

    // Check if profile belongs to the authenticated caregiver
    if (profile.managedByUid !== managedByUid) {
      return res.status(403).json({
        error: 'Unauthorized: Profile does not belong to this caregiver'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error in GET /profiles/:profileId:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get profile'
    });
  }
});

/**
 * PUT /profiles/:profileId - Update profile details
 */
router.put('/:profileId', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const updateData: UpdateProfileRequest = req.body;
    const managedByUid = req.user?.uid;

    if (!managedByUid) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const profile = await profileService.updateProfile(profileId, updateData);
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error in PUT /profiles/:profileId:', error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      error: error instanceof Error ? error.message : 'Failed to update profile'
    });
  }
});

/**
 * DELETE /profiles/:profileId - Remove profile
 */
router.delete('/:profileId', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const managedByUid = req.user?.uid;

    if (!managedByUid) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    await profileService.deleteProfile(profileId);
    res.json({
      success: true,
      message: 'Profile deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /profiles/:profileId:', error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      error: error instanceof Error ? error.message : 'Failed to delete profile'
    });
  }
});



export default router;