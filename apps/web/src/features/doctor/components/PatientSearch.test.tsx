import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PatientSearch } from './PatientSearch';
import { PatientSearchResult } from '@pharmarx/shared-types';

// Mock the usePatientSearch hook
vi.mock('../hooks/usePatientSearch', () => ({
  usePatientSearch: vi.fn()
}));

const mockUsePatientSearch = vi.mocked(require('../hooks/usePatientSearch').usePatientSearch);

const mockPatients: PatientSearchResult[] = [
  {
    profileId: 'patient-1',
    patientName: 'John Doe',
    dateOfBirth: new Date('1990-01-01'),
    phoneNumber: '+1234567890',
    email: 'john.doe@example.com',
    insuranceDetails: {
      provider: 'Blue Cross',
      policyNumber: 'BC123456'
    }
  },
  {
    profileId: 'patient-2',
    patientName: 'Jane Smith',
    dateOfBirth: new Date('1985-05-15'),
    phoneNumber: '+1987654321',
    email: 'jane.smith@example.com'
  }
];

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

describe('PatientSearch', () => {
  const mockOnPatientSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render search input and filters', () => {
    mockUsePatientSearch.mockReturnValue({
      patients: [],
      isLoading: false,
      error: null,
      searchPatients: vi.fn()
    });

    renderWithQueryClient(
      <PatientSearch onPatientSelect={mockOnPatientSelect} />
    );

    expect(screen.getByPlaceholderText('Search patients...')).toBeInTheDocument();
    expect(screen.getByLabelText('Search by:')).toBeInTheDocument();
    expect(screen.getByDisplayValue('all')).toBeInTheDocument();
  });

  it('should display loading state', () => {
    mockUsePatientSearch.mockReturnValue({
      patients: [],
      isLoading: true,
      error: null,
      searchPatients: vi.fn()
    });

    renderWithQueryClient(
      <PatientSearch onPatientSelect={mockOnPatientSelect} />
    );

    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  it('should display error state', () => {
    mockUsePatientSearch.mockReturnValue({
      patients: [],
      isLoading: false,
      error: 'Failed to search patients',
      searchPatients: vi.fn()
    });

    renderWithQueryClient(
      <PatientSearch onPatientSelect={mockOnPatientSelect} />
    );

    expect(screen.getByText('Failed to search patients')).toBeInTheDocument();
  });

  it('should display patient search results', () => {
    mockUsePatientSearch.mockReturnValue({
      patients: mockPatients,
      isLoading: false,
      error: null,
      searchPatients: vi.fn()
    });

    renderWithQueryClient(
      <PatientSearch onPatientSelect={mockOnPatientSelect} />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('+1234567890')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
  });

  it('should call onPatientSelect when patient is clicked', () => {
    mockUsePatientSearch.mockReturnValue({
      patients: mockPatients,
      isLoading: false,
      error: null,
      searchPatients: vi.fn()
    });

    renderWithQueryClient(
      <PatientSearch onPatientSelect={mockOnPatientSelect} />
    );

    const patientCard = screen.getByText('John Doe').closest('div');
    fireEvent.click(patientCard!);

    expect(mockOnPatientSelect).toHaveBeenCalledWith(mockPatients[0]);
  });

  it('should handle search input changes', async () => {
    const mockSearchPatients = vi.fn();
    mockUsePatientSearch.mockReturnValue({
      patients: [],
      isLoading: false,
      error: null,
      searchPatients: mockSearchPatients
    });

    renderWithQueryClient(
      <PatientSearch onPatientSelect={mockOnPatientSelect} />
    );

    const searchInput = screen.getByPlaceholderText('Search patients...');
    fireEvent.change(searchInput, { target: { value: 'John' } });

    await waitFor(() => {
      expect(mockSearchPatients).toHaveBeenCalledWith('John');
    });
  });

  it('should handle search type changes', async () => {
    const mockSearchPatients = vi.fn();
    mockUsePatientSearch.mockReturnValue({
      patients: [],
      isLoading: false,
      error: null,
      searchPatients: mockSearchPatients
    });

    renderWithQueryClient(
      <PatientSearch onPatientSelect={mockOnPatientSelect} />
    );

    const searchTypeSelect = screen.getByLabelText('Search by:');
    fireEvent.change(searchTypeSelect, { target: { value: 'name' } });

    await waitFor(() => {
      expect(mockSearchPatients).toHaveBeenCalledWith('', 'name');
    });
  });

  it('should display patient age correctly', () => {
    const patientsWithAge = [
      {
        ...mockPatients[0],
        dateOfBirth: new Date('1990-01-01')
      }
    ];

    mockUsePatientSearch.mockReturnValue({
      patients: patientsWithAge,
      isLoading: false,
      error: null,
      searchPatients: vi.fn()
    });

    renderWithQueryClient(
      <PatientSearch onPatientSelect={mockOnPatientSelect} />
    );

    // Calculate expected age
    const today = new Date();
    const birthDate = new Date('1990-01-01');
    const expectedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
      ? expectedAge - 1 
      : expectedAge;

    expect(screen.getByText(`${actualAge} years old`)).toBeInTheDocument();
  });

  it('should display insurance information when available', () => {
    mockUsePatientSearch.mockReturnValue({
      patients: mockPatients,
      isLoading: false,
      error: null,
      searchPatients: vi.fn()
    });

    renderWithQueryClient(
      <PatientSearch onPatientSelect={mockOnPatientSelect} />
    );

    expect(screen.getByText('Blue Cross')).toBeInTheDocument();
    expect(screen.getByText('BC123456')).toBeInTheDocument();
  });

  it('should not display insurance information when not available', () => {
    const patientsWithoutInsurance = [
      {
        ...mockPatients[1],
        insuranceDetails: undefined
      }
    ];

    mockUsePatientSearch.mockReturnValue({
      patients: patientsWithoutInsurance,
      isLoading: false,
      error: null,
      searchPatients: vi.fn()
    });

    renderWithQueryClient(
      <PatientSearch onPatientSelect={mockOnPatientSelect} />
    );

    expect(screen.queryByText('Insurance:')).not.toBeInTheDocument();
  });

  it('should display no results message when no patients found', () => {
    mockUsePatientSearch.mockReturnValue({
      patients: [],
      isLoading: false,
      error: null,
      searchPatients: vi.fn()
    });

    renderWithQueryClient(
      <PatientSearch onPatientSelect={mockOnPatientSelect} />
    );

    expect(screen.getByText('No patients found')).toBeInTheDocument();
  });

  it('should handle empty search query', async () => {
    const mockSearchPatients = vi.fn();
    mockUsePatientSearch.mockReturnValue({
      patients: [],
      isLoading: false,
      error: null,
      searchPatients: mockSearchPatients
    });

    renderWithQueryClient(
      <PatientSearch onPatientSelect={mockOnPatientSelect} />
    );

    const searchInput = screen.getByPlaceholderText('Search patients...');
    fireEvent.change(searchInput, { target: { value: '' } });

    await waitFor(() => {
      expect(mockSearchPatients).toHaveBeenCalledWith('');
    });
  });

  it('should apply correct CSS classes for patient cards', () => {
    mockUsePatientSearch.mockReturnValue({
      patients: mockPatients,
      isLoading: false,
      error: null,
      searchPatients: vi.fn()
    });

    renderWithQueryClient(
      <PatientSearch onPatientSelect={mockOnPatientSelect} />
    );

    const patientCards = screen.getAllByTestId('patient-card');
    patientCards.forEach(card => {
      expect(card).toHaveClass(
        'p-4',
        'border',
        'border-gray-200',
        'rounded-lg',
        'cursor-pointer',
        'hover:border-blue-300',
        'hover:bg-blue-50',
        'transition-colors'
      );
    });
  });
});