import React from 'react';
import { Link } from 'react-router-dom';

interface PortalLayoutProps {
  title: string;
  brandColor: string;
  userInfo: string;
  welcomeMessage: {
    title: string;
    description: string;
    icon: string;
    bgColor: string;
    textColor: string;
  };
  children: React.ReactNode;
}

export default function PortalLayout({ 
  title, 
  brandColor, 
  userInfo, 
  welcomeMessage, 
  children 
}: PortalLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className={`text-2xl font-bold ${brandColor}`}>PharmaRx</h1>
              <span className="text-gray-500">|</span>
              <span className="text-lg font-medium text-gray-700">{title}</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {userInfo}
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
        <div className={`${welcomeMessage.bgColor} border ${welcomeMessage.bgColor.replace('bg-', 'border-').replace('-50', '-200')} rounded-lg p-6 mb-8`}>
          <div className="flex">
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 ${welcomeMessage.bgColor.replace('-50', '-500')} rounded-full flex items-center justify-center`}>
                <span className="text-white font-bold text-sm">{welcomeMessage.icon}</span>
              </div>
            </div>
            <div className="ml-3">
              <h3 className={`text-lg font-medium ${welcomeMessage.textColor.replace('700', '900')}`}>
                {welcomeMessage.title}
              </h3>
              <p className={`${welcomeMessage.textColor} mt-1`}>
                {welcomeMessage.description}
              </p>
            </div>
          </div>
        </div>

        {/* Portal Content */}
        {children}

        {/* Back to Home Link */}
        <div className="mt-8">
          <Link to="/" className={`${brandColor} hover:${brandColor.replace('600', '500').replace('700', '900')} font-medium`}>
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
} 