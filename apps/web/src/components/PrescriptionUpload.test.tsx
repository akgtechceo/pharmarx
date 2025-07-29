import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PrescriptionUpload } from './PrescriptionUpload';
import { useAuthStore } from '../stores/authStore';
import { validatePrescriptionFile } from '@pharmarx/shared-types';

// Mock the auth store
vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn()
}));

// Mock the validation function
vi.mock('@pharmarx/shared-types', () => ({
  validatePrescriptionFile: vi.fn(),
  PrescriptionOrderStatus: {},
  MedicationDetails: {},
  PrescriptionOrder: {},
  CreatePrescriptionOrderInput: {},
  UploadedFile: {},
  FileUploadResult: {},
  FileValidationResult: {}
}));

// Mock File and FileReader
global.FileReader = vi.fn(() => ({
  readAsDataURL: vi.fn(),
  onload: null,
  onerror: null,
  result: 'data:image/jpeg;base64,mockbase64data'
})) as any;

describe('PrescriptionUpload Component', () => {
  const mockUser = {
    uid: 'test-user-id',
    role: 'patient' as const,
    displayName: 'Test User',
    createdAt: new Date()
  };

  const mockOnUploadComplete = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as any).mockReturnValue({
      user: mockUser
    });
    (validatePrescriptionFile as any).mockReturnValue({
      isValid: true,
      errors: []
    });
  });

  describe('Initial Render', () => {
    it('should render upload options when no file is selected', () => {
      render(<PrescriptionUpload />);
      
      expect(screen.getByText('Upload Prescription')).toBeInTheDocument();
      expect(screen.getByText('Browse Files')).toBeInTheDocument();
      expect(screen.getByText('Take Photo')).toBeInTheDocument();
      expect(screen.getByText('Drag and drop your prescription')).toBeInTheDocument();
    });

    it('should render modal close button when isModal is true', () => {
      render(
        <PrescriptionUpload 
          isModal={true} 
          onCancel={mockOnCancel} 
        />
      );
      
      const closeButton = screen.getByRole('button', { name: '' });
      expect(closeButton).toBeInTheDocument();
      
      fireEvent.click(closeButton);
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('File Selection', () => {
    it('should handle file browse selection', async () => {
      render(<PrescriptionUpload />);
      
      const file = new File(['test content'], 'prescription.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
      
      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        result: 'data:image/jpeg;base64,mockdata',
        onload: null,
        onerror: null
      };
      (global.FileReader as any) = vi.fn(() => mockFileReader);
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      // Simulate FileReader onload
      mockFileReader.onload?.({ target: mockFileReader } as any);
      
      await waitFor(() => {
        expect(validatePrescriptionFile).toHaveBeenCalledWith(file);
      });
    });

    it('should handle drag and drop', async () => {
      render(<PrescriptionUpload />);
      
      const file = new File(['test content'], 'prescription.jpg', { type: 'image/jpeg' });
      const dropZone = screen.getByText('Drag and drop your prescription').closest('div');
      
      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        result: 'data:image/jpeg;base64,mockdata',
        onload: null,
        onerror: null
      };
      (global.FileReader as any) = vi.fn(() => mockFileReader);
      
      fireEvent.dragEnter(dropZone!);
      expect(screen.getByText('Drop your file here')).toBeInTheDocument();
      
      fireEvent.drop(dropZone!, {
        dataTransfer: { files: [file] }
      });
      
      // Simulate FileReader onload
      mockFileReader.onload?.({ target: mockFileReader } as any);
      
      await waitFor(() => {
        expect(validatePrescriptionFile).toHaveBeenCalledWith(file);
      });
    });
  });

  describe('File Validation', () => {
    it('should display validation errors for invalid files', async () => {
      (validatePrescriptionFile as any).mockReturnValue({
        isValid: false,
        errors: ['File must be an image (JPG, PNG) or PDF', 'File size must be less than 10MB']
      });

      render(<PrescriptionUpload />);
      
      const file = new File(['test content'], 'invalid.txt', { type: 'text/plain' });
      const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText('File validation errors:')).toBeInTheDocument();
        expect(screen.getByText('File must be an image (JPG, PNG) or PDF')).toBeInTheDocument();
        expect(screen.getByText('File size must be less than 10MB')).toBeInTheDocument();
      });
    });

    it('should clear validation errors when valid file is selected', async () => {
      // First render with invalid file
      (validatePrescriptionFile as any).mockReturnValue({
        isValid: false,
        errors: ['Invalid file']
      });

      const { rerender } = render(<PrescriptionUpload />);
      
      const file = new File(['test content'], 'invalid.txt', { type: 'text/plain' });
      const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText('Invalid file')).toBeInTheDocument();
      });

      // Now select valid file
      (validatePrescriptionFile as any).mockReturnValue({
        isValid: true,
        errors: []
      });

      const validFile = new File(['test content'], 'valid.jpg', { type: 'image/jpeg' });
      
      // Mock FileReader for valid file
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        result: 'data:image/jpeg;base64,mockdata',
        onload: null,
        onerror: null
      };
      (global.FileReader as any) = vi.fn(() => mockFileReader);
      
      fireEvent.change(fileInput, { target: { files: [validFile] } });
      
      // Simulate FileReader onload
      mockFileReader.onload?.({ target: mockFileReader } as any);
      
      await waitFor(() => {
        expect(screen.queryByText('Invalid file')).not.toBeInTheDocument();
      });
    });
  });

  describe('File Preview', () => {
    it('should show preview section when file is selected', async () => {
      render(<PrescriptionUpload />);
      
      const file = new File(['test content'], 'prescription.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
      
      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        result: 'data:image/jpeg;base64,mockdata',
        onload: null,
        onerror: null
      };
      (global.FileReader as any) = vi.fn(() => mockFileReader);
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      // Simulate FileReader onload
      mockFileReader.onload?.({ target: mockFileReader } as any);
      
      await waitFor(() => {
        expect(screen.getByText('Preview')).toBeInTheDocument();
        expect(screen.getByText('prescription.jpg')).toBeInTheDocument();
        expect(screen.getByText('Choose Different File')).toBeInTheDocument();
        expect(screen.getByText('Upload Prescription')).toBeInTheDocument();
      });
    });

    it('should display PDF placeholder for PDF files', async () => {
      render(<PrescriptionUpload />);
      
      const file = new File(['test content'], 'prescription.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText('prescription.pdf')).toBeInTheDocument();
      });
    });

    it('should handle file removal', async () => {
      render(<PrescriptionUpload />);
      
      const file = new File(['test content'], 'prescription.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
      
      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        result: 'data:image/jpeg;base64,mockdata',
        onload: null,
        onerror: null
      };
      (global.FileReader as any) = vi.fn(() => mockFileReader);
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      // Simulate FileReader onload
      mockFileReader.onload?.({ target: mockFileReader } as any);
      
      await waitFor(() => {
        expect(screen.getByText('prescription.jpg')).toBeInTheDocument();
      });
      
      const removeButton = screen.getByText('Remove file');
      fireEvent.click(removeButton);
      
      await waitFor(() => {
        expect(screen.queryByText('prescription.jpg')).not.toBeInTheDocument();
        expect(screen.getByText('Browse Files')).toBeInTheDocument();
      });
    });
  });

  describe('File Upload', () => {
    it('should handle successful upload', async () => {
      render(<PrescriptionUpload onUploadComplete={mockOnUploadComplete} />);
      
      const file = new File(['test content'], 'prescription.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
      
      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        result: 'data:image/jpeg;base64,mockdata',
        onload: null,
        onerror: null
      };
      (global.FileReader as any) = vi.fn(() => mockFileReader);
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      // Simulate FileReader onload
      mockFileReader.onload?.({ target: mockFileReader } as any);
      
      await waitFor(() => {
        expect(screen.getByText('Upload Prescription')).toBeInTheDocument();
      });
      
      const uploadButton = screen.getByText('Upload Prescription');
      fireEvent.click(uploadButton);
      
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
      
      // Wait for upload completion
      await waitFor(() => {
        expect(mockOnUploadComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            orderId: expect.stringContaining('order_'),
            patientProfileId: mockUser.uid,
            status: 'pending_verification'
          })
        );
      }, { timeout: 3000 });
    });

    it('should disable upload button when uploading', async () => {
      render(<PrescriptionUpload />);
      
      const file = new File(['test content'], 'prescription.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
      
      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        result: 'data:image/jpeg;base64,mockdata',
        onload: null,
        onerror: null
      };
      (global.FileReader as any) = vi.fn(() => mockFileReader);
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      // Simulate FileReader onload
      mockFileReader.onload?.({ target: mockFileReader } as any);
      
      await waitFor(() => {
        const uploadButton = screen.getByText('Upload Prescription');
        expect(uploadButton).not.toBeDisabled();
        
        fireEvent.click(uploadButton);
        
        const uploadingButton = screen.getByText('Uploading...');
        expect(uploadingButton).toBeDisabled();
      });
    });
  });

  describe('Camera Functionality', () => {
    it('should handle camera capture', async () => {
      render(<PrescriptionUpload />);
      
      const cameraButton = screen.getByText('Take Photo');
      fireEvent.click(cameraButton);
      
      // Camera input should have capture attribute
      const cameraInput = screen.getByDisplayValue('') as HTMLInputElement;
      expect(cameraInput.getAttribute('capture')).toBe('environment');
      expect(cameraInput.getAttribute('accept')).toBe('image/*');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<PrescriptionUpload />);
      
      const browseButton = screen.getByText('Browse Files');
      const cameraButton = screen.getByText('Take Photo');
      
      expect(browseButton.closest('button')).toBeInTheDocument();
      expect(cameraButton.closest('button')).toBeInTheDocument();
    });

    it('should handle keyboard navigation', () => {
      render(<PrescriptionUpload />);
      
      const browseButton = screen.getByText('Browse Files').closest('button');
      const cameraButton = screen.getByText('Take Photo').closest('button');
      
      expect(browseButton).toHaveAttribute('type', undefined);
      expect(cameraButton).toHaveAttribute('type', undefined);
    });
  });
}); 