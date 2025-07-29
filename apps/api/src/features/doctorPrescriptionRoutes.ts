import { Request, Response, Router } from 'express';
import { 
  PatientSearchRequest, 
  CreateDoctorPrescriptionInput, 
  ApiResponse,
  UserRole
} from '@pharmarx/shared-types';
import { doctorPrescriptionService } from './doctorPrescriptionService';
import admin from 'firebase-admin';

const router = Router();

// Middleware to verify doctor role
const verifyDoctorRole = async (req: Request, res: Response, next: Function) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header required'
      } as ApiResponse<null>);
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Get user data to verify role
    const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      } as ApiResponse<null>);
    }

    const userData = userDoc.data();
    if (userData?.role !== UserRole.Doctor) {
      return res.status(403).json({
        success: false,
        error: 'Doctor role required'
      } as ApiResponse<null>);
    }

    // Add user info to request
    (req as any).user = {
      uid: decodedToken.uid,
      role: userData.role
    };

    next();
  } catch (error) {
    console.error('Error verifying doctor role:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token'
    } as ApiResponse<null>);
  }
};

// Apply doctor role verification to all routes
router.use(verifyDoctorRole);

/**
 * GET /doctor/patients - Search for registered patients
 */
router.get('/patients', async (req: Request, res: Response) => {
  try {
    const { query, searchType = 'all', limit } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      } as ApiResponse<null>);
    }

    const searchRequest: PatientSearchRequest = {
      query: query.trim(),
      searchType: searchType as 'name' | 'phone' | 'email' | 'all',
      limit: limit ? parseInt(limit as string) : 10
    };

    // Validate search type
    if (!['name', 'phone', 'email', 'all'].includes(searchRequest.searchType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid search type. Must be one of: name, phone, email, all'
      } as ApiResponse<null>);
    }

    const results = await doctorPrescriptionService.searchPatients(searchRequest);

    res.json({
      success: true,
      data: results,
      message: `Found ${results.length} patients matching "${query}"`
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error searching patients:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during patient search'
    } as ApiResponse<null>);
  }
});

/**
 * POST /doctor/prescriptions - Submit a new prescription
 */
router.post('/prescriptions', async (req: Request, res: Response) => {
  try {
    const doctorUid = (req as any).user.uid;
    const prescriptionData: CreateDoctorPrescriptionInput = req.body;

    // Validate required fields
    if (!prescriptionData.patientProfileId) {
      return res.status(400).json({
        success: false,
        error: 'Patient profile ID is required'
      } as ApiResponse<null>);
    }

    if (!prescriptionData.medicationDetails) {
      return res.status(400).json({
        success: false,
        error: 'Medication details are required'
      } as ApiResponse<null>);
    }

    const { medicationDetails } = prescriptionData.medicationDetails;
    if (!medicationDetails.name || !medicationDetails.dosage || !medicationDetails.quantity) {
      return res.status(400).json({
        success: false,
        error: 'Medication name, dosage, and quantity are required'
      } as ApiResponse<null>);
    }

    if (!medicationDetails.instructions) {
      return res.status(400).json({
        success: false,
        error: 'Medication instructions are required'
      } as ApiResponse<null>);
    }

    if (typeof medicationDetails.refillsAuthorized !== 'number' || medicationDetails.refillsAuthorized < 0) {
      return res.status(400).json({
        success: false,
        error: 'Refills authorized must be a non-negative number'
      } as ApiResponse<null>);
    }

    const prescription = await doctorPrescriptionService.submitPrescription(doctorUid, prescriptionData);

    res.status(201).json({
      success: true,
      data: prescription,
      message: 'Prescription submitted successfully'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error submitting prescription:', error);
    
    if (error instanceof Error && error.message === 'Patient profile not found') {
      return res.status(404).json({
        success: false,
        error: 'Patient profile not found'
      } as ApiResponse<null>);
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error during prescription submission'
    } as ApiResponse<null>);
  }
});

/**
 * GET /doctor/prescriptions - Get doctor's prescription history
 */
router.get('/prescriptions', async (req: Request, res: Response) => {
  try {
    const doctorUid = (req as any).user.uid;
    const { page = '1', limit = '10' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Page must be a positive integer'
      } as ApiResponse<null>);
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 50'
      } as ApiResponse<null>);
    }

    const history = await doctorPrescriptionService.getPrescriptionHistory(doctorUid, pageNum, limitNum);

    res.json({
      success: true,
      data: history,
      message: `Retrieved ${history.prescriptions.length} prescriptions`
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error getting prescription history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving prescription history'
    } as ApiResponse<null>);
  }
});

export default router;