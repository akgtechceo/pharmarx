import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RegisterForm, { RegisterFormData } from '../../components/RegisterForm';
import { registrationService } from '../../services/registrationService';

export const RegisterPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  const handleRegister = async (formData: RegisterFormData) => {
    setIsLoading(true);
    setError('');
    
    try {
      await registrationService.register(formData);
      
      // Registration successful - redirect to dashboard or success page
      navigate('/dashboard', { 
        replace: true,
        state: { message: 'Registration successful! Welcome to PharmaRx.' }
      });
    } catch (error) {
      console.error('Registration failed:', error);
      setError(
        error instanceof Error 
          ? error.message 
          : 'Registration failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <h1 className="text-3xl font-bold text-blue-600">PharmaRx</h1>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Join PharmaRx
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link 
            to="/login" 
            className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            Sign in here
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <RegisterForm
          onSubmit={handleRegister}
          isLoading={isLoading}
          error={error}
        />
        
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            By creating an account, you agree to our{' '}
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

export default RegisterPage; 