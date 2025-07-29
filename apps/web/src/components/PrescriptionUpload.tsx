import React, { useState, useRef, useCallback } from 'react';
import { 
  UploadedFile, 
  FileValidationResult, 
  validatePrescriptionFile,
  PrescriptionOrder,
  CreatePrescriptionOrderInput
} from '@pharmarx/shared-types';
import { useAuthStore } from '../stores/authStore';
import { prescriptionService } from '../services/prescriptionService';

interface PrescriptionUploadProps {
  onUploadComplete?: (order: PrescriptionOrder) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

export const PrescriptionUpload: React.FC<PrescriptionUploadProps> = ({
  onUploadComplete,
  onCancel,
  isModal = false
}) => {
  const { user } = useAuthStore();
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // File validation
  const validateFile = (file: File): FileValidationResult => {
    return validatePrescriptionFile(file);
  };

  // Create file preview
  const createFilePreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.type === 'application/pdf') {
        resolve('/pdf-icon.svg'); // Placeholder for PDF preview
      } else {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }
    });
  };

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    setValidationErrors([]);
    setUploadError(null);

    const validation = validateFile(file);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    try {
      const preview = await createFilePreview(file);
      const uploadedFile: UploadedFile = {
        file,
        preview,
        name: file.name,
        size: file.size,
        type: file.type
      };
      setUploadedFile(uploadedFile);
    } catch (error) {
      setUploadError('Failed to process file');
    }
  };

  // File input change handler
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Camera capture handler
  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  // Upload to backend
  const handleUpload = async () => {
    if (!uploadedFile || !user) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      const prescriptionOrder = await prescriptionService.uploadPrescription(
        uploadedFile.file,
        user.uid,
        {
          onProgress: (progress) => {
            setUploadProgress(progress.percentage);
          },
          signal: abortControllerRef.current.signal
        }
      );

      onUploadComplete?.(prescriptionOrder);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setUploadError('Upload cancelled.');
      } else {
        setUploadError(error instanceof Error ? error.message : 'Upload failed. Please try again.');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      abortControllerRef.current = null;
    }
  };

  // Cancel upload
  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Clear selected file
  const handleClearFile = () => {
    // Cancel any ongoing upload
    if (isUploading && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setUploadedFile(null);
    setValidationErrors([]);
    setUploadError(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const containerClasses = isModal 
    ? "bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto"
    : "bg-white rounded-lg shadow-md p-6";

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Upload Prescription</h2>
        {isModal && onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {!uploadedFile ? (
        <div className="space-y-6">
          {/* Upload Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File Browse Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-6 border-2 border-blue-300 border-dashed rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <svg className="w-12 h-12 text-blue-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Browse Files</h3>
              <p className="text-sm text-gray-600">Select from your device</p>
            </button>

            {/* Camera Capture Button */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-6 border-2 border-green-300 border-dashed rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
            >
              <svg className="w-12 h-12 text-green-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Take Photo</h3>
              <p className="text-sm text-gray-600">Use your camera</p>
            </button>
          </div>

          {/* Drag and Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragActive 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isDragActive ? 'Drop your file here' : 'Drag and drop your prescription'}
            </h3>
            <p className="text-sm text-gray-600">
              Supports JPG, PNG, and PDF files up to 10MB
            </p>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">File validation errors:</h3>
                  <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Upload Error */}
          {uploadError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700">{uploadError}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        // File Preview Section
        <div className="space-y-6">
          {/* Preview */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Preview</h3>
            <div className="flex items-start space-x-4">
              {/* Image/File Preview */}
              <div className="flex-shrink-0">
                {uploadedFile.type === 'application/pdf' ? (
                  <div className="w-24 h-32 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                ) : (
                  <img
                    src={uploadedFile.preview}
                    alt="Prescription preview"
                    className="w-24 h-32 object-cover rounded-lg border"
                  />
                )}
              </div>

              {/* File Info */}
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{uploadedFile.name}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {formatFileSize(uploadedFile.size)} • {uploadedFile.type}
                </p>
                <button
                  onClick={handleClearFile}
                  className="text-sm text-red-600 hover:text-red-800 mt-2"
                >
                  Remove file
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={handleClearFile}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Choose Different File
            </button>
            {isUploading ? (
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleCancelUpload}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel Upload
                </button>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">{uploadProgress}%</span>
                </div>
              </div>
            ) : (
              <button
                onClick={handleUpload}
                className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Prescription
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,application/pdf"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="hidden"
      />
    </div>
  );
}; 