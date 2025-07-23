import { Router, Request, Response } from 'express';
import { UserRole, CreateUserInput } from '@pharmarx/shared-types';
import userService from './users';

const router = Router();

/**
 * POST /users - Create a new user
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { uid, ...userData }: { uid: string } & CreateUserInput = req.body;

    if (!uid) {
      return res.status(400).json({
        error: 'UID is required'
      });
    }

    // Check if user already exists
    const existingUser = await userService.getUserById(uid);
    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists'
      });
    }

    const user = await userService.createUser(uid, userData);
    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error in POST /users:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create user'
    });
  }
});

/**
 * GET /users/:uid - Get user by UID
 */
router.get('/:uid', async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;

    const user = await userService.getUserById(uid);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error in GET /users/:uid:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get user'
    });
  }
});

/**
 * PUT /users/:uid - Update user
 */
router.put('/:uid', async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const updateData: Partial<CreateUserInput> = req.body;

    const user = await userService.updateUser(uid, updateData);
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error in PUT /users/:uid:', error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      error: error instanceof Error ? error.message : 'Failed to update user'
    });
  }
});

/**
 * DELETE /users/:uid - Delete user
 */
router.delete('/:uid', async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;

    const deleted = await userService.deleteUser(uid);
    if (!deleted) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /users/:uid:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete user'
    });
  }
});

/**
 * GET /users/role/:role - Get users by role
 */
router.get('/role/:role', async (req: Request, res: Response) => {
  try {
    const { role } = req.params;

    // Validate role
    if (!Object.values(UserRole).includes(role as UserRole)) {
      return res.status(400).json({
        error: 'Invalid user role'
      });
    }

    const users = await userService.getUsersByRole(role as UserRole);
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error in GET /users/role/:role:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get users by role'
    });
  }
});

/**
 * GET /users/:uid/exists - Check if user exists
 */
router.get('/:uid/exists', async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;

    const exists = await userService.userExists(uid);
    res.json({
      success: true,
      data: {
        exists
      }
    });
  } catch (error) {
    console.error('Error in GET /users/:uid/exists:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to check user existence'
    });
  }
});

export default router; 