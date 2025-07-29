import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PharmacistQueue } from '../components/PharmacistQueue';
import { usePharmacistQueue } from '../hooks/usePharmacistQueue';
import { PrescriptionOrder } from '@pharmarx/shared-types';

// Mock the hook
vi.mock('../hooks/usePharmacistQueue');
const mockUsePharmacistQueue = vi.mocked(usePharmacistQueue);

// Mock data
const mockOrders: PrescriptionOrder[] = [
  {
    orderId: 'order-123',
    patientProfileId: 'patient-abc',
    status: 'awaiting_verification',
    originalImageUrl: 'https://example.com/image1.jpg',
    extractedText: 'Prescription text 1',
    ocrStatus: 'completed',
    ocrConfidence: 0.95,
    medicationDetails: {
      name: 'Amoxicillin',
      dosage: '500mg',
      quantity: 30
    },
    userVerified: true,
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-01T10:30:00Z')
  },
  {
    orderId: 'order-456',
    patientProfileId: 'patient-xyz',
    status: 'awaiting_verification',
    originalImageUrl: 'https://example.com/image2.jpg',
    extractedText: 'Prescription text 2',
    ocrStatus: 'completed',
    ocrConfidence: 0.87,
    medicationDetails: {
      name: 'Lisinopril',
      dosage: '10mg',
      quantity: 90
    },
    userVerified: true,
    createdAt: new Date('2025-01-02T14:00:00Z'),
    updatedAt: new Date('2025-01-02T14:15:00Z')
  }
];

const mockHookReturnValue = {
  orders: mockOrders,
  isLoading: false,
  error: null,
  filters: {},
  sort: { field: 'createdAt' as const, direction: 'desc' as const },
  currentPage: 1,
  totalPages: 1,
  totalOrders: 2,
  updateFilters: vi.fn(),
  clearFilters: vi.fn(),
  updateSort: vi.fn(),
  goToPage: vi.fn(),
  refreshQueue: vi.fn(),
  updateOrderInQueue: vi.fn(),
  removeOrderFromQueue: vi.fn()
};

