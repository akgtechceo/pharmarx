import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import RegisterPage from './features/auth/RegisterPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/login" element={<LoginPlaceholder />} />
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

// Placeholder components for referenced routes
function LoginPlaceholder() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Login</h1>
        <p>Login page coming soon...</p>
        <Link to="/" className="text-blue-600 hover:text-blue-500 mt-2 block">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

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