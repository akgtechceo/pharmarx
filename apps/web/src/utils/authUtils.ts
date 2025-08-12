import { useAuthStore } from '../stores/authStore';

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
  const authState = useAuthStore.getState();
  
  if (!authState.isAuthenticated || !authState.user) {
    return null;
  }
  
  let token = authState.token;
  
  // If no token or token is expired, try to refresh
  if (!token || (token && isTokenExpired(token))) {
    try {
      await authState.refreshToken();
      token = useAuthStore.getState().token;
    } catch (error) {
      console.error('Failed to refresh token:', error);
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
