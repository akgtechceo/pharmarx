import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DeliveryTracking from '../components/DeliveryTracking';
import { useDeliveryTracking, useDeliveryTrackingEligibility } from '../hooks/useDeliveryTracking';
import { useDeliveryNotifications, useDeliveryNotificationPreferences } from '../hooks/useDeliveryNotifications';
import { useOrderStatus } from '../hooks/useOrderStatus';

interface DeliveryTrackingPageProps {
  className?: string;
}

const DeliveryTrackingPage: React.FC<DeliveryTrackingPageProps> = ({ className = '' }) => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  // Fetch order status to verify tracking eligibility
  const { order, isLoading: orderLoading, isError: orderError } = useOrderStatus(orderId);
  const { shouldShowTracking } = useDeliveryTrackingEligibility(order?.status);

  // Fetch delivery tracking data with real-time polling
  const {
    trackingInfo,
    isLoading: trackingLoading,
    isError: trackingError,
    error: trackingErrorMessage,
    refetch: refetchTracking,
    lastUpdated
  } = useDeliveryTracking(orderId, {
    enabled: shouldShowTracking
  });

  // Delivery notification preferences
  const {
    preferences,
    updatePreferences,
    isLoading: preferencesLoading
  } = useDeliveryNotificationPreferences(orderId || 'unknown');

  // Setup delivery notifications
  const {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
    isApproaching,
    hasArrived
  } = useDeliveryNotifications(trackingInfo, {
    enabled: shouldShowTracking,
    preferences,
    onNotification: (event) => {
      console.log('New delivery notification:', event);
      // You could trigger additional UI updates here
    }
  });

  // Redirect if order is not eligible for tracking
  useEffect(() => {
    if (order && !shouldShowTracking) {
      console.log('Order not eligible for delivery tracking, redirecting...');
      navigate(`/orders/${orderId}`);
    }
  }, [order, shouldShowTracking, orderId, navigate]);

  // Handle back navigation
  const handleGoBack = () => {
    navigate(-1);
  };

  // Handle refresh
  const handleRefresh = () => {
    refetchTracking();
  };

  // Loading state
  if (orderLoading || (trackingLoading && !trackingInfo)) {
    return (
      <div className={`min-h-screen bg-gray-50 ${className}`}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading delivery tracking...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (orderError || trackingError) {
    return (
      <div className={`min-h-screen bg-gray-50 ${className}`}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center">
              <div className="text-red-600 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Unable to Load Delivery Tracking
              </h2>
              <p className="text-gray-600 mb-4">
                {trackingErrorMessage?.message || 'There was a problem loading the delivery tracking information.'}
              </p>
              <div className="space-x-3">
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={handleGoBack}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No tracking info available
  if (!trackingInfo) {
    return (
      <div className={`min-h-screen bg-gray-50 ${className}`}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Delivery Tracking Not Available
              </h2>
              <p className="text-gray-600 mb-4">
                Delivery tracking information is not yet available for this order.
              </p>
              <button
                onClick={handleGoBack}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleGoBack}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back to Orders
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Delivery Tracking</h1>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Notification indicators */}
              {isApproaching && (
                <div className="flex items-center text-orange-600 bg-orange-100 px-3 py-1 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse mr-2"></div>
                  Approaching
                </div>
              )}
              {hasArrived && (
                <div className="flex items-center text-green-600 bg-green-100 px-3 py-1 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Arrived
                </div>
              )}
              
              {/* Notification count */}
              {unreadCount > 0 && (
                <button
                  onClick={() => markAsRead()}
                  className="relative flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                </button>
              )}
              
              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                disabled={trackingLoading}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
              >
                <svg className={`w-5 h-5 ${trackingLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
          
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-2">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Main Delivery Tracking Component */}
        <DeliveryTracking
          orderId={orderId!}
          trackingInfo={trackingInfo}
          className="mb-6"
        />

        {/* Recent Notifications */}
        {notifications.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Updates</h3>
              {notifications.length > 3 && (
                <button
                  onClick={clearAll}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="space-y-3">
              {notifications.slice(0, 5).map((notification, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    notification.type === 'approach' ? 'bg-orange-500' : 'bg-green-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {notification.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryTrackingPage;