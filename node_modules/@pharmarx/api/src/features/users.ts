import { User, UserRole, CreateUserInput, validateUser, validateCreateUserInput } from '@pharmarx/shared-types';
import databaseService from './database';
import admin from 'firebase-admin';

export class UserService {
  private static instance: UserService;
  
  private constructor() {}
  
  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }
  
  /**
   * Create a new user in Firestore
   */
  async createUser(uid: string, userData: CreateUserInput): Promise<User> {
    try {
      // Validate input data
      const validation = validateCreateUserInput(userData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const db = databaseService.getDb();
      const now = new Date();
      
      const user: User = {
        uid,
        role: userData.role,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        displayName: userData.displayName,
        createdAt: now
      };

      // Validate the complete user object
      const userValidation = validateUser(user);
      if (!userValidation.isValid) {
        throw new Error(`User validation failed: ${userValidation.errors.join(', ')}`);
      }

      // Store user in Firestore
      await db.collection('users').doc(uid).set({
        ...user,
        createdAt: admin.firestore.Timestamp.fromDate(now)
      });

      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user by UID
   */
  async getUserById(uid: string): Promise<User | null> {
    try {
      if (!uid || typeof uid !== 'string') {
        throw new Error('Valid UID is required');
      }

      const db = databaseService.getDb();
      const userDoc = await db.collection('users').doc(uid).get();

      if (!userDoc.exists) {
        return null;
      }

      const userData = userDoc.data();
      if (!userData) {
        return null;
      }

      // Convert Firestore timestamp back to Date
      const user: User = {
        ...userData as Omit<User, 'createdAt'>,
        createdAt: userData.createdAt.toDate()
      };

      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      throw new Error(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user data
   */
  async updateUser(uid: string, updateData: Partial<CreateUserInput>): Promise<User> {
    try {
      if (!uid || typeof uid !== 'string') {
        throw new Error('Valid UID is required');
      }

      const db = databaseService.getDb();
      
      // First get the existing user
      const existingUser = await this.getUserById(uid);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // Merge update data with existing user data
      const updatedUserData: CreateUserInput = {
        role: updateData.role ?? existingUser.role,
        email: updateData.email ?? existingUser.email,
        phoneNumber: updateData.phoneNumber ?? existingUser.phoneNumber,
        displayName: updateData.displayName ?? existingUser.displayName
      };

      // Validate the updated data
      const validation = validateCreateUserInput(updatedUserData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const updatedUser: User = {
        uid,
        ...updatedUserData,
        createdAt: existingUser.createdAt // Preserve original creation date
      };

      // Validate the complete updated user object
      const userValidation = validateUser(updatedUser);
      if (!userValidation.isValid) {
        throw new Error(`User validation failed: ${userValidation.errors.join(', ')}`);
      }

      // Update in Firestore (exclude createdAt from update to prevent overwriting)
      await db.collection('users').doc(uid).update({
        role: updatedUser.role,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        displayName: updatedUser.displayName
      });

      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete user by UID
   */
  async deleteUser(uid: string): Promise<boolean> {
    try {
      if (!uid || typeof uid !== 'string') {
        throw new Error('Valid UID is required');
      }

      const db = databaseService.getDb();
      
      // Check if user exists first
      const userExists = await this.getUserById(uid);
      if (!userExists) {
        return false; // User doesn't exist
      }

      await db.collection('users').doc(uid).delete();
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: UserRole): Promise<User[]> {
    try {
      if (!Object.values(UserRole).includes(role)) {
        throw new Error('Invalid user role');
      }

      const db = databaseService.getDb();
      const snapshot = await db.collection('users').where('role', '==', role).get();

      const users: User[] = [];
      snapshot.forEach(doc => {
        const userData = doc.data();
        if (userData) {
          users.push({
            ...userData as Omit<User, 'createdAt'>,
            createdAt: userData.createdAt.toDate()
          });
        }
      });

      return users;
    } catch (error) {
      console.error('Error getting users by role:', error);
      throw new Error(`Failed to get users by role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if user exists
   */
  async userExists(uid: string): Promise<boolean> {
    try {
      const user = await this.getUserById(uid);
      return user !== null;
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  }
}

// Export singleton instance
export const userService = UserService.getInstance();
export default userService; 