describe('PharmacistQueue', () => {
  beforeEach(() => {
    mockUsePharmacistQueue.mockReturnValue(mockHookReturnValue);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the queue title and order count', () => {
      render(<PharmacistQueue />);
      
      expect(screen.getByText('Prescription Queue')).toBeInTheDocument();
      expect(screen.getByText('2 prescriptions awaiting verification')).toBeInTheDocument();
    });

    it('renders the refresh button', () => {
      render(<PharmacistQueue />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();
      expect(refreshButton).not.toBeDisabled();
    });

    it('renders filter inputs', () => {
      render(<PharmacistQueue />);
      
      expect(screen.getByPlaceholderText('Search by patient name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search by medication')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument(); // Urgency dropdown
      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
    });

    it('renders table headers with sort indicators', () => {
      render(<PharmacistQueue />);
      
      expect(screen.getByText(/patient ↓/i)).toBeInTheDocument(); // Default sort by createdAt
      expect(screen.getByText(/medication ↕️/i)).toBeInTheDocument();
      expect(screen.getByText(/submitted ↓/i)).toBeInTheDocument();
      expect(screen.getByText(/urgency ↕️/i)).toBeInTheDocument();
      expect(screen.getByText(/ocr status/i)).toBeInTheDocument();
    });
  });

  describe('Order Display', () => {
    it('displays order information correctly', () => {
      render(<PharmacistQueue />);
      
      // Check first order
      expect(screen.getByText('Patient #patient-')).toBeInTheDocument();
      expect(screen.getByText('ID: order-12...')).toBeInTheDocument();
      expect(screen.getByText('Amoxicillin')).toBeInTheDocument();
      expect(screen.getByText('500mg • Qty: 30')).toBeInTheDocument();
      
      // Check second order
      expect(screen.getByText('Patient #patient-')).toBeInTheDocument();
      expect(screen.getByText('Lisinopril')).toBeInTheDocument();
      expect(screen.getByText('10mg • Qty: 90')).toBeInTheDocument();
    });

    it('displays OCR status badges with correct colors', () => {
      render(<PharmacistQueue />);
      
      const ocrBadges = screen.getAllByText('completed');
      expect(ocrBadges).toHaveLength(2);
      ocrBadges.forEach(badge => {
        expect(badge).toHaveClass('bg-green-100', 'text-green-800');
      });
    });

    it('displays urgency badges based on submission time', () => {
      render(<PharmacistQueue />);
      
      // Both orders should show urgency badges (colors depend on current time vs creation time)
      const urgencyBadges = screen.getAllByText(/high|medium|low/);
      expect(urgencyBadges.length).toBeGreaterThanOrEqual(2);
    });

    it('renders review buttons for each order', () => {
      render(<PharmacistQueue />);
      
      const reviewButtons = screen.getAllByText('Review');
      expect(reviewButtons).toHaveLength(2);
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      mockUsePharmacistQueue.mockReturnValue({
        ...mockHookReturnValue,
        isLoading: true
      });

      render(<PharmacistQueue />);
      
      expect(screen.getByText('Loading prescriptions...')).toBeInTheDocument();
      expect(screen.getByText('Refreshing...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no orders', () => {
      mockUsePharmacistQueue.mockReturnValue({
        ...mockHookReturnValue,
        orders: [],
        totalOrders: 0
      });

      render(<PharmacistQueue />);
      
      expect(screen.getByText('No prescriptions in queue')).toBeInTheDocument();
      expect(screen.getByText('All prescriptions have been processed or no new submissions.')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error message and retry button', () => {
      const errorMessage = 'Failed to fetch orders';
      mockUsePharmacistQueue.mockReturnValue({
        ...mockHookReturnValue,
        error: errorMessage
      });

      render(<PharmacistQueue />);
      
      expect(screen.getByText('Error loading prescription queue')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      
      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('calls refreshQueue when retry button is clicked', () => {
      mockUsePharmacistQueue.mockReturnValue({
        ...mockHookReturnValue,
        error: 'Some error'
      });

      render(<PharmacistQueue />);
      
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);
      
      expect(mockHookReturnValue.refreshQueue).toHaveBeenCalledTimes(1);
    });
  });

  describe('Filtering', () => {
    it('calls updateFilters when patient name filter changes', () => {
      render(<PharmacistQueue />);
      
      const patientNameInput = screen.getByPlaceholderText('Search by patient name');
      fireEvent.change(patientNameInput, { target: { value: 'John Doe' } });
      
      expect(mockHookReturnValue.updateFilters).toHaveBeenCalledWith({ patientName: 'John Doe' });
    });

    it('calls updateFilters when medication filter changes', () => {
      render(<PharmacistQueue />);
      
      const medicationInput = screen.getByPlaceholderText('Search by medication');
      fireEvent.change(medicationInput, { target: { value: 'Amoxicillin' } });
      
      expect(mockHookReturnValue.updateFilters).toHaveBeenCalledWith({ medicationType: 'Amoxicillin' });
    });

    it('calls updateFilters when urgency filter changes', () => {
      render(<PharmacistQueue />);
      
      const urgencySelect = screen.getByRole('combobox');
      fireEvent.change(urgencySelect, { target: { value: 'high' } });
      
      expect(mockHookReturnValue.updateFilters).toHaveBeenCalledWith({ urgency: 'high' });
    });

    it('calls clearFilters when clear button is clicked', () => {
      render(<PharmacistQueue />);
      
      const clearButton = screen.getByRole('button', { name: /clear filters/i });
      fireEvent.click(clearButton);
      
      expect(mockHookReturnValue.clearFilters).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sorting', () => {
    it('calls updateSort when column headers are clicked', () => {
      render(<PharmacistQueue />);
      
      const patientHeader = screen.getByText(/patient/i);
      fireEvent.click(patientHeader);
      
      expect(mockHookReturnValue.updateSort).toHaveBeenCalledWith({
        field: 'patientName',
        direction: 'asc'
      });
    });

    it('toggles sort direction when clicking same column', () => {
      mockUsePharmacistQueue.mockReturnValue({
        ...mockHookReturnValue,
        sort: { field: 'patientName', direction: 'asc' }
      });

      render(<PharmacistQueue />);
      
      const patientHeader = screen.getByText(/patient ↑/i);
      fireEvent.click(patientHeader);
      
      expect(mockHookReturnValue.updateSort).toHaveBeenCalledWith({
        field: 'patientName',
        direction: 'desc'
      });
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      mockUsePharmacistQueue.mockReturnValue({
        ...mockHookReturnValue,
        currentPage: 2,
        totalPages: 5
      });
    });

    it('renders pagination when multiple pages exist', () => {
      render(<PharmacistQueue />);
      
      expect(screen.getByText('Showing page 2 of 5')).toBeInTheDocument();
      
      const prevButton = screen.getByRole('button', { name: /previous/i });
      const nextButton = screen.getByRole('button', { name: /next/i });
      
      expect(prevButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();
      expect(prevButton).not.toBeDisabled();
      expect(nextButton).not.toBeDisabled();
    });

    it('calls goToPage when pagination buttons are clicked', () => {
      render(<PharmacistQueue />);
      
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);
      
      expect(mockHookReturnValue.goToPage).toHaveBeenCalledWith(3);
    });

    it('disables prev button on first page', () => {
      mockUsePharmacistQueue.mockReturnValue({
        ...mockHookReturnValue,
        currentPage: 1,
        totalPages: 5
      });

      render(<PharmacistQueue />);
      
      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toBeDisabled();
    });

    it('disables next button on last page', () => {
      mockUsePharmacistQueue.mockReturnValue({
        ...mockHookReturnValue,
        currentPage: 5,
        totalPages: 5
      });

      render(<PharmacistQueue />);
      
      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });
  });

  describe('Review Modal', () => {
    it('opens review modal when review button is clicked', async () => {
      render(<PharmacistQueue />);
      
      const reviewButtons = screen.getAllByText('Review');
      fireEvent.click(reviewButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText(/Review Prescription - Order order-12/)).toBeInTheDocument();
        expect(screen.getByText('PrescriptionReview component will be implemented in Task 2.')).toBeInTheDocument();
      });
    });

    it('closes review modal when close button is clicked', async () => {
      render(<PharmacistQueue />);
      
      const reviewButtons = screen.getAllByText('Review');
      fireEvent.click(reviewButtons[0]);
      
      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        fireEvent.click(closeButton);
      });
      
      await waitFor(() => {
        expect(screen.queryByText(/Review Prescription/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('calls refreshQueue when refresh button is clicked', () => {
      render(<PharmacistQueue />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);
      
      expect(mockHookReturnValue.refreshQueue).toHaveBeenCalledTimes(1);
    });

    it('disables refresh button when loading', () => {
      mockUsePharmacistQueue.mockReturnValue({
        ...mockHookReturnValue,
        isLoading: true
      });

      render(<PharmacistQueue />);
      
      const refreshButton = screen.getByRole('button', { name: /refreshing/i });
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Custom className', () => {
    it('applies custom className to the component', () => {
      const { container } = render(<PharmacistQueue className="custom-class" />);
      
      const queueComponent = container.firstChild as Element;
      expect(queueComponent).toHaveClass('custom-class');
    });
  });
});