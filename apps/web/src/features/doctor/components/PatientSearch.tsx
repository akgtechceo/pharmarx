import React, { useState, useCallback } from 'react';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { PatientSearchResult } from '@pharmarx/shared-types';
import { usePatientSearch } from '../hooks/usePatientSearch';

interface PatientSearchProps {
  onPatientSelect: (patient: PatientSearchResult) => void;
  selectedPatient?: PatientSearchResult;
}

export const PatientSearch: React.FC<PatientSearchProps> = ({
  onPatientSelect,
  selectedPatient
}) => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'name' | 'phone' | 'email'>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const {
    patients,
    isLoading,
    error,
    searchPatients
  } = usePatientSearch();

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((searchQuery: string, type: string) => {
      if (searchQuery.trim().length >= 2) {
        searchPatients({ query: searchQuery.trim(), searchType: type as any });
      }
    }, 300),
    [searchPatients]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value, searchType);
  };

  const handleSearchTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as 'all' | 'name' | 'phone' | 'email';
    setSearchType(type);
    if (query.trim().length >= 2) {
      debouncedSearch(query, type);
    }
  };

  const handlePatientSelect = (patient: PatientSearchResult) => {
    onPatientSelect(patient);
    setQuery(patient.patientName);
    setIsSearchFocused(false);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getAge = (dateOfBirth: Date) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Search Patients</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <FunnelIcon className="h-4 w-4" />
          <span>Filter</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            placeholder="Search by name, phone, or email..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Search Type Filter */}
        <div className="mt-2">
          <select
            value={searchType}
            onChange={handleSearchTypeChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="all">Search All Fields</option>
            <option value="name">Search by Name</option>
            <option value="phone">Search by Phone</option>
            <option value="email">Search by Email</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Searching patients...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">
            Error searching patients: {error}
          </p>
        </div>
      )}

      {/* Search Results */}
      {isSearchFocused && query.trim().length >= 2 && !isLoading && !error && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {patients.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No patients found matching "{query}"</p>
              <p className="text-sm mt-1">Try a different search term or search type</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {patients.map((patient) => (
                <div
                  key={patient.profileId}
                  onClick={() => handlePatientSelect(patient)}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedPatient?.profileId === patient.profileId ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900">
                        {patient.patientName}
                      </h4>
                      <div className="mt-1 space-y-1">
                        <p className="text-sm text-gray-600">
                          {getAge(patient.dateOfBirth)} years old • {formatDate(patient.dateOfBirth)}
                        </p>
                        {patient.phoneNumber && (
                          <p className="text-sm text-gray-600">
                            📞 {patient.phoneNumber}
                          </p>
                        )}
                        {patient.email && (
                          <p className="text-sm text-gray-600">
                            ✉️ {patient.email}
                          </p>
                        )}
                        {patient.insuranceDetails && (
                          <p className="text-sm text-gray-600">
                            🏥 {patient.insuranceDetails.provider} • {patient.insuranceDetails.policyNumber}
                          </p>
                        )}
                        {patient.lastPrescriptionDate && (
                          <p className="text-sm text-gray-500">
                            Last prescription: {formatDate(patient.lastPrescriptionDate)}
                          </p>
                        )}
                      </div>
                    </div>
                    {selectedPatient?.profileId === patient.profileId && (
                      <div className="flex items-center space-x-1 text-blue-600">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        <span className="text-sm font-medium">Selected</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected Patient Display */}
      {selectedPatient && !isSearchFocused && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-blue-900">
                Selected Patient: {selectedPatient.patientName}
              </h4>
              <p className="text-sm text-blue-700">
                {getAge(selectedPatient.dateOfBirth)} years old • {formatDate(selectedPatient.dateOfBirth)}
              </p>
            </div>
            <button
              onClick={() => onPatientSelect(selectedPatient)}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              Change
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}