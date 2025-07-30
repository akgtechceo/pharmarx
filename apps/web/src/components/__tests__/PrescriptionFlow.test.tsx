import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PrescriptionFlow } from '../PrescriptionFlow';
import { PrescriptionOrder } from '@pharmarx/shared-types';

// Mock the auth store
vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({
    user: { uid: 'test-user-id' }
  })
}));

// Mock the pharmacy selection service
vi.mock('../../services/pharmacySelectionService', () => ({
  pharmacySelectionService: {
    selectPharmacy: vi.fn()
  }
}));

// Mock the PrescriptionUpload component
vi.mock('../PrescriptionUpload', () => ({
  PrescriptionUpload: ({ onUploadComplete }: { onUploadComplete: (order: PrescriptionOrder) => void }) => (
    <div data-testid="prescription-upload">
      <button onClick={() => onUploadComplete(mockOrder)}>Complete Upload</button>
    </div>
  )
}));

// Mock the PharmacySelectionStep component
vi.mock('../../features/prescriptions/components/PharmacySelectionStep', () => ({
  default: ({ onPharmacySelect, onSkip }: { onPharmacySelect: (id: string) => void; onSkip: () => void }) => (
    <div data-testid="pharmacy-selection-step">
      <button onClick={() => onPharmacySelect('pharmacy-1')}>Select Pharmacy</button>
      <button onClick={onSkip}>Skip Selection</button>
    </div>
  )
}));

const mockOrder: PrescriptionOrder = {
  orderId: 'order-123',
  patientProfileId: 'patient-123',
  status: 'pending_verification',
  originalImageUrl: 'https://example.com/image.jpg',
  extractedText: 'Prescription for Metformin',
  ocrStatus: 'completed',
  ocrProcessedAt: new Date(),
  medicationDetails: {
    name: 'Metformin',
    dosage: '500mg',
    quantity: 30
  },
  cost: 25.99,
  createdAt: new Date(),
  updatedAt: new Date()
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MemoryRouter>
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  </MemoryRouter>
);

describe('PrescriptionFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload step initially', () => {
    render(
      <TestWrapper>
        <PrescriptionFlow />
      </TestWrapper>
    );

    expect(screen.getByTestId('prescription-upload')).toBeInTheDocument();
    expect(screen.getByText('Upload Prescription')).toBeInTheDocument();
  });

  it('shows step indicator with correct progress', () => {
    render(
      <TestWrapper>
        <PrescriptionFlow />
      </TestWrapper>
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Upload Prescription')).toBeInTheDocument();
    expect(screen.getByText('Select Pharmacy')).toBeInTheDocument();
    expect(screen.getByText('Review & Confirm')).toBeInTheDocument();
  });

  it('transitions to pharmacy selection after upload', async () => {
    render(
      <TestWrapper>
        <PrescriptionFlow />
      </TestWrapper>
    );

    // Complete upload
    fireEvent.click(screen.getByText('Complete Upload'));

    await waitFor(() => {
      expect(screen.getByTestId('pharmacy-selection-step')).toBeInTheDocument();
    });
  });

  it('transitions to verification after pharmacy selection', async () => {
    render(
      <TestWrapper>
        <PrescriptionFlow />
      </TestWrapper>
    );

    // Complete upload
    fireEvent.click(screen.getByText('Complete Upload'));

    await waitFor(() => {
      expect(screen.getByTestId('pharmacy-selection-step')).toBeInTheDocument();
    });

    // Select pharmacy
    fireEvent.click(screen.getByText('Select Pharmacy'));

    await waitFor(() => {
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
    });
  });

  it('allows skipping pharmacy selection', async () => {
    render(
      <TestWrapper>
        <PrescriptionFlow />
      </TestWrapper>
    );

    // Complete upload
    fireEvent.click(screen.getByText('Complete Upload'));

    await waitFor(() => {
      expect(screen.getByTestId('pharmacy-selection-step')).toBeInTheDocument();
    });

    // Skip pharmacy selection
    fireEvent.click(screen.getByText('Skip Selection'));

    await waitFor(() => {
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
    });
  });

  it('allows going back to upload from pharmacy selection', async () => {
    render(
      <TestWrapper>
        <PrescriptionFlow />
      </TestWrapper>
    );

    // Complete upload
    fireEvent.click(screen.getByText('Complete Upload'));

    await waitFor(() => {
      expect(screen.getByTestId('pharmacy-selection-step')).toBeInTheDocument();
    });

    // Go back to upload
    fireEvent.click(screen.getByText('Back to Upload'));

    await waitFor(() => {
      expect(screen.getByTestId('prescription-upload')).toBeInTheDocument();
    });
  });

  it('allows going back to pharmacy selection from verification', async () => {
    render(
      <TestWrapper>
        <PrescriptionFlow />
      </TestWrapper>
    );

    // Complete upload
    fireEvent.click(screen.getByText('Complete Upload'));

    await waitFor(() => {
      expect(screen.getByTestId('pharmacy-selection-step')).toBeInTheDocument();
    });

    // Select pharmacy
    fireEvent.click(screen.getByText('Select Pharmacy'));

    await waitFor(() => {
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
    });

    // Go back to pharmacy selection
    fireEvent.click(screen.getByText('Back to Pharmacy Selection'));

    await waitFor(() => {
      expect(screen.getByTestId('pharmacy-selection-step')).toBeInTheDocument();
    });
  });

  it('displays order summary in verification step', async () => {
    render(
      <TestWrapper>
        <PrescriptionFlow />
      </TestWrapper>
    );

    // Complete upload
    fireEvent.click(screen.getByText('Complete Upload'));

    await waitFor(() => {
      expect(screen.getByTestId('pharmacy-selection-step')).toBeInTheDocument();
    });

    // Select pharmacy
    fireEvent.click(screen.getByText('Select Pharmacy'));

    await waitFor(() => {
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
      expect(screen.getByText('Order ID: order-123')).toBeInTheDocument();
      expect(screen.getByText('Medication: Metformin 500mg')).toBeInTheDocument();
      expect(screen.getByText('Quantity: 30 units')).toBeInTheDocument();
      expect(screen.getByText('Cost: $25.99')).toBeInTheDocument();
    });
  });
});