import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import RegisterPage from './features/auth/RegisterPage';
import LoginPage from './features/auth/LoginPage';
import PatientPortal from './components/portals/PatientPortal';
import CaregiverPortal from './components/portals/CaregiverPortal';
import MapDemo from './components/MapDemo';
import SimpleMapTest from './components/SimpleMapTest';
import { AuthenticationService } from './services/authenticationService';
import { logGoogleMapsStatus } from './utils/googleMapsValidator';
import { useAuthStore } from './stores/authStore';
// TODO: Create dedicated DoctorPortal and PharmacistPortal components
// For now, use the placeholder components defined below

// Simple error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-800 mb-4">Something went wrong</h1>
            <p className="text-red-600 mb-4">{this.state.error?.message}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Authentication initialization component
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { initializeAuth, isLoading, cleanup, isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    initializeAuth();
    
    // Cleanup function to remove Firebase auth listener
    return () => {
      cleanup();
    };
  }, [initializeAuth, cleanup]);

  // Debug authentication status
  useEffect(() => {
    console.log('🔐 AuthInitializer - Auth state changed:', {
      isAuthenticated,
      hasUser: !!user,
      userId: user?.uid,
      isLoading,
      currentPath: location.pathname
    });
    
    // Only redirect to login if we're not already on login/register pages and not authenticated
    if (!isLoading && !isAuthenticated && 
        !location.pathname.includes('/login') && 
        !location.pathname.includes('/register')) {
      console.log('🔐 User not authenticated, redirecting to login');
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, user, isLoading, navigate, location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing application...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and not on auth pages, show loading while redirecting
  if (!isAuthenticated && 
      !location.pathname.includes('/login') && 
      !location.pathname.includes('/register')) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  useEffect(() => {
    // Log Google Maps setup status on app startup
    logGoogleMapsStatus();
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <AuthInitializer>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/portal/patient" element={<PatientPortal />} />
            <Route path="/portal/caregiver" element={<CaregiverPortal />} />
            <Route path="/portal/doctor" element={<DoctorPortalPlaceholder />} />
            <Route path="/portal/pharmacist" element={<PharmacistPortalPlaceholder />} />
            <Route path="/map-demo" element={<MapDemo />} />
            <Route path="/simple-map-test" element={<SimpleMapTest />} />
          </Routes>
        </AuthInitializer>
      </Router>
    </ErrorBoundary>
  );
}

// Home page component
function HomePage() {
  const location = useLocation();
  const [showSuccessMessage, setShowSuccessMessage] = React.useState(false);

  React.useEffect(() => {
    if (location.state?.message) {
      setShowSuccessMessage(true);
      // Clear the message from location state
      window.history.replaceState({}, document.title);
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
    }
  }, [location.state]);

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">PharmaRx</h1>
            </div>
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <p>Welcome to PharmaRx - Prescription Management System</p>
                <p className="text-green-600 font-semibold">✅ Application is fully functional!</p>
                
                {showSuccessMessage && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-green-800">
                          {location.state?.message || 'Registration successful!'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2 mt-4">
                  <Link 
                    to="/register" 
                    className="block bg-blue-600 text-white text-center py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Create Account
                  </Link>
                  <Link 
                    to="/login" 
                    className="block border border-blue-600 text-blue-600 text-center py-2 px-4 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link 
                    to="/map-demo" 
                    className="block bg-green-600 text-white text-center py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                  >
                    View Interactive Map Demo
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Placeholder components for now - DEPRECATED: Use imported PatientPortal instead
function PatientPortalPlaceholder() {
  const [prescriptions] = React.useState([
    { id: 1, medication: 'Aspirin', dosage: '100mg', frequency: 'Once daily', status: 'Active', refills: 2, nextRefill: '2024-01-15' },
    { id: 2, medication: 'Vitamin D', dosage: '1000 IU', frequency: 'Once daily', status: 'Active', refills: 1, nextRefill: '2024-01-20' },
    { id: 3, medication: 'Metformin', dosage: '500mg', frequency: 'Twice daily', status: 'Active', refills: 0, nextRefill: '2024-01-10' }
  ]);

  const [appointments] = React.useState([
    { id: 1, doctor: 'Dr. Sarah Johnson', date: '2024-01-15', time: '10:00 AM', type: 'Check-up', status: 'Confirmed' },
    { id: 2, doctor: 'Dr. Michael Chen', date: '2024-01-22', time: '2:30 PM', type: 'Follow-up', status: 'Pending' }
  ]);

  const [notifications, setNotifications] = React.useState([
    { id: 1, type: 'refill', message: 'Your Aspirin prescription is ready for refill', time: '2 hours ago', read: false },
    { id: 2, type: 'appointment', message: 'Appointment reminder: Dr. Johnson tomorrow at 10 AM', time: '1 day ago', read: false },
    { id: 3, type: 'test', message: 'Your blood test results are available', time: '3 days ago', read: true }
  ]);

  const [activeTab, setActiveTab] = React.useState('dashboard');

  const handleLogout = () => {
    // TODO: Implement logout functionality
    window.location.href = '/';
  };

  const handleRefillRequest = (prescriptionId: number) => {
    // TODO: Implement refill request
    alert('Refill request submitted for prescription #' + prescriptionId);
  };

  const markNotificationRead = (notificationId: number) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  // State for tracking modal
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [selectedPrescription] = useState<any>(null);

  const handleTrackPrescription = () => {
    // Get active prescriptions for tracking
    const activePrescriptions = prescriptions.filter(p => p.status === 'Active' || p.status === 'In Transit');
    
    if (activePrescriptions.length === 0) {
      alert('No active prescriptions available for tracking.');
      return;
    }
    
    // If only one prescription, track it directly
    if (activePrescriptions.length === 1) {
      trackPrescriptionOnMap(activePrescriptions[0]);
    } else {
      // Show modal to select prescription
      setShowTrackingModal(true);
    }
  };

  const trackPrescriptionOnMap = (prescription: any) => {
    // Sample pharmacy locations (in a real app, this would come from the prescription data)
    const pharmacyLocations = {
      'RX001': { name: 'CVS Pharmacy Downtown', lat: 40.7589, lng: -73.9851, address: '123 Main St, New York, NY' },
      'RX002': { name: 'Walgreens Central', lat: 40.7505, lng: -73.9934, address: '456 Broadway, New York, NY' },
      'RX003': { name: 'Rite Aid Express', lat: 40.7614, lng: -73.9776, address: '789 Park Ave, New York, NY' }
    };

    const pharmacy = pharmacyLocations[prescription.id as keyof typeof pharmacyLocations] || pharmacyLocations['RX001'];
    
    // Create Google Maps URL with directions
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${pharmacy.lat},${pharmacy.lng}&destination_place_id=${encodeURIComponent(pharmacy.name)}`;
    
    // Open Google Maps in a new window
    window.open(mapsUrl, '_blank');
    
    // Show confirmation
    alert(`Opening Google Maps to track your prescription "${prescription.medication}" at ${pharmacy.name}\n\nAddress: ${pharmacy.address}\n\nEstimated Status: ${prescription.status}`);
    
    // Close modal if it was open
    setShowTrackingModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Patient Portal</h1>
              <p className="text-gray-600">Manage your prescriptions and health records</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button className="relative p-2 text-gray-600 hover:text-gray-900">
                  <span className="text-xl">🔔</span>
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>
              </div>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                Add Prescription
              </button>
              <button onClick={handleLogout} className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'prescriptions', label: 'Prescriptions', icon: '💊' },
              { id: 'appointments', label: 'Appointments', icon: '📅' },
              { id: 'records', label: 'Health Records', icon: '📋' },
              { id: 'notifications', label: 'Notifications', icon: '🔔' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <>
              {/* Dashboard Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold">📋</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Active Prescriptions</dt>
                          <dd className="text-lg font-medium text-gray-900">{prescriptions.filter(p => p.status === 'Active').length}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold">🏥</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Upcoming Appointments</dt>
                          <dd className="text-lg font-medium text-gray-900">{appointments.filter(a => a.status === 'Confirmed').length}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold">🔔</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Unread Notifications</dt>
                          <dd className="text-lg font-medium text-gray-900">{notifications.filter(n => !n.read).length}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold">⚠️</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Refills Needed</dt>
                          <dd className="text-lg font-medium text-gray-900">{prescriptions.filter(p => p.refills <= 1).length}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white shadow sm:rounded-lg mb-8">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Quick Actions</h3>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <button className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300">
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-700 ring-4 ring-white">
                          📝
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium">
                          <span className="absolute inset-0" aria-hidden="true" />
                          Request Refill
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">Request prescription refills</p>
                      </div>
                    </button>

                    <button className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300">
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-700 ring-4 ring-white">
                          📅
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium">
                          <span className="absolute inset-0" aria-hidden="true" />
                          Schedule Appointment
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">Book doctor appointments</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => handleTrackPrescription()}
                      className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300"
                    >
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-red-50 text-red-700 ring-4 ring-white">
                          🗺️
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium">
                          <span className="absolute inset-0" aria-hidden="true" />
                          Track Prescription
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">Track on Google Maps</p>
                      </div>
                    </button>

                    <button className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300">
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-yellow-50 text-yellow-700 ring-4 ring-white">
                          📊
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium">
                          <span className="absolute inset-0" aria-hidden="true" />
                          View Records
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">Access health records</p>
                      </div>
                    </button>

                    <button className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300">
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-700 ring-4 ring-white">
                          💬
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium">
                          <span className="absolute inset-0" aria-hidden="true" />
                          Contact Support
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">Get help and support</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">Your latest health activities</p>
                </div>
                <div className="border-t border-gray-200">
                  <ul className="divide-y divide-gray-200">
                    <li className="px-4 py-4 sm:px-6">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 text-sm">💊</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">Prescription refill requested</p>
                          <p className="text-sm text-gray-500">Aspirin 100mg • 2 hours ago</p>
                        </div>
                      </div>
                    </li>
                    <li className="px-4 py-4 sm:px-6">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 text-sm">📅</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">Appointment scheduled</p>
                          <p className="text-sm text-gray-500">Dr. Johnson • Tomorrow at 10 AM</p>
                        </div>
                      </div>
                    </li>
                    <li className="px-4 py-4 sm:px-6">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                            <span className="text-yellow-600 text-sm">📊</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">Test results available</p>
                          <p className="text-sm text-gray-500">Blood test • 3 days ago</p>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* Prescriptions Tab */}
          {activeTab === 'prescriptions' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Your Prescriptions</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">Current medications and dosages</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Add New Prescription
                </button>
              </div>
              <ul className="divide-y divide-gray-200">
                {prescriptions.map((prescription) => (
                  <li key={prescription.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-bold">💊</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{prescription.medication}</div>
                          <div className="text-sm text-gray-500">{prescription.dosage} • {prescription.frequency}</div>
                          <div className="text-xs text-gray-400">Refills: {prescription.refills} • Next refill: {prescription.nextRefill}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          prescription.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {prescription.status}
                        </span>
                        {prescription.refills <= 1 && (
                          <button 
                            onClick={() => handleRefillRequest(prescription.id)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            Request Refill
                          </button>
                        )}
                        <button className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                          View Details
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Your Appointments</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">Scheduled and upcoming appointments</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Schedule Appointment
                </button>
              </div>
              <ul className="divide-y divide-gray-200">
                {appointments.map((appointment) => (
                  <li key={appointment.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-green-600 font-bold">🏥</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{appointment.doctor}</div>
                          <div className="text-sm text-gray-500">{appointment.type} • {appointment.date} at {appointment.time}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          appointment.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {appointment.status}
                        </span>
                        <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                          Reschedule
                        </button>
                        <button className="text-red-600 hover:text-red-900 text-sm font-medium">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Health Records Tab */}
          {activeTab === 'records' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Health Records</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Your medical history and test results</p>
              </div>
              <div className="border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Blood Test Results</h4>
                    <p className="text-sm text-gray-600 mb-3">Latest blood work from January 2024</p>
                    <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">View Report</button>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Vaccination Records</h4>
                    <p className="text-sm text-gray-600 mb-3">Complete vaccination history</p>
                    <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">View Records</button>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Allergies</h4>
                    <p className="text-sm text-gray-600 mb-3">Known allergies and reactions</p>
                    <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">View Details</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Notifications</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Important updates and reminders</p>
              </div>
              <ul className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <li key={notification.id} className={`px-4 py-4 sm:px-6 ${!notification.read ? 'bg-blue-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            notification.type === 'refill' ? 'bg-blue-100' :
                            notification.type === 'appointment' ? 'bg-green-100' : 'bg-yellow-100'
                          }`}>
                            <span className={`font-bold ${
                              notification.type === 'refill' ? 'text-blue-600' :
                              notification.type === 'appointment' ? 'text-green-600' : 'text-yellow-600'
                            }`}>
                              {notification.type === 'refill' ? '💊' : notification.type === 'appointment' ? '📅' : '📊'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{notification.message}</div>
                          <div className="text-sm text-gray-500">{notification.time}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!notification.read && (
                          <button 
                            onClick={() => markNotificationRead(notification.id)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            Mark Read
                          </button>
                        )}
                        <button className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                          View Details
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>

      {/* Prescription Tracking Modal */}
      {showTrackingModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Select Prescription to Track</h3>
                <button 
                  onClick={() => setShowTrackingModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-3">
                {prescriptions.filter(p => p.status === 'Active' || p.status === 'In Transit').map((prescription) => (
                  <button
                    key={prescription.id}
                    onClick={() => trackPrescriptionOnMap(prescription)}
                    className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{prescription.medication}</h4>
                        <p className="text-sm text-gray-600">{prescription.dosage} - {prescription.frequency}</p>
                        <p className="text-sm text-gray-500">Status: {prescription.status}</p>
                      </div>
                      <div className="text-blue-600">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowTrackingModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CaregiverPortalPlaceholder() {
  const [patients, setPatients] = React.useState([
    { id: 1, name: 'John Smith', age: 75, relationship: 'Father', lastMedication: '2024-01-15 09:00 AM', nextMedication: '2024-01-15 02:00 PM', status: 'Active' },
    { id: 2, name: 'Mary Johnson', age: 68, relationship: 'Mother', lastMedication: '2024-01-15 08:30 AM', nextMedication: '2024-01-15 06:00 PM', status: 'Active' }
  ]);

  const [medications, setMedications] = React.useState([
    { id: 1, patient: 'John Smith', medication: 'Aspirin', dosage: '100mg', frequency: 'Once daily', time: '09:00 AM', status: 'Taken', date: '2024-01-15' },
    { id: 2, patient: 'John Smith', medication: 'Blood Pressure Med', dosage: '10mg', frequency: 'Twice daily', time: '02:00 PM', status: 'Pending', date: '2024-01-15' },
    { id: 3, patient: 'Mary Johnson', medication: 'Vitamin D', dosage: '1000 IU', frequency: 'Once daily', time: '08:30 AM', status: 'Taken', date: '2024-01-15' }
  ]);

  const [appointments, setAppointments] = React.useState([
    { id: 1, patient: 'John Smith', doctor: 'Dr. Sarah Johnson', date: '2024-01-20', time: '10:00 AM', type: 'Check-up', status: 'Confirmed' },
    { id: 2, patient: 'Mary Johnson', doctor: 'Dr. Michael Chen', date: '2024-01-25', time: '2:30 PM', type: 'Follow-up', status: 'Pending' }
  ]);

  const [alerts, setAlerts] = React.useState([
    { id: 1, type: 'medication', message: 'John Smith needs to take Blood Pressure Med at 2:00 PM', time: '1 hour ago', priority: 'high' },
    { id: 2, type: 'appointment', message: 'Mary Johnson has an appointment tomorrow at 2:30 PM', time: '3 hours ago', priority: 'medium' },
    { id: 3, type: 'refill', message: 'John Smith\'s Aspirin prescription needs refill', time: '1 day ago', priority: 'low' }
  ]);

  const [activeTab, setActiveTab] = React.useState('dashboard');

  const handleLogout = () => {
    window.location.href = '/';
  };

  const handleMedicationTaken = (medicationId: number) => {
    setMedications(prev => 
      prev.map(m => m.id === medicationId ? { ...m, status: 'Taken' } : m)
    );
  };

  const markAlertRead = (alertId: number) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Caregiver Portal</h1>
              <p className="text-gray-600">Manage care for your loved ones</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button className="relative p-2 text-gray-600 hover:text-gray-900">
                  <span className="text-xl">🔔</span>
                  {alerts.filter(a => a.priority === 'high').length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {alerts.filter(a => a.priority === 'high').length}
                    </span>
                  )}
                </button>
              </div>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                Add Patient
              </button>
              <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                Schedule Appointment
              </button>
              <button onClick={handleLogout} className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'patients', label: 'Patients', icon: '👥' },
              { id: 'medications', label: 'Medications', icon: '💊' },
              { id: 'appointments', label: 'Appointments', icon: '📅' },
              { id: 'alerts', label: 'Alerts', icon: '🔔' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <>
              {/* Dashboard Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold">👥</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Active Patients</dt>
                          <dd className="text-lg font-medium text-gray-900">{patients.filter(p => p.status === 'Active').length}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold">⏰</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Pending Medications</dt>
                          <dd className="text-lg font-medium text-gray-900">{medications.filter(m => m.status === 'Pending').length}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold">📅</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Upcoming Appointments</dt>
                          <dd className="text-lg font-medium text-gray-900">{appointments.filter(a => a.status === 'Confirmed').length}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold">🔔</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">High Priority Alerts</dt>
                          <dd className="text-lg font-medium text-gray-900">{alerts.filter(a => a.priority === 'high').length}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white shadow sm:rounded-lg mb-8">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Quick Actions</h3>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <button className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300">
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-700 ring-4 ring-white">
                          💊
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium">
                          <span className="absolute inset-0" aria-hidden="true" />
                          Mark Medication Taken
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">Record medication administration</p>
                      </div>
                    </button>

                    <button className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300">
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-700 ring-4 ring-white">
                          📅
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium">
                          <span className="absolute inset-0" aria-hidden="true" />
                          Schedule Appointment
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">Book doctor appointments</p>
                      </div>
                    </button>

                    <button className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300">
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-yellow-50 text-yellow-700 ring-4 ring-white">
                          📝
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium">
                          <span className="absolute inset-0" aria-hidden="true" />
                          Request Refill
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">Request prescription refills</p>
                      </div>
                    </button>

                    <button className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300">
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-700 ring-4 ring-white">
                          📊
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium">
                          <span className="absolute inset-0" aria-hidden="true" />
                          View Reports
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">Health reports and analytics</p>
                      </div>
                    </button>

                    <button className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300">
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-700 ring-4 ring-white">
                          💬
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium">
                          <span className="absolute inset-0" aria-hidden="true" />
                          Contact Support
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">Get help and support</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Today's Medications */}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Today's Medications</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">Medications to be administered today</p>
                </div>
                <div className="border-t border-gray-200">
                  <ul className="divide-y divide-gray-200">
                    {medications.filter(m => m.status === 'Pending').slice(0, 3).map((medication) => (
                      <li key={medication.id} className="px-4 py-4 sm:px-6">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                              <span className="text-yellow-600 text-sm">💊</span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{medication.patient}</p>
                            <p className="text-sm text-gray-500">{medication.medication} • {medication.dosage} • {medication.time}</p>
                          </div>
                          <div className="flex-shrink-0">
                            <button 
                              onClick={() => handleMedicationTaken(medication.id)}
                              className="text-green-600 hover:text-green-900 text-sm font-medium"
                            >
                              Mark Taken
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* Patients Tab */}
          {activeTab === 'patients' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Your Patients</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">People under your care</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Add Patient
                </button>
              </div>
              <ul className="divide-y divide-gray-200">
                {patients.map((patient) => (
                  <li key={patient.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-bold">👤</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                          <div className="text-sm text-gray-500">Age: {patient.age} • {patient.relationship}</div>
                          <div className="text-xs text-gray-400">Next medication: {patient.nextMedication}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          patient.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {patient.status}
                        </span>
                        <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                          View Details
                        </button>
                        <button className="text-green-600 hover:text-green-900 text-sm font-medium">
                          Schedule
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Medications Tab */}
          {activeTab === 'medications' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Medication Schedule</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">Track medication administration</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Add Medication
                </button>
              </div>
              <ul className="divide-y divide-gray-200">
                {medications.map((medication) => (
                  <li key={medication.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-bold">💊</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{medication.patient}</div>
                          <div className="text-sm text-gray-500">{medication.medication} • {medication.dosage} • {medication.frequency}</div>
                          <div className="text-xs text-gray-400">Time: {medication.time} • Date: {medication.date}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          medication.status === 'Taken' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {medication.status}
                        </span>
                        {medication.status === 'Pending' && (
                          <button 
                            onClick={() => handleMedicationTaken(medication.id)}
                            className="text-green-600 hover:text-green-900 text-sm font-medium"
                          >
                            Mark Taken
                          </button>
                        )}
                        <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                          View Details
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Appointments</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">Scheduled appointments for your patients</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Schedule Appointment
                </button>
              </div>
              <ul className="divide-y divide-gray-200">
                {appointments.map((appointment) => (
                  <li key={appointment.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-green-600 font-bold">🏥</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{appointment.patient}</div>
                          <div className="text-sm text-gray-500">{appointment.doctor} • {appointment.type}</div>
                          <div className="text-xs text-gray-400">{appointment.date} at {appointment.time}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          appointment.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {appointment.status}
                        </span>
                        <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                          Reschedule
                        </button>
                        <button className="text-red-600 hover:text-red-900 text-sm font-medium">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Alerts & Notifications</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Important alerts and reminders</p>
              </div>
              <ul className="divide-y divide-gray-200">
                {alerts.map((alert) => (
                  <li key={alert.id} className={`px-4 py-4 sm:px-6 ${
                    alert.priority === 'high' ? 'bg-red-50' : 
                    alert.priority === 'medium' ? 'bg-yellow-50' : 'bg-blue-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            alert.priority === 'high' ? 'bg-red-100' : 
                            alert.priority === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                          }`}>
                            <span className={`font-bold ${
                              alert.priority === 'high' ? 'text-red-600' : 
                              alert.priority === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                            }`}>
                              {alert.type === 'medication' ? '💊' : alert.type === 'appointment' ? '📅' : '🔄'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{alert.message}</div>
                          <div className="text-sm text-gray-500">{alert.time}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          alert.priority === 'high' ? 'bg-red-100 text-red-800' : 
                          alert.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {alert.priority} priority
                        </span>
                        <button 
                          onClick={() => markAlertRead(alert.id)}
                          className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function DoctorPortalPlaceholder() {
  const navigate = useNavigate();
  const authService = AuthenticationService.getInstance();
  
  const [patients, setPatients] = React.useState([
    { id: 1, name: 'John Smith', age: 45, lastVisit: '2024-01-10', nextAppointment: '2024-01-15', status: 'Active' },
    { id: 2, name: 'Sarah Wilson', age: 32, lastVisit: '2024-01-08', nextAppointment: '2024-01-22', status: 'Active' },
    { id: 3, name: 'Michael Brown', age: 58, lastVisit: '2024-01-05', nextAppointment: null, status: 'Inactive' }
  ]);

  const [appointments, setAppointments] = React.useState([
    { id: 1, patient: 'John Smith', date: '2024-01-15', time: '10:00 AM', type: 'Check-up', status: 'Confirmed' },
    { id: 2, patient: 'Sarah Wilson', date: '2024-01-22', time: '2:30 PM', type: 'Follow-up', status: 'Pending' },
    { id: 3, patient: 'Emily Davis', date: '2024-01-16', time: '11:00 AM', type: 'New Patient', status: 'Confirmed' }
  ]);

  const [prescriptions, setPrescriptions] = React.useState([
    { id: 1, patient: 'John Smith', medication: 'Aspirin', dosage: '100mg', frequency: 'Once daily', status: 'Active', date: '2024-01-10' },
    { id: 2, patient: 'Sarah Wilson', medication: 'Vitamin D', dosage: '1000 IU', frequency: 'Once daily', status: 'Active', date: '2024-01-08' },
    { id: 3, patient: 'John Smith', medication: 'Metformin', dosage: '500mg', frequency: 'Twice daily', status: 'Pending', date: '2024-01-15' }
  ]);

  const [activeTab, setActiveTab] = React.useState('dashboard');

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, redirect to home for security
      navigate('/');
    }
  };

  const handlePrescriptionApproval = (prescriptionId: number) => {
    setPrescriptions(prev => 
      prev.map(p => p.id === prescriptionId ? { ...p, status: 'Active' } : p)
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Doctor Portal</h1>
              <p className="text-gray-600">Manage patients, appointments, and prescriptions</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                New Patient
              </button>
              <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                Schedule Appointment
              </button>
              <button onClick={handleLogout} className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'patients', label: 'Patients', icon: '👥' },
              { id: 'appointments', label: 'Appointments', icon: '📅' },
              { id: 'prescriptions', label: 'Prescriptions', icon: '💊' },
              { id: 'reports', label: 'Reports', icon: '📋' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <>
              {/* Dashboard Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold">👥</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Active Patients</dt>
                          <dd className="text-lg font-medium text-gray-900">{patients.filter(p => p.status === 'Active').length}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold">📅</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Today's Appointments</dt>
                          <dd className="text-lg font-medium text-gray-900">{appointments.filter(a => a.status === 'Confirmed').length}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold">💊</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Pending Prescriptions</dt>
                          <dd className="text-lg font-medium text-gray-900">{prescriptions.filter(p => p.status === 'Pending').length}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold">📊</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">This Month</dt>
                          <dd className="text-lg font-medium text-gray-900">24</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white shadow sm:rounded-lg mb-8">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Quick Actions</h3>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <button className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300">
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-700 ring-4 ring-white">
                          👤
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium">
                          <span className="absolute inset-0" aria-hidden="true" />
                          Add Patient
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">Register new patient</p>
                      </div>
                    </button>

                    <button className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300">
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-700 ring-4 ring-white">
                          📅
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium">
                          <span className="absolute inset-0" aria-hidden="true" />
                          Schedule Appointment
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">Book patient appointments</p>
                      </div>
                    </button>

                    <button className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300">
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-yellow-50 text-yellow-700 ring-4 ring-white">
                          💊
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium">
                          <span className="absolute inset-0" aria-hidden="true" />
                          Write Prescription
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">Prescribe medications</p>
                      </div>
                    </button>

                    <button className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300">
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-700 ring-4 ring-white">
                          📊
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium">
                          <span className="absolute inset-0" aria-hidden="true" />
                          View Reports
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">Patient reports & analytics</p>
                      </div>
                    </button>

                    <button className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300">
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-700 ring-4 ring-white">
                          💬
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium">
                          <span className="absolute inset-0" aria-hidden="true" />
                          Contact Support
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">Get help and support</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Today's Schedule */}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Today's Schedule</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">Your appointments for today</p>
                </div>
                <div className="border-t border-gray-200">
                  <ul className="divide-y divide-gray-200">
                    {appointments.filter(a => a.status === 'Confirmed').slice(0, 3).map((appointment) => (
                      <li key={appointment.id} className="px-4 py-4 sm:px-6">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-green-600 text-sm">🏥</span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{appointment.patient}</p>
                            <p className="text-sm text-gray-500">{appointment.type} • {appointment.time}</p>
                          </div>
                          <div className="flex-shrink-0">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {appointment.status}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* Patients Tab */}
          {activeTab === 'patients' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Your Patients</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">Patient list and information</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Add New Patient
                </button>
              </div>
              <ul className="divide-y divide-gray-200">
                {patients.map((patient) => (
                  <li key={patient.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-bold">👤</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                          <div className="text-sm text-gray-500">Age: {patient.age} • Last Visit: {patient.lastVisit}</div>
                          {patient.nextAppointment && (
                            <div className="text-xs text-gray-400">Next: {patient.nextAppointment}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          patient.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {patient.status}
                        </span>
                        <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                          View Profile
                        </button>
                        <button className="text-green-600 hover:text-green-900 text-sm font-medium">
                          Schedule
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Appointments</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">Scheduled appointments and calendar</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Schedule Appointment
                </button>
              </div>
              <ul className="divide-y divide-gray-200">
                {appointments.map((appointment) => (
                  <li key={appointment.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-green-600 font-bold">🏥</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{appointment.patient}</div>
                          <div className="text-sm text-gray-500">{appointment.type} • {appointment.date} at {appointment.time}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          appointment.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {appointment.status}
                        </span>
                        <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                          Start
                        </button>
                        <button className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                          Reschedule
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Prescriptions Tab */}
          {activeTab === 'prescriptions' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Prescriptions</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">Manage patient prescriptions</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Write Prescription
                </button>
              </div>
              <ul className="divide-y divide-gray-200">
                {prescriptions.map((prescription) => (
                  <li key={prescription.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-bold">💊</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{prescription.patient}</div>
                          <div className="text-sm text-gray-500">{prescription.medication} • {prescription.dosage} • {prescription.frequency}</div>
                          <div className="text-xs text-gray-400">Prescribed: {prescription.date}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          prescription.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {prescription.status}
                        </span>
                        {prescription.status === 'Pending' && (
                          <button 
                            onClick={() => handlePrescriptionApproval(prescription.id)}
                            className="text-green-600 hover:text-green-900 text-sm font-medium"
                          >
                            Approve
                          </button>
                        )}
                        <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                          View Details
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Reports & Analytics</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Patient reports and practice analytics</p>
              </div>
              <div className="border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Patient Demographics</h4>
                    <p className="text-sm text-gray-600 mb-3">Age, gender, and location analysis</p>
                    <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">View Report</button>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Appointment Analytics</h4>
                    <p className="text-sm text-gray-600 mb-3">Scheduling patterns and trends</p>
                    <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">View Report</button>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Prescription Trends</h4>
                    <p className="text-sm text-gray-600 mb-3">Medication patterns and usage</p>
                    <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">View Report</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function PharmacistPortalPlaceholder() {
  const navigate = useNavigate();
  const authService = AuthenticationService.getInstance();
  
  const [prescriptions, setPrescriptions] = React.useState([
    { id: 1, patient: 'John Smith', doctor: 'Dr. Sarah Johnson', medication: 'Aspirin', dosage: '100mg', frequency: 'Once daily', status: 'Ready', refills: 2, date: '2024-01-15' },
    { id: 2, patient: 'Sarah Wilson', doctor: 'Dr. Michael Chen', medication: 'Vitamin D', dosage: '1000 IU', frequency: 'Once daily', status: 'In Progress', refills: 1, date: '2024-01-16' },
    { id: 3, patient: 'Emily Davis', doctor: 'Dr. Sarah Johnson', medication: 'Metformin', dosage: '500mg', frequency: 'Twice daily', status: 'Pending', refills: 0, date: '2024-01-17' }
  ]);

  const [inventory, setInventory] = React.useState([
    { id: 1, medication: 'Aspirin 100mg', quantity: 150, unit: 'tablets', status: 'In Stock', reorderLevel: 50 },
    { id: 2, medication: 'Vitamin D 1000 IU', quantity: 75, unit: 'tablets', status: 'Low Stock', reorderLevel: 100 },
    { id: 3, medication: 'Metformin 500mg', quantity: 200, unit: 'tablets', status: 'In Stock', reorderLevel: 50 }
  ]);

  const [refillRequests, setRefillRequests] = React.useState([
    { id: 1, patient: 'John Smith', medication: 'Aspirin', status: 'Approved', date: '2024-01-15' },
    { id: 2, patient: 'Sarah Wilson', medication: 'Vitamin D', status: 'Pending', date: '2024-01-16' }
  ]);

  const [activeTab, setActiveTab] = React.useState('dashboard');

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, redirect to home for security
      navigate('/');
    }
  };

  const handlePrescriptionStatus = (prescriptionId: number, newStatus: string) => {
    setPrescriptions(prev => 
      prev.map(p => p.id === prescriptionId ? { ...p, status: newStatus } : p)
    );
  };

  const handleRefillApproval = (refillId: number) => {
    setRefillRequests(prev => 
      prev.map(r => r.id === refillId ? { ...r, status: 'Approved' } : r)
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pharmacist Portal</h1>
              <p className="text-gray-600">Manage prescriptions, inventory, and patient consultations</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                New Prescription
              </button>
              <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                Check Inventory
              </button>
              <button onClick={handleLogout} className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'prescriptions', label: 'Prescriptions', icon: '💊' },
              { id: 'inventory', label: 'Inventory', icon: '📦' },
              { id: 'refills', label: 'Refill Requests', icon: '🔄' },
              { id: 'consultations', label: 'Consultations', icon: '💬' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <>
              {/* Dashboard Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold">💊</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Ready Prescriptions</dt>
                          <dd className="text-lg font-medium text-gray-900">{prescriptions.filter(p => p.status === 'Ready').length}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold">⏳</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">In Progress</dt>
                          <dd className="text-lg font-medium text-gray-900">{prescriptions.filter(p => p.status === 'In Progress').length}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold">⚠️</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Low Stock Items</dt>
                          <dd className="text-lg font-medium text-gray-900">{inventory.filter(i => i.status === 'Low Stock').length}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold">🔄</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Refill Requests</dt>
                          <dd className="text-lg font-medium text-gray-900">{refillRequests.filter(r => r.status === 'Pending').length}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white shadow sm:rounded-lg mb-8">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Quick Actions</h3>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <button className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300">
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-700 ring-4 ring-white">
                          💊
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium">
                          <span className="absolute inset-0" aria-hidden="true" />
                          Fill Prescription
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">Process new prescriptions</p>
                      </div>
                    </button>

                    <button className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300">
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-700 ring-4 ring-white">
                          📦
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium">
                          <span className="absolute inset-0" aria-hidden="true" />
                          Check Inventory
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">Review stock levels</p>
                      </div>
                    </button>

                    <button className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300">
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-yellow-50 text-yellow-700 ring-4 ring-white">
                          🔄
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium">
                          <span className="absolute inset-0" aria-hidden="true" />
                          Process Refills
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">Handle refill requests</p>
                      </div>
                    </button>

                    <button className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300">
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-700 ring-4 ring-white">
                          💬
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium">
                          <span className="absolute inset-0" aria-hidden="true" />
                          Patient Consultation
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">Provide medication advice</p>
                      </div>
                    </button>

                    <button className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300">
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-700 ring-4 ring-white">
                          💬
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium">
                          <span className="absolute inset-0" aria-hidden="true" />
                          Contact Support
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">Get help and support</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Today's Prescriptions */}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Today's Prescriptions</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">Prescriptions to be filled today</p>
                </div>
                <div className="border-t border-gray-200">
                  <ul className="divide-y divide-gray-200">
                    {prescriptions.filter(p => p.status === 'Ready').slice(0, 3).map((prescription) => (
                      <li key={prescription.id} className="px-4 py-4 sm:px-6">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-green-600 text-sm">💊</span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{prescription.patient}</p>
                            <p className="text-sm text-gray-500">{prescription.medication} • {prescription.dosage}</p>
                          </div>
                          <div className="flex-shrink-0">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {prescription.status}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* Prescriptions Tab */}
          {activeTab === 'prescriptions' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Prescriptions</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">Manage prescription filling and dispensing</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  New Prescription
                </button>
              </div>
              <ul className="divide-y divide-gray-200">
                {prescriptions.map((prescription) => (
                  <li key={prescription.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-bold">💊</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{prescription.patient}</div>
                          <div className="text-sm text-gray-500">{prescription.medication} • {prescription.dosage} • {prescription.frequency}</div>
                          <div className="text-xs text-gray-400">Dr. {prescription.doctor} • {prescription.date}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          prescription.status === 'Ready' ? 'bg-green-100 text-green-800' :
                          prescription.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {prescription.status}
                        </span>
                        {prescription.status === 'Pending' && (
                          <button 
                            onClick={() => handlePrescriptionStatus(prescription.id, 'In Progress')}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            Start Filling
                          </button>
                        )}
                        {prescription.status === 'In Progress' && (
                          <button 
                            onClick={() => handlePrescriptionStatus(prescription.id, 'Ready')}
                            className="text-green-600 hover:text-green-900 text-sm font-medium"
                          >
                            Mark Ready
                          </button>
                        )}
                        <button className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                          View Details
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Inventory Management</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">Track medication stock levels</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Add Stock
                </button>
              </div>
              <ul className="divide-y divide-gray-200">
                {inventory.map((item) => (
                  <li key={item.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-green-600 font-bold">📦</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{item.medication}</div>
                          <div className="text-sm text-gray-500">Quantity: {item.quantity} {item.unit}</div>
                          <div className="text-xs text-gray-400">Reorder Level: {item.reorderLevel} {item.unit}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.status === 'In Stock' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.status}
                        </span>
                        <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                          Reorder
                        </button>
                        <button className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                          Update Stock
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Refill Requests Tab */}
          {activeTab === 'refills' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Refill Requests</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Patient refill requests and approvals</p>
              </div>
              <ul className="divide-y divide-gray-200">
                {refillRequests.map((refill) => (
                  <li key={refill.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-bold">🔄</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{refill.patient}</div>
                          <div className="text-sm text-gray-500">{refill.medication}</div>
                          <div className="text-xs text-gray-400">Requested: {refill.date}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          refill.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {refill.status}
                        </span>
                        {refill.status === 'Pending' && (
                          <button 
                            onClick={() => handleRefillApproval(refill.id)}
                            className="text-green-600 hover:text-green-900 text-sm font-medium"
                          >
                            Approve
                          </button>
                        )}
                        <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                          View Details
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Consultations Tab */}
          {activeTab === 'consultations' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Patient Consultations</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Medication counseling and advice</p>
              </div>
              <div className="border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Drug Interactions</h4>
                    <p className="text-sm text-gray-600 mb-3">Check for potential drug interactions</p>
                    <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">Check Interactions</button>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Side Effects</h4>
                    <p className="text-sm text-gray-600 mb-3">Review medication side effects</p>
                    <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">View Information</button>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Dosage Calculator</h4>
                    <p className="text-sm text-gray-600 mb-3">Calculate proper dosages</p>
                    <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">Calculate</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App; 