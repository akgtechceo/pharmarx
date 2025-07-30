import React, { useState } from 'react';
import PharmacyMapView from '../features/prescriptions/components/PharmacyMapView';

const MapDemo: React.FC = () => {
  const [selectedPharmacy, setSelectedPharmacy] = useState<string | null>(null);
  const [medicationName, setMedicationName] = useState('Metformin');

  const handlePharmacySelect = (pharmacyId: string) => {
    setSelectedPharmacy(pharmacyId);
    console.log('Selected pharmacy:', pharmacyId);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Interactive Pharmacy Map
          </h1>
          <p className="text-gray-600 mb-6">
            Find pharmacies with your medication in stock. Click on markers to see details and select your preferred pharmacy.
          </p>
          
          <div className="mb-6">
            <label htmlFor="medication" className="block text-sm font-medium text-gray-700 mb-2">
              Medication Name
            </label>
            <input
              type="text"
              id="medication"
              value={medicationName}
              onChange={(e) => setMedicationName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter medication name..."
            />
          </div>

          {selectedPharmacy && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="text-green-800 font-semibold">Pharmacy Selected!</h3>
              <p className="text-green-700 text-sm">Pharmacy ID: {selectedPharmacy}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Nearby Pharmacies - {medicationName}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Green markers: In stock | Yellow markers: Low stock | Red markers: Out of stock
            </p>
          </div>
          
          <div className="h-96">
            <PharmacyMapView
              medicationName={medicationName}
              onPharmacySelect={handlePharmacySelect}
              className="w-full h-full"
            />
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">How to Use</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h4 className="font-medium text-gray-900">View Map</h4>
              <p className="text-sm text-gray-600">The map shows nearby pharmacies with colored markers indicating availability</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h4 className="font-medium text-gray-900">Click Markers</h4>
              <p className="text-sm text-gray-600">Click on pharmacy markers to see detailed information and availability</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <h4 className="font-medium text-gray-900">Select Pharmacy</h4>
              <p className="text-sm text-gray-600">Choose your preferred pharmacy to continue with your prescription order</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapDemo; 