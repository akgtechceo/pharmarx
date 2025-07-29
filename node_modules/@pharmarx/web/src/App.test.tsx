import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Mock the auth store to provide different user roles for testing
const mockUseAuthStore = vi.fn();
vi.mock('./store/authStore', () => ({
  useAuthStore: () => mockUseAuthStore()
}));

// Helper function to render components with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Enhanced Portal Components', () => {
  describe('Patient Portal', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        user: { 
          uid: 'patient123', 
          role: 'patient', 
          displayName: 'John Patient',
          email: 'patient@test.com'
        },
        isAuthenticated: true
      });
    });

    it('renders patient portal with comprehensive dashboard', () => {
      renderWithRouter(<App />);
      
      // Navigate to patient portal
      window.history.pushState({}, '', '/portal/patient');
      
      // Check for patient-specific header navigation
      expect(screen.getByText('Patient Portal')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
      
      // Check for personalized welcome message
      expect(screen.getByText('Welcome back, Patient!')).toBeInTheDocument();
      expect(screen.getByText(/personalized health dashboard/)).toBeInTheDocument();
      
      // Check for medication tracking sections
      expect(screen.getByText('Current Medications')).toBeInTheDocument();
      expect(screen.getByText('Metformin 500mg')).toBeInTheDocument();
      expect(screen.getByText('Lisinopril 10mg')).toBeInTheDocument();
      
      // Check for prescription history
      expect(screen.getByText('Recent Prescription History')).toBeInTheDocument();
      expect(screen.getByText('Filled at CVS Pharmacy')).toBeInTheDocument();
      
      // Check for upcoming appointments
      expect(screen.getByText('Upcoming Appointments')).toBeInTheDocument();
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
      expect(screen.getByText('Diabetes Check-up')).toBeInTheDocument();
      
      // Check for health tracking metrics
      expect(screen.getByText('Health Tracking')).toBeInTheDocument();
      expect(screen.getByText('Blood Pressure')).toBeInTheDocument();
      expect(screen.getByText('120/80')).toBeInTheDocument();
      
      // Check for quick actions
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Request Prescription Refill')).toBeInTheDocument();
      expect(screen.getByText('Message My Doctor')).toBeInTheDocument();
    });

    it('handles interactive elements correctly', () => {
      renderWithRouter(<App />);
      window.history.pushState({}, '', '/portal/patient');
      
      // Test medication status badges
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Refill Soon')).toBeInTheDocument();
      
      // Test appointment scheduling button
      const scheduleButton = screen.getByText('Schedule New Appointment');
      expect(scheduleButton).toBeInTheDocument();
      fireEvent.click(scheduleButton);
      
      // Test quick action buttons
      const refillButton = screen.getByText('Request Prescription Refill');
      expect(refillButton).toBeInTheDocument();
      fireEvent.click(refillButton);
    });
  });

  describe('Caregiver Portal', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        user: { 
          uid: 'caregiver123', 
          role: 'caregiver', 
          displayName: 'Jane Caregiver',
          email: 'caregiver@test.com'
        },
        isAuthenticated: true
      });
    });

    it('renders caregiver portal with multi-patient management', () => {
      renderWithRouter(<App />);
      window.history.pushState({}, '', '/portal/caregiver');
      
      // Check for caregiver-specific navigation
      expect(screen.getByText('Caregiver Portal')).toBeInTheDocument();
      expect(screen.getByText('Managing: 3 Patients')).toBeInTheDocument();
      
      // Check for multi-patient overview
      expect(screen.getByText('Your Patients')).toBeInTheDocument();
      expect(screen.getByText('Mary Johnson (Mother)')).toBeInTheDocument();
      expect(screen.getByText('Robert Johnson (Spouse)')).toBeInTheDocument();
      expect(screen.getByText('Emma Thompson (Daughter)')).toBeInTheDocument();
      
      // Check for patient status indicators
      expect(screen.getByText('2 Medications Due')).toBeInTheDocument();
      expect(screen.getByText('All Up to Date')).toBeInTheDocument();
      expect(screen.getByText('Appointment Needed')).toBeInTheDocument();
      
      // Check for care coordination features
      expect(screen.getByText('Care Coordination')).toBeInTheDocument();
      expect(screen.getByText('Mary Johnson - Diabetes Care Plan')).toBeInTheDocument();
      expect(screen.getByText('Robert Johnson - Heart Health Plan')).toBeInTheDocument();
      
      // Check for daily tasks management
      expect(screen.getByText('Today\'s Tasks')).toBeInTheDocument();
      expect(screen.getByText('Remind Mary to take morning insulin')).toBeInTheDocument();
      
      // Check for communication center
      expect(screen.getByText('Messages')).toBeInTheDocument();
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
      expect(screen.getByText('CVS Pharmacy')).toBeInTheDocument();
    });

    it('displays care plan progress indicators', () => {
      renderWithRouter(<App />);
      window.history.pushState({}, '', '/portal/caregiver');
      
      // Check for progress indicators in care plans
      expect(screen.getByText('Blood sugar monitoring: On track')).toBeInTheDocument();
      expect(screen.getByText('Medication adherence: Needs attention')).toBeInTheDocument();
      expect(screen.getByText('Medication compliance: Excellent')).toBeInTheDocument();
    });
  });

  describe('Doctor Portal', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        user: { 
          uid: 'doctor123', 
          role: 'doctor', 
          displayName: 'Dr. Smith',
          email: 'doctor@test.com'
        },
        isAuthenticated: true
      });
    });

    it('renders doctor portal with clinical management tools', () => {
      renderWithRouter(<App />);
      window.history.pushState({}, '', '/portal/doctor');
      
      // Check for doctor-specific navigation
      expect(screen.getByText('Doctor Portal')).toBeInTheDocument();
      expect(screen.getByText('Dr. Smith • 12 Patients Today')).toBeInTheDocument();
      
      // Check for today's schedule
      expect(screen.getByText('Today\'s Schedule')).toBeInTheDocument();
      expect(screen.getByText('Sarah Williams')).toBeInTheDocument();
      expect(screen.getByText('URGENT')).toBeInTheDocument();
      expect(screen.getByText('Follow-up')).toBeInTheDocument();
      expect(screen.getByText('Diabetes management consultation')).toBeInTheDocument();
      
      // Check for prescription management
      expect(screen.getByText('Prescription Queue')).toBeInTheDocument();
      expect(screen.getByText('Write New Prescription')).toBeInTheDocument();
      expect(screen.getByText('Refill Request - Sarah Williams')).toBeInTheDocument();
      expect(screen.getByText('Metformin 500mg • 90-day supply')).toBeInTheDocument();
      
      // Check for clinical notes
      expect(screen.getByText('Recent Clinical Notes')).toBeInTheDocument();
      expect(screen.getByText('Sarah Williams - Diabetes Follow-up')).toBeInTheDocument();
      expect(screen.getByText(/Patient reports improved glucose control/)).toBeInTheDocument();
      
      // Check for patient search functionality
      expect(screen.getByText('Patient Search')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search by name, ID, or phone...')).toBeInTheDocument();
      
      // Check for clinical tools
      expect(screen.getByText('Clinical Tools')).toBeInTheDocument();
      expect(screen.getByText('Lab Results Portal')).toBeInTheDocument();
      expect(screen.getByText('Radiology Reports')).toBeInTheDocument();
      
      // Check for alerts system
      expect(screen.getByText('Alerts')).toBeInTheDocument();
      expect(screen.getByText('Critical Lab Value')).toBeInTheDocument();
      expect(screen.getByText('S. Williams - HbA1c: 8.2%')).toBeInTheDocument();
    });

    it('handles prescription queue interactions', () => {
      renderWithRouter(<App />);
      window.history.pushState({}, '', '/portal/doctor');
      
      // Test prescription approval buttons
      const approveButton = screen.getByText('Approve');
      expect(approveButton).toBeInTheDocument();
      fireEvent.click(approveButton);
      
      const reviewButton = screen.getByText('Review');
      expect(reviewButton).toBeInTheDocument();
      fireEvent.click(reviewButton);
    });
  });

  describe('Pharmacist Portal', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        user: { 
          uid: 'pharmacist123', 
          role: 'pharmacist', 
          displayName: 'PharmD Johnson',
          email: 'pharmacist@test.com'
        },
        isAuthenticated: true
      });
    });

    it('renders pharmacist portal with prescription processing workflow', () => {
      renderWithRouter(<App />);
      window.history.pushState({}, '', '/portal/pharmacist');
      
      // Check for pharmacist-specific navigation
      expect(screen.getByText('Pharmacist Portal')).toBeInTheDocument();
      expect(screen.getByText('PharmD Johnson • 15 Orders in Queue')).toBeInTheDocument();
      
      // Check for prescription queue
      expect(screen.getByText('Prescription Queue')).toBeInTheDocument();
      expect(screen.getByText('Process Next')).toBeInTheDocument();
      expect(screen.getByText('Sarah Williams')).toBeInTheDocument();
      expect(screen.getByText('PRIORITY')).toBeInTheDocument();
      expect(screen.getByText('Consultation Required')).toBeInTheDocument();
      
      // Check for processing workflow
      expect(screen.getByText('Processing Workflow')).toBeInTheDocument();
      expect(screen.getByText('Received')).toBeInTheDocument();
      expect(screen.getByText('Verified')).toBeInTheDocument();
      expect(screen.getByText('Filling')).toBeInTheDocument();
      expect(screen.getByText('Ready')).toBeInTheDocument();
      
      // Check for counseling sessions
      expect(screen.getByText('Recent Counseling Sessions')).toBeInTheDocument();
      expect(screen.getByText('Sarah Williams - Diabetes Medication Education')).toBeInTheDocument();
      expect(screen.getByText(/Discussed proper metformin administration/)).toBeInTheDocument();
      
      // Check for inventory management
      expect(screen.getByText('Inventory Alerts')).toBeInTheDocument();
      expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
      expect(screen.getByText('Metformin 500mg: 5 units remaining')).toBeInTheDocument();
      
      // Check for drug information tools
      expect(screen.getByText('Drug Information')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search by drug name or NDC...')).toBeInTheDocument();
      expect(screen.getByText('Drug Interactions Checker')).toBeInTheDocument();
      
      // Check for daily statistics
      expect(screen.getByText('Today\'s Statistics')).toBeInTheDocument();
      expect(screen.getByText('Prescriptions Filled')).toBeInTheDocument();
      expect(screen.getByText('47')).toBeInTheDocument();
      expect(screen.getByText('Consultations')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('handles prescription processing actions', () => {
      renderWithRouter(<App />);
      window.history.pushState({}, '', '/portal/pharmacist');
      
      // Test prescription action buttons
      const fillButton = screen.getAllByText('Fill')[0];
      expect(fillButton).toBeInTheDocument();
      fireEvent.click(fillButton);
      
      const consultButton = screen.getByText('Consult');
      expect(consultButton).toBeInTheDocument();
      fireEvent.click(consultButton);
      
      // Test inventory management
      const manageInventoryButton = screen.getByText('Manage Inventory');
      expect(manageInventoryButton).toBeInTheDocument();
      fireEvent.click(manageInventoryButton);
    });
  });

  describe('Cross-Portal Navigation Consistency', () => {
    it('maintains consistent header navigation across all portals', () => {
      const portals = [
        { role: 'patient', path: '/portal/patient', title: 'Patient Portal' },
        { role: 'caregiver', path: '/portal/caregiver', title: 'Caregiver Portal' },
        { role: 'doctor', path: '/portal/doctor', title: 'Doctor Portal' },
        { role: 'pharmacist', path: '/portal/pharmacist', title: 'Pharmacist Portal' }
      ];

      portals.forEach(portal => {
        mockUseAuthStore.mockReturnValue({
          user: { 
            uid: `${portal.role}123`, 
            role: portal.role, 
            displayName: `Test ${portal.role}`,
            email: `${portal.role}@test.com`
          },
          isAuthenticated: true
        });

        renderWithRouter(<App />);
        window.history.pushState({}, '', portal.path);
        
        // Check for consistent navigation elements
        expect(screen.getByText('PharmaRx')).toBeInTheDocument();
        expect(screen.getByText(portal.title)).toBeInTheDocument();
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Logout')).toBeInTheDocument();
        expect(screen.getByText('← Back to Home')).toBeInTheDocument();
      });
    });

    it('displays role-specific welcome messages and branding', () => {
      const expectedColors = {
        patient: 'text-blue-600',
        caregiver: 'text-green-600', 
        doctor: 'text-blue-700',
        pharmacist: 'text-purple-700'
      };

      Object.entries(expectedColors).forEach(([role, colorClass]) => {
        mockUseAuthStore.mockReturnValue({
          user: { 
            uid: `${role}123`, 
            role: role, 
            displayName: `Test ${role}`,
            email: `${role}@test.com`
          },
          isAuthenticated: true
        });

        renderWithRouter(<App />);
        window.history.pushState({}, '', `/portal/${role}`);
        
        // Check that PharmaRx header has role-specific color
        const header = screen.getByText('PharmaRx');
        expect(header.className).toContain(colorClass);
      });
    });
  });
}); 