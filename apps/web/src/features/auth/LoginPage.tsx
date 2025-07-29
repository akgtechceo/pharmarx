import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LoginForm, { LoginFormData } from '../../components/LoginForm';
import { authenticationService } from '../../services/authenticationService';
import { UserRole } from '@pharmarx/shared-types';

export const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  // Note: Future enhancement could use location state for redirects after login

  const handleLogin = async (formData: LoginFormData) => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await authenticationService.login(formData);
      
      // Login successful - redirect based on user role
      const redirectPath = getPortalPathForRole(result.userProfile.role);
      navigate(redirectPath, { 
        replace: true,
        state: { message: 'Welcome back to PharmaRx!' }
      });
    } catch (error) {
      console.error('Login failed:', error);
      setError(
        error instanceof Error 
          ? error.message 
          : 'Login failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get the appropriate portal path based on user role
   */
  const getPortalPathForRole = (role: UserRole): string => {
    switch (role) {
      case UserRole.Patient:
        return '/portal/patient';
      case UserRole.Caregiver:
        return '/portal/caregiver';
      case UserRole.Doctor:
        return '/portal/doctor';
      case UserRole.Pharmacist:
        return '/portal/pharmacist';
      default:
        return '/dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <h1 className="text-3xl font-bold text-blue-600">PharmaRx</h1>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Welcome Back
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
                      Don&apos;t have an account?{' '}
          <Link 
            to="/register" 
            className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            Join PharmaRx
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <LoginForm
          onSubmit={handleLogin}
          isLoading={isLoading}
          error={error}
        />
        
        <div className="mt-6 text-center">
          <Link 
            to="/forgot-password" 
            className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
          >
            Forgot your password?
          </Link>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our{' '}
            <Link to="/terms" className="text-blue-600 hover:text-blue-500">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-blue-600 hover:text-blue-500">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 