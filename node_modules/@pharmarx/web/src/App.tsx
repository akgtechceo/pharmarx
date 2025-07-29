import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import RegisterPage from './features/auth/RegisterPage';
import LoginPage from './features/auth/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { UserRole } from '@pharmarx/shared-types';
import { PatientPortal } from './components/portals/PatientPortal';
import { CaregiverPortal } from './components/portals/CaregiverPortal';
import { DoctorPrescriptionPortal } from './features/doctor/components/DoctorPrescriptionPortal';
import VerificationPage from './features/prescriptions/pages/VerificationPage';
import OrderHistoryPage from './features/prescriptions/pages/OrderHistoryPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/portal/patient" element={
          <ProtectedRoute requiredRole={UserRole.Patient}>
            <PatientPortal />
          </ProtectedRoute>
        } />
        <Route path="/portal/patient/orders/:orderId/verify" element={
          <ProtectedRoute requiredRole={UserRole.Patient}>
            <VerificationPage />
          </ProtectedRoute>
        } />
        <Route path="/portal/patient/orders/history" element={
          <ProtectedRoute requiredRole={UserRole.Patient}>
            <OrderHistoryPage />
          </ProtectedRoute>
        } />
        <Route path="/portal/caregiver" element={
          <ProtectedRoute requiredRole={UserRole.Caregiver}>
            <CaregiverPortal />
          </ProtectedRoute>
        } />
        <Route path="/portal/caregiver/orders/:orderId/verify" element={
          <ProtectedRoute requiredRole={UserRole.Caregiver}>
            <VerificationPage />
          </ProtectedRoute>
        } />
        <Route path="/portal/caregiver/orders/history" element={
          <ProtectedRoute requiredRole={UserRole.Caregiver}>
            <OrderHistoryPage />
          </ProtectedRoute>
        } />
        <Route path="/portal/doctor" element={
          <ProtectedRoute requiredRole={UserRole.Doctor}>
            <DoctorPortal />
          </ProtectedRoute>
        } />
        <Route path="/portal/pharmacist" element={
          <ProtectedRoute requiredRole={UserRole.Pharmacist}>
            <PharmacistPortal />
          </ProtectedRoute>
        } />
        <Route path="/doctor/prescriptions" element={
          <ProtectedRoute requiredRole={UserRole.Doctor}>
            <DoctorPrescriptionPortal />
          </ProtectedRoute>
        } />
        <Route path="/terms" element={<TermsPlaceholder />} />
        <Route path="/privacy" element={<PrivacyPlaceholder />} />
      </Routes>
    </Router>
  );
}

// Home page component
function HomePage() {
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
                <p>Frontend application is running successfully!</p>
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Dashboard placeholder
function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">PharmaRx Dashboard</h1>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          Registration successful! Welcome to PharmaRx.
        </div>
        <div className="mt-4">
          <Link to="/" className="text-blue-600 hover:text-blue-500">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

// PatientPortal component is now imported from ./components/portals/PatientPortal

// CaregiverPortal component is now imported from ./components/portals/CaregiverPortal

function DoctorPortal() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-blue-700">PharmaRx</h1>
              <span className="text-gray-500">|</span>
              <span className="text-lg font-medium text-gray-700">Doctor Portal</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Dr. Smith • <span className="font-medium">12 Patients Today</span>
              </div>
              <button className="text-gray-600 hover:text-gray-800">Profile</button>
              <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">🩺</span>
              </div>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-blue-900">Welcome, Dr. Smith!</h3>
              <p className="text-blue-700 mt-1">Your clinical dashboard for patient management, prescription writing, and appointment scheduling. Today you have 3 urgent patient reviews and 2 prescription renewals.</p>
            </div>
          </div>
        </div>

        {/* Doctor Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Patient Management */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today&apos;s Patients */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Today&apos;s Schedule</h2>
                <button className="text-blue-700 hover:text-blue-900 text-sm font-medium">View Full Schedule</button>
              </div>
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-gray-900">Sarah Williams</h3>
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">URGENT</span>
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Follow-up</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">10:00 AM • Diabetes management consultation</p>
                      <div className="flex space-x-4 mt-2 text-xs text-gray-500">
                        <span>• HbA1c: 8.2% (High)</span>
                        <span>• BP: 140/90</span>
                        <span>• Last visit: 3 months ago</span>
                      </div>
                    </div>
                    <button className="text-blue-700 hover:text-blue-900 text-sm font-medium">View Chart</button>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-gray-900">Michael Chen</h3>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Routine</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">2:30 PM • Annual physical examination</p>
                      <div className="flex space-x-4 mt-2 text-xs text-gray-500">
                        <span>• Age: 45</span>
                        <span>• No current medications</span>
                        <span>• Last visit: 1 year ago</span>
                      </div>
                    </div>
                    <button className="text-blue-700 hover:text-blue-900 text-sm font-medium">View Chart</button>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-gray-900">Jennifer Lopez</h3>
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Lab Review</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">4:00 PM • Blood work results discussion</p>
                      <div className="flex space-x-4 mt-2 text-xs text-gray-500">
                        <span>• Cholesterol panel complete</span>
                        <span>• Thyroid function normal</span>
                      </div>
                    </div>
                    <button className="text-blue-700 hover:text-blue-900 text-sm font-medium">View Chart</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Prescription Management */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Prescription Queue</h2>
                <Link 
                  to="/doctor/prescriptions" 
                  className="bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-800 text-sm"
                >
                  Write New Prescription
                </Link>
              </div>
              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">Refill Request - Sarah Williams</h3>
                      <p className="text-sm text-gray-600">Metformin 500mg • 90-day supply</p>
                      <p className="text-xs text-gray-500 mt-1">Requested: Dec 19, 2024 • Last filled: Oct 15, 2024</p>
                    </div>
                    <div className="flex space-x-2">
                      <button className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-xs">
                        Approve
                      </button>
                      <button className="border border-gray-300 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-50 text-xs">
                        Review
                      </button>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">New Prescription - Michael Chen</h3>
                      <p className="text-sm text-gray-600">Awaiting prescription after physical exam</p>
                      <p className="text-xs text-gray-500 mt-1">Appointment scheduled: Today 2:30 PM</p>
                    </div>
                    <button className="border border-blue-600 text-blue-600 px-3 py-1 rounded-md hover:bg-blue-50 text-xs">
                      Schedule
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Clinical Notes */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Recent Clinical Notes</h2>
                <button className="text-blue-700 hover:text-blue-900 text-sm font-medium">View All Notes</button>
              </div>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">Sarah Williams - Diabetes Follow-up</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Patient reports improved glucose control with current metformin regimen. 
                        HbA1c improved from 9.1% to 8.2%. Recommend continuing current dose...
                      </p>
                      <p className="text-xs text-gray-500 mt-2">Dec 18, 2024 • Dr. Smith</p>
                    </div>
                    <button className="text-blue-700 hover:text-blue-900 text-sm font-medium">Edit</button>
                  </div>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">Robert Johnson - Cardiology Consult</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Blood pressure well controlled on current ACE inhibitor. 
                        Patient tolerating medication well with no side effects...
                      </p>
                      <p className="text-xs text-gray-500 mt-2">Dec 15, 2024 • Dr. Smith</p>
                    </div>
                    <button className="text-blue-700 hover:text-blue-900 text-sm font-medium">Edit</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Tools and Quick Actions */}
          <div className="space-y-6">
            {/* Quick Patient Search */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Patient Search</h2>
              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="Search by name, ID, or phone..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                <button className="w-full bg-blue-700 text-white py-2 px-4 rounded-md hover:bg-blue-800">
                  Search Patients
                </button>
              </div>
            </div>

            {/* Appointment Scheduling */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Appointments</h2>
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-medium text-sm text-gray-900">Tomorrow (Dec 21)</h4>
                  <p className="text-xs text-gray-600">6 scheduled appointments</p>
                  <p className="text-xs text-blue-600 mt-1">2 follow-ups, 4 new patients</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-medium text-sm text-gray-900">Monday (Dec 23)</h4>
                  <p className="text-xs text-gray-600">8 scheduled appointments</p>
                  <p className="text-xs text-blue-600 mt-1">3 physicals, 5 consultations</p>
                </div>
              </div>
              <button className="w-full mt-4 border border-blue-600 text-blue-600 py-2 px-4 rounded-md hover:bg-blue-50">
                Manage Schedule
              </button>
            </div>

            {/* Clinical Tools */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Clinical Tools</h2>
              <div className="space-y-3">
                <button className="w-full bg-blue-700 text-white py-2 px-4 rounded-md hover:bg-blue-800">
                  Lab Results Portal
                </button>
                <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50">
                  Radiology Reports
                </button>
                <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50">
                  Referral Management
                </button>
                <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50">
                  Clinical Guidelines
                </button>
              </div>
            </div>

            {/* Alerts and Notifications */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Alerts</h2>
              <div className="space-y-3">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h4 className="font-medium text-sm text-red-800">Critical Lab Value</h4>
                  <p className="text-xs text-red-700">S. Williams - HbA1c: 8.2%</p>
                  <p className="text-xs text-red-600 mt-1">Requires immediate attention</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <h4 className="font-medium text-sm text-yellow-800">Medication Interaction</h4>
                  <p className="text-xs text-yellow-700">New prescription alert pending</p>
                </div>
              </div>
              <button className="w-full mt-4 text-blue-700 hover:text-blue-900 text-sm font-medium">
                View All Alerts
              </button>
            </div>
          </div>
        </div>

        {/* Back to Home Link */}
        <div className="mt-8">
          <Link to="/" className="text-blue-700 hover:text-blue-900 font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function PharmacistPortal() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-purple-700">PharmaRx</h1>
              <span className="text-gray-500">|</span>
              <span className="text-lg font-medium text-gray-700">Pharmacist Portal</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                PharmD Johnson • <span className="font-medium">15 Orders in Queue</span>
              </div>
              <button className="text-gray-600 hover:text-gray-800">Profile</button>
              <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-700 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">💊</span>
              </div>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-purple-900">Welcome, PharmD Johnson!</h3>
              <p className="text-purple-700 mt-1">Your pharmacy operations dashboard. Process prescriptions, manage inventory, and provide patient counseling. Today you have 3 priority orders and 2 inventory alerts.</p>
            </div>
          </div>
        </div>

        {/* Pharmacist Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Prescription Processing */}
          <div className="lg:col-span-2 space-y-6">
            {/* Prescription Queue */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Prescription Queue</h2>
                <div className="flex space-x-2">
                  <button className="text-purple-700 hover:text-purple-900 text-sm font-medium">Filter</button>
                  <button className="bg-purple-700 text-white px-4 py-2 rounded-md hover:bg-purple-800 text-sm">
                    Process Next
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-gray-900">Sarah Williams</h3>
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">PRIORITY</span>
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Consultation Required</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Metformin 500mg • 90-day supply • Dr. Smith</p>
                      <div className="flex space-x-4 mt-2 text-xs text-gray-500">
                        <span>• New patient</span>
                        <span>• Drug interaction alert</span>
                        <span>• Submitted: 2 hours ago</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-xs">
                        Fill
                      </button>
                      <button className="border border-purple-600 text-purple-600 px-3 py-1 rounded-md hover:bg-purple-50 text-xs">
                        Consult
                      </button>
                    </div>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-gray-900">Michael Chen</h3>
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Ready to Fill</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Lisinopril 10mg • 30-day supply • Dr. Johnson</p>
                      <div className="flex space-x-4 mt-2 text-xs text-gray-500">
                        <span>• Refill #2 of 5</span>
                        <span>• Insurance: Approved</span>
                        <span>• Submitted: 4 hours ago</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-xs">
                        Fill
                      </button>
                      <button className="border border-gray-300 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-50 text-xs">
                        View
                      </button>
                    </div>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-gray-900">Jennifer Lopez</h3>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Ready for Pickup</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Atorvastatin 20mg • 90-day supply • Dr. Brown</p>
                      <div className="flex space-x-4 mt-2 text-xs text-gray-500">
                        <span>• Filled: 30 minutes ago</span>
                        <span>• Copay: $15.00</span>
                        <span>• Notification sent</span>
                      </div>
                    </div>
                    <button className="border border-green-600 text-green-600 px-3 py-1 rounded-md hover:bg-green-50 text-xs">
                      Complete
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Processing Workflow */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Processing Workflow</h2>
                <button className="text-purple-700 hover:text-purple-900 text-sm font-medium">Workflow Settings</button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-yellow-600 font-bold text-lg">3</span>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900">Received</h4>
                  <p className="text-xs text-gray-500">Awaiting review</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-600 font-bold text-lg">5</span>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900">Verified</h4>
                  <p className="text-xs text-gray-500">Ready to fill</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-purple-600 font-bold text-lg">4</span>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900">Filling</h4>
                  <p className="text-xs text-gray-500">In progress</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-green-600 font-bold text-lg">3</span>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900">Ready</h4>
                  <p className="text-xs text-gray-500">For pickup</p>
                </div>
              </div>
            </div>

            {/* Patient Counseling Log */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Recent Counseling Sessions</h2>
                <button className="text-purple-700 hover:text-purple-900 text-sm font-medium">View All Sessions</button>
              </div>
              <div className="space-y-4">
                <div className="border-l-4 border-purple-500 pl-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">Sarah Williams - Diabetes Medication Education</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Discussed proper metformin administration, timing with meals, and potential side effects. 
                        Patient understands importance of consistent timing and diet compliance...
                      </p>
                      <p className="text-xs text-gray-500 mt-2">Dec 19, 2024 • 15 minutes • PharmD Johnson</p>
                    </div>
                    <button className="text-purple-700 hover:text-purple-900 text-sm font-medium">Update</button>
                  </div>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">Robert Johnson - Heart Medication Review</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Annual medication review completed. Patient adherent to ACE inhibitor therapy. 
                        Blood pressure well controlled. No changes needed at this time...
                      </p>
                      <p className="text-xs text-gray-500 mt-2">Dec 18, 2024 • 10 minutes • PharmD Johnson</p>
                    </div>
                    <button className="text-purple-700 hover:text-purple-900 text-sm font-medium">Update</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Inventory and Tools */}
          <div className="space-y-6">
            {/* Inventory Alerts */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Inventory Alerts</h2>
              <div className="space-y-3">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h4 className="font-medium text-sm text-red-800">Low Stock Alert</h4>
                  <p className="text-xs text-red-700">Metformin 500mg: 5 units remaining</p>
                  <p className="text-xs text-red-600 mt-1">Reorder immediately</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <h4 className="font-medium text-sm text-yellow-800">Expiration Warning</h4>
                  <p className="text-xs text-yellow-700">Lisinopril 10mg expires in 30 days</p>
                  <p className="text-xs text-yellow-600 mt-1">27 units affected</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="font-medium text-sm text-blue-800">Order Status</h4>
                  <p className="text-xs text-blue-700">Weekly shipment arriving tomorrow</p>
                  <p className="text-xs text-blue-600 mt-1">145 items expected</p>
                </div>
              </div>
              <button className="w-full mt-4 bg-purple-700 text-white py-2 px-4 rounded-md hover:bg-purple-800">
                Manage Inventory
              </button>
            </div>

            {/* Quick Drug Search */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Drug Information</h2>
              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="Search by drug name or NDC..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                <button className="w-full bg-purple-700 text-white py-2 px-4 rounded-md hover:bg-purple-800">
                  Search Database
                </button>
                <div className="border-t pt-3 mt-3">
                  <h4 className="font-medium text-sm text-gray-900 mb-2">Quick References</h4>
                  <div className="space-y-1">
                    <button className="w-full text-left text-xs text-purple-700 hover:text-purple-900">
                      Drug Interactions Checker
                    </button>
                    <button className="w-full text-left text-xs text-purple-700 hover:text-purple-900">
                      Dosing Guidelines
                    </button>
                    <button className="w-full text-left text-xs text-purple-700 hover:text-purple-900">
                      Generic Equivalents
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Statistics */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Today&apos;s Statistics</h2>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-700">Prescriptions Filled</h3>
                  <p className="text-2xl font-bold text-purple-600">47</p>
                  <p className="text-xs text-gray-500">Target: 60 per day</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-700">Consultations</h3>
                  <p className="text-2xl font-bold text-green-600">12</p>
                  <p className="text-xs text-gray-500">Average: 8 minutes each</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-700">Revenue</h3>
                  <p className="text-2xl font-bold text-blue-600">$2,845</p>
                  <p className="text-xs text-gray-500">vs. $2,650 yesterday</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button className="w-full bg-purple-700 text-white py-2 px-4 rounded-md hover:bg-purple-800">
                  Schedule Consultation
                </button>
                <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50">
                  Insurance Verification
                </button>
                <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50">
                  Prior Authorization
                </button>
                <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50">
                  Generate Reports
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Home Link */}
        <div className="mt-8">
          <Link to="/" className="text-purple-700 hover:text-purple-900 font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

// Placeholder components for referenced routes

function TermsPlaceholder() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Terms of Service</h1>
        <p>Terms of Service content coming soon...</p>
        <Link to="/register" className="text-blue-600 hover:text-blue-500 mt-4 block">
          ← Back to Registration
        </Link>
      </div>
    </div>
  );
}

function PrivacyPlaceholder() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>
        <p>Privacy Policy content coming soon...</p>
        <Link to="/register" className="text-blue-600 hover:text-blue-500 mt-4 block">
          ← Back to Registration
        </Link>
      </div>
    </div>
  );
}

export default App 