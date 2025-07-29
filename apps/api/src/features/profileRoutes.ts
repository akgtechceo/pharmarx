import { Router, Request, Response } from 'express';
import { CreateProfileRequest, UpdateProfileRequest } from '@pharmarx/shared-types';
import profileService from './profiles';

const router = Router();

/**
 * POST /profiles - Create a new patient profile for caregiver
 */
router.post('/', async (req: Request, res: Response) => {
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
router.get('/', async (req: Request, res: Response) => {
  try {
    const managedByUid = req.user?.uid;

    if (!managedByUid) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const profiles = await profileService.getProfilesByCaregiver(managedByUid);
    res.json({
      success: true,
      data: {
        profiles,
        activeProfileId: req.session?.activeProfileId
      }
    });
  } catch (error) {
    console.error('Error in GET /profiles:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get profiles'
    });
  }
});

/**
 * GET /profiles/:profileId - Get specific profile by ID
 */
router.get('/:profileId', async (req: Request, res: Response) => {
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
router.put('/:profileId', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const updateData: UpdateProfileRequest = req.body;
    const managedByUid = req.user?.uid;

    if (!managedByUid) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const profile = await profileService.updateProfile(profileId, managedByUid, updateData);
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
router.delete('/:profileId', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const managedByUid = req.user?.uid;

    if (!managedByUid) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const deleted = await profileService.deleteProfile(profileId, managedByUid);
    if (!deleted) {
      return res.status(404).json({
        error: 'Profile not found'
      });
    }

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

/**
 * GET /profiles/:profileId/exists - Check if profile exists and belongs to caregiver
 */
router.get('/:profileId/exists', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const managedByUid = req.user?.uid;

    if (!managedByUid) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const exists = await profileService.profileExists(profileId, managedByUid);
    res.json({
      success: true,
      data: {
        exists
      }
    });
  } catch (error) {
    console.error('Error in GET /profiles/:profileId/exists:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to check profile existence'
    });
  }
});

export default router;