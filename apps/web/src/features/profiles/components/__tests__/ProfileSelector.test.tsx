import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileSelector } from '../ProfileSelector';
import { PatientProfile } from '@pharmarx/shared-types';

// Mock Heroicons
vi.mock('@heroicons/react/24/outline', () => ({
  ChevronDownIcon: ({ className }: { className: string }) => (
    <svg className={className} data-testid="chevron-down-icon" />
  ),
  PlusIcon: ({ className }: { className: string }) => (
    <svg className={className} data-testid="plus-icon" />
  ),
  PencilIcon: ({ className }: { className: string }) => (
    <svg className={className} data-testid="pencil-icon" />
  ),
}));

const mockProfiles: PatientProfile[] = [
  {
    profileId: 'profile-1',
    managedByUid: 'caregiver-1',
    patientName: 'John Doe',
    dateOfBirth: new Date('1990-01-01'),
    insuranceDetails: {
      provider: 'Test Insurance',
      policyNumber: 'POL123456'
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    profileId: 'profile-2',
    managedByUid: 'caregiver-1',
    patientName: 'Jane Smith',
    dateOfBirth: new Date('1985-05-15'),
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  }
];

const defaultProps = {
  profiles: mockProfiles,
  activeProfileId: 'profile-1',
  onProfileSelect: vi.fn(),
  onAddProfile: vi.fn(),
  onEditProfile: vi.fn(),
  isLoading: false
};

describe('ProfileSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with active profile', () => {
    render(<ProfileSelector {...defaultProps} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('34 years old')).toBeInTheDocument();
    expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument();
  });

  it('renders loading state when isLoading is true', () => {
    render(<ProfileSelector {...defaultProps} isLoading={true} />);
    
    // Should show loading skeleton
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders "No profiles available" when no profiles exist', () => {
    render(<ProfileSelector {...defaultProps} profiles={[]} activeProfileId={undefined} />);
    
    expect(screen.getByText('No profiles available')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('opens dropdown when clicked', async () => {
    render(<ProfileSelector {...defaultProps} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Add New Profile')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('calls onProfileSelect when a profile is selected', async () => {
    render(<ProfileSelector {...defaultProps} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      const janeProfile = screen.getByText('Jane Smith');
      fireEvent.click(janeProfile);
    });
    
    expect(defaultProps.onProfileSelect).toHaveBeenCalledWith('profile-2');
  });

  it('calls onAddProfile when "Add New Profile" is clicked', async () => {
    render(<ProfileSelector {...defaultProps} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      const addButton = screen.getByText('Add New Profile');
      fireEvent.click(addButton);
    });
    
    expect(defaultProps.onAddProfile).toHaveBeenCalled();
  });

  it('calls onEditProfile when edit button is clicked', async () => {
    render(<ProfileSelector {...defaultProps} />);
    
    const editButton = screen.getByTestId('pencil-icon').parentElement;
    fireEvent.click(editButton!);
    
    expect(defaultProps.onEditProfile).toHaveBeenCalledWith('profile-1');
  });

  it('shows active indicator for selected profile', async () => {
    render(<ProfileSelector {...defaultProps} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      const activeIndicator = screen.getByText('Active');
      expect(activeIndicator).toBeInTheDocument();
    });
  });

  it('displays profile age correctly', () => {
    const currentYear = new Date().getFullYear();
    const birthYear = 1990;
    const expectedAge = currentYear - birthYear;
    
    render(<ProfileSelector {...defaultProps} />);
    
    expect(screen.getByText(`${expectedAge} years old`)).toBeInTheDocument();
  });

  it('displays profile age correctly for profiles born this year', () => {
    const currentYear = new Date().getFullYear();
    const thisYearProfile: PatientProfile = {
      ...mockProfiles[0],
      dateOfBirth: new Date(`${currentYear}-06-15`)
    };
    
    render(<ProfileSelector {...defaultProps} profiles={[thisYearProfile]} />);
    
    expect(screen.getByText('0 years old')).toBeInTheDocument();
  });

  it('closes dropdown when backdrop is clicked', async () => {
    render(<ProfileSelector {...defaultProps} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Add New Profile')).toBeInTheDocument();
    });
    
    // Click backdrop
    const backdrop = document.querySelector('.fixed.inset-0');
    fireEvent.click(backdrop!);
    
    await waitFor(() => {
      expect(screen.queryByText('Add New Profile')).not.toBeInTheDocument();
    });
  });

  it('rotates chevron icon when dropdown is open', async () => {
    render(<ProfileSelector {...defaultProps} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      const chevron = screen.getByTestId('chevron-down-icon');
      expect(chevron).toHaveClass('rotate-180');
    });
  });

  it('displays insurance information when available', async () => {
    render(<ProfileSelector {...defaultProps} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Test Insurance')).toBeInTheDocument();
      expect(screen.getByText('POL123456')).toBeInTheDocument();
    });
  });

  it('handles profile without insurance information', async () => {
    render(<ProfileSelector {...defaultProps} activeProfileId="profile-2" />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      // Should not show insurance info for profile-2
      expect(screen.queryByText('Test Insurance')).not.toBeInTheDocument();
    });
  });

  it('prevents event propagation when edit button is clicked', async () => {
    render(<ProfileSelector {...defaultProps} />);
    
    const editButton = screen.getByTestId('pencil-icon').parentElement;
    const stopPropagation = vi.fn();
    
    fireEvent.click(editButton!, { stopPropagation });
    
    expect(defaultProps.onEditProfile).toHaveBeenCalledWith('profile-1');
  });

  it('prevents event propagation when add profile is clicked', async () => {
    render(<ProfileSelector {...defaultProps} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      const addButton = screen.getByText('Add New Profile');
      const stopPropagation = vi.fn();
      fireEvent.click(addButton, { stopPropagation });
    });
    
    expect(defaultProps.onAddProfile).toHaveBeenCalled();
  });
});