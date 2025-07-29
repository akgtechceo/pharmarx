import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrescriptionForm } from './PrescriptionForm';
import { PatientSearchResult } from '@pharmarx/shared-types';

// Mock the usePrescriptionSubmission hook
vi.mock('../hooks/usePrescriptionSubmission', () => ({
  usePrescriptionSubmission: vi.fn()
}));

const mockUsePrescriptionSubmission = vi.mocked(require('../hooks/usePrescriptionSubmission').usePrescriptionSubmission);

const mockPatient: PatientSearchResult = {
  profileId: 'patient-1',
  patientName: 'John Doe',
  dateOfBirth: new Date('1990-01-01'),
  phoneNumber: '+1234567890',
  email: 'john.doe@example.com'
};

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('PrescriptionForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render form fields for prescription submission', () => {
    mockUsePrescriptionSubmission.mockReturnValue({
      submitPrescription: vi.fn(),
      isLoading: false,
      error: null
    });

    renderWithQueryClient(
      <PrescriptionForm 
        selectedPatient={mockPatient}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    expect(screen.getByLabelText('Medication Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Dosage *')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantity *')).toBeInTheDocument();
    expect(screen.getByLabelText('Instructions *')).toBeInTheDocument();
    expect(screen.getByLabelText('Refills Authorized *')).toBeInTheDocument();
    expect(screen.getByLabelText('Prescription Notes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Prescription' })).toBeInTheDocument();
  });

  it('should display selected patient information', () => {
    mockUsePrescriptionSubmission.mockReturnValue({
      submitPrescription: vi.fn(),
      isLoading: false,
      error: null
    });

    renderWithQueryClient(
      <PrescriptionForm 
        selectedPatient={mockPatient}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('+1234567890')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
  });

  it('should validate required fields on submission', async () => {
    const mockSubmitPrescription = vi.fn();
    mockUsePrescriptionSubmission.mockReturnValue({
      submitPrescription: mockSubmitPrescription,
      isLoading: false,
      error: null
    });

    renderWithQueryClient(
      <PrescriptionForm 
        selectedPatient={mockPatient}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    const submitButton = screen.getByRole('button', { name: 'Submit Prescription' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Medication name is required')).toBeInTheDocument();
      expect(screen.getByText('Dosage is required')).toBeInTheDocument();
      expect(screen.getByText('Quantity is required')).toBeInTheDocument();
      expect(screen.getByText('Instructions are required')).toBeInTheDocument();
      expect(screen.getByText('Refills authorized is required')).toBeInTheDocument();
    });

    expect(mockSubmitPrescription).not.toHaveBeenCalled();
  });

  it('should submit form with valid data', async () => {
    const mockSubmitPrescription = vi.fn();
    mockUsePrescriptionSubmission.mockReturnValue({
      submitPrescription: mockSubmitPrescription,
      isLoading: false,
      error: null
    });

    renderWithQueryClient(
      <PrescriptionForm 
        selectedPatient={mockPatient}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    // Fill in required fields
    fireEvent.change(screen.getByLabelText('Medication Name *'), {
      target: { value: 'Amoxicillin 500mg' }
    });
    fireEvent.change(screen.getByLabelText('Dosage *'), {
      target: { value: '500mg, twice daily' }
    });
    fireEvent.change(screen.getByLabelText('Quantity *'), {
      target: { value: '20' }
    });
    fireEvent.change(screen.getByLabelText('Instructions *'), {
      target: { value: 'Take with food' }
    });
    fireEvent.change(screen.getByLabelText('Refills Authorized *'), {
      target: { value: '2' }
    });

    const submitButton = screen.getByRole('button', { name: 'Submit Prescription' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubmitPrescription).toHaveBeenCalledWith({
        patientProfileId: 'patient-1',
        medicationDetails: {
          name: 'Amoxicillin 500mg',
          dosage: '500mg, twice daily',
          quantity: 20,
          instructions: 'Take with food',
          refillsAuthorized: 2
        },
        prescriptionNotes: ''
      });
    });
  });

  it('should handle form submission with notes', async () => {
    const mockSubmitPrescription = vi.fn();
    mockUsePrescriptionSubmission.mockReturnValue({
      submitPrescription: mockSubmitPrescription,
      isLoading: false,
      error: null
    });

    renderWithQueryClient(
      <PrescriptionForm 
        selectedPatient={mockPatient}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    // Fill in required fields
    fireEvent.change(screen.getByLabelText('Medication Name *'), {
      target: { value: 'Amoxicillin 500mg' }
    });
    fireEvent.change(screen.getByLabelText('Dosage *'), {
      target: { value: '500mg, twice daily' }
    });
    fireEvent.change(screen.getByLabelText('Quantity *'), {
      target: { value: '20' }
    });
    fireEvent.change(screen.getByLabelText('Instructions *'), {
      target: { value: 'Take with food' }
    });
    fireEvent.change(screen.getByLabelText('Refills Authorized *'), {
      target: { value: '2' }
    });
    fireEvent.change(screen.getByLabelText('Prescription Notes'), {
      target: { value: 'Take as prescribed by doctor' }
    });

    const submitButton = screen.getByRole('button', { name: 'Submit Prescription' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubmitPrescription).toHaveBeenCalledWith({
        patientProfileId: 'patient-1',
        medicationDetails: {
          name: 'Amoxicillin 500mg',
          dosage: '500mg, twice daily',
          quantity: 20,
          instructions: 'Take with food',
          refillsAuthorized: 2
        },
        prescriptionNotes: 'Take as prescribed by doctor'
      });
    });
  });

  it('should display loading state during submission', () => {
    mockUsePrescriptionSubmission.mockReturnValue({
      submitPrescription: vi.fn(),
      isLoading: true,
      error: null
    });

    renderWithQueryClient(
      <PrescriptionForm 
        selectedPatient={mockPatient}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    expect(screen.getByText('Submitting...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submitting...' })).toBeDisabled();
  });

  it('should display error message from submission', () => {
    mockUsePrescriptionSubmission.mockReturnValue({
      submitPrescription: vi.fn(),
      isLoading: false,
      error: 'Failed to submit prescription'
    });

    renderWithQueryClient(
      <PrescriptionForm 
        selectedPatient={mockPatient}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    expect(screen.getByText('Failed to submit prescription')).toBeInTheDocument();
  });

  it('should validate quantity is a positive number', async () => {
    mockUsePrescriptionSubmission.mockReturnValue({
      submitPrescription: vi.fn(),
      isLoading: false,
      error: null
    });

    renderWithQueryClient(
      <PrescriptionForm 
        selectedPatient={mockPatient}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    // Fill in other required fields
    fireEvent.change(screen.getByLabelText('Medication Name *'), {
      target: { value: 'Amoxicillin 500mg' }
    });
    fireEvent.change(screen.getByLabelText('Dosage *'), {
      target: { value: '500mg, twice daily' }
    });
    fireEvent.change(screen.getByLabelText('Instructions *'), {
      target: { value: 'Take with food' }
    });
    fireEvent.change(screen.getByLabelText('Refills Authorized *'), {
      target: { value: '2' }
    });

    // Test invalid quantity
    fireEvent.change(screen.getByLabelText('Quantity *'), {
      target: { value: '-5' }
    });

    const submitButton = screen.getByRole('button', { name: 'Submit Prescription' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Quantity must be a positive number')).toBeInTheDocument();
    });
  });

  it('should validate refills is a non-negative number', async () => {
    mockUsePrescriptionSubmission.mockReturnValue({
      submitPrescription: vi.fn(),
      isLoading: false,
      error: null
    });

    renderWithQueryClient(
      <PrescriptionForm 
        selectedPatient={mockPatient}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    // Fill in other required fields
    fireEvent.change(screen.getByLabelText('Medication Name *'), {
      target: { value: 'Amoxicillin 500mg' }
    });
    fireEvent.change(screen.getByLabelText('Dosage *'), {
      target: { value: '500mg, twice daily' }
    });
    fireEvent.change(screen.getByLabelText('Quantity *'), {
      target: { value: '20' }
    });
    fireEvent.change(screen.getByLabelText('Instructions *'), {
      target: { value: 'Take with food' }
    });

    // Test invalid refills
    fireEvent.change(screen.getByLabelText('Refills Authorized *'), {
      target: { value: '-1' }
    });

    const submitButton = screen.getByRole('button', { name: 'Submit Prescription' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Refills must be a non-negative number')).toBeInTheDocument();
    });
  });

  it('should reset form after successful submission', async () => {
    const mockSubmitPrescription = vi.fn().mockResolvedValue(undefined);
    mockUsePrescriptionSubmission.mockReturnValue({
      submitPrescription: mockSubmitPrescription,
      isLoading: false,
      error: null
    });

    renderWithQueryClient(
      <PrescriptionForm 
        selectedPatient={mockPatient}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    // Fill in required fields
    fireEvent.change(screen.getByLabelText('Medication Name *'), {
      target: { value: 'Amoxicillin 500mg' }
    });
    fireEvent.change(screen.getByLabelText('Dosage *'), {
      target: { value: '500mg, twice daily' }
    });
    fireEvent.change(screen.getByLabelText('Quantity *'), {
      target: { value: '20' }
    });
    fireEvent.change(screen.getByLabelText('Instructions *'), {
      target: { value: 'Take with food' }
    });
    fireEvent.change(screen.getByLabelText('Refills Authorized *'), {
      target: { value: '2' }
    });

    const submitButton = screen.getByRole('button', { name: 'Submit Prescription' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubmitPrescription).toHaveBeenCalled();
    });

    // Check that form is reset
    expect(screen.getByLabelText('Medication Name *')).toHaveValue('');
    expect(screen.getByLabelText('Dosage *')).toHaveValue('');
    expect(screen.getByLabelText('Quantity *')).toHaveValue('');
    expect(screen.getByLabelText('Instructions *')).toHaveValue('');
    expect(screen.getByLabelText('Refills Authorized *')).toHaveValue('');
    expect(screen.getByLabelText('Prescription Notes')).toHaveValue('');
  });

  it('should call onSuccess callback after successful submission', async () => {
    const mockSubmitPrescription = vi.fn().mockResolvedValue(undefined);
    mockUsePrescriptionSubmission.mockReturnValue({
      submitPrescription: mockSubmitPrescription,
      isLoading: false,
      error: null
    });

    renderWithQueryClient(
      <PrescriptionForm 
        selectedPatient={mockPatient}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    // Fill in required fields
    fireEvent.change(screen.getByLabelText('Medication Name *'), {
      target: { value: 'Amoxicillin 500mg' }
    });
    fireEvent.change(screen.getByLabelText('Dosage *'), {
      target: { value: '500mg, twice daily' }
    });
    fireEvent.change(screen.getByLabelText('Quantity *'), {
      target: { value: '20' }
    });
    fireEvent.change(screen.getByLabelText('Instructions *'), {
      target: { value: 'Take with food' }
    });
    fireEvent.change(screen.getByLabelText('Refills Authorized *'), {
      target: { value: '2' }
    });

    const submitButton = screen.getByRole('button', { name: 'Submit Prescription' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should call onError callback when submission fails', async () => {
    const mockSubmitPrescription = vi.fn().mockRejectedValue(new Error('Submission failed'));
    mockUsePrescriptionSubmission.mockReturnValue({
      submitPrescription: mockSubmitPrescription,
      isLoading: false,
      error: null
    });

    renderWithQueryClient(
      <PrescriptionForm 
        selectedPatient={mockPatient}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    // Fill in required fields
    fireEvent.change(screen.getByLabelText('Medication Name *'), {
      target: { value: 'Amoxicillin 500mg' }
    });
    fireEvent.change(screen.getByLabelText('Dosage *'), {
      target: { value: '500mg, twice daily' }
    });
    fireEvent.change(screen.getByLabelText('Quantity *'), {
      target: { value: '20' }
    });
    fireEvent.change(screen.getByLabelText('Instructions *'), {
      target: { value: 'Take with food' }
    });
    fireEvent.change(screen.getByLabelText('Refills Authorized *'), {
      target: { value: '2' }
    });

    const submitButton = screen.getByRole('button', { name: 'Submit Prescription' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalled();
    });
  });

  it('should not render form when no patient is selected', () => {
    mockUsePrescriptionSubmission.mockReturnValue({
      submitPrescription: vi.fn(),
      isLoading: false,
      error: null
    });

    renderWithQueryClient(
      <PrescriptionForm 
        selectedPatient={null}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    expect(screen.getByText('Please select a patient to submit a prescription')).toBeInTheDocument();
    expect(screen.queryByLabelText('Medication Name *')).not.toBeInTheDocument();
  });
});