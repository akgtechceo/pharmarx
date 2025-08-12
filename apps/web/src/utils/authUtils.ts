import { useAuthStore } from '../stores/authStore';
import { auth } from '../config/firebase';

/**
 * Check if a token is expired or about to expire
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    // Decode JWT token to check expiration
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Consider token expired if it expires within the next 5 minutes
    return payload.exp < (currentTime + 300);
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true; // Assume expired if we can't decode
  }
};

/**
 * Get a valid authentication token, refreshing if necessary
 */
export const getValidAuthToken = async (): Promise<string | null> => {
  // First check if Firebase has a current user
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log('🔐 No Firebase current user found');
    return null;
  }

  const authState = useAuthStore.getState();
  
  // Check if our auth store thinks we're authenticated
  if (!authState.isAuthenticated || !authState.user) {
    console.log('🔐 Auth store shows user not authenticated');
    return null;
  }
  
  let token = authState.token;
  
  // If no token or token is expired, try to refresh
  if (!token || (token && isTokenExpired(token))) {
    console.log('🔄 Token missing or expired, attempting to refresh...');
    try {
      // Try to get a fresh token directly from Firebase first
      const freshToken = await currentUser.getIdToken(true);
      if (freshToken) {
        console.log('✅ Got fresh token from Firebase');
        // Update the auth store with the new token
        useAuthStore.getState().updateAuthState(authState.user, freshToken);
        return freshToken;
      }
      
      // Fallback to auth store refresh if Firebase token fails
      await authState.refreshToken();
      token = useAuthStore.getState().token;
      console.log('✅ Token refreshed via auth store');
    } catch (error) {
      console.error('❌ Failed to refresh token:', error);
      
      // If refresh fails, clear the auth state
      if (error instanceof Error && (
        error.message.includes('user-not-found') ||
        error.message.includes('user-disabled') ||
        error.message.includes('invalid-credential') ||
        error.message.includes('auth/user-token-expired')
      )) {
        console.log('🔐 Critical auth error, clearing auth state');
        await authState.logout();
      }
      return null;
    }
  }
  
  return token;
};

/**
 * Handle authentication errors and redirect to login if necessary
 */
export const handleAuthError = (error: Error): void => {
  if (error.message.includes('Invalid or expired token') ||
      error.message.includes('Authentication token expired') ||
      error.message.includes('user-not-found') ||
      error.message.includes('user-disabled')) {
    
    console.log('🔐 Authentication error detected, logging out user');
    useAuthStore.getState().logout();
    
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
};
