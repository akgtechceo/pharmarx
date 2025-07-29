import databaseService from './database';
import { 
  PatientSearchResult, 
  PatientSearchRequest, 
  DoctorPrescriptionSubmission, 
  CreateDoctorPrescriptionInput,
  DoctorPrescriptionHistoryResponse,
  PrescriptionOrder,
  PrescriptionOrderStatus,
  PatientProfile
} from '@pharmarx/shared-types';
import admin from 'firebase-admin';
import { PrescriptionNotificationService } from './prescriptionNotificationService';

export class DoctorPrescriptionService {
  private notificationService: PrescriptionNotificationService;
  private db: admin.firestore.Firestore;

  constructor() {
    this.notificationService = new PrescriptionNotificationService();
    this.db = databaseService.getDb();
  }

  /**
   * Search for registered patients by name, phone, or email
   */
  async searchPatients(request: PatientSearchRequest): Promise<PatientSearchResult[]> {
    try {
      const { query, searchType, limit = 10 } = request;
      
      if (!query || query.trim() === '') {
        return [];
      }

      const searchQuery = query.trim().toLowerCase();
      const patientsRef = this.db.collection('patientProfiles');
      let queryRef: admin.firestore.Query;

      switch (searchType) {
        case 'name': {
          queryRef = patientsRef.where('patientName', '>=', searchQuery)
                               .where('patientName', '<=', searchQuery + '\uf8ff');
          break;
        }
        case 'phone': {
          // Search in users collection for phone number, then get associated profiles
          const usersRef = this.db.collection('users');
          const phoneQuery = await usersRef.where('phoneNumber', '==', searchQuery).get();
          const phoneUserIds = phoneQuery.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.id);
          
          if (phoneUserIds.length === 0) return [];
          
          queryRef = patientsRef.where('managedByUid', 'in', phoneUserIds);
          break;
        }
        case 'email': {
          // Search in users collection for email, then get associated profiles
          const emailUsersRef = this.db.collection('users');
          const emailQuery = await emailUsersRef.where('email', '==', searchQuery).get();
          const emailUserIds = emailQuery.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.id);
          
          if (emailUserIds.length === 0) return [];
          
          queryRef = patientsRef.where('managedByUid', 'in', emailUserIds);
          break;
        }
        case 'all':
        default: {
          // Search across all fields - more complex query
          const nameQuery = await patientsRef.where('patientName', '>=', searchQuery)
                                            .where('patientName', '<=', searchQuery + '\uf8ff')
                                            .limit(limit)
                                            .get();
          
          const allUsersRef = this.db.collection('users');
          const allPhoneQuery = await allUsersRef.where('phoneNumber', '==', searchQuery).get();
          const allEmailQuery = await allUsersRef.where('email', '==', searchQuery).get();
          
          const allPhoneUserIds = allPhoneQuery.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.id);
          const allEmailUserIds = allEmailQuery.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.id);
          const allUserIds = [...allPhoneUserIds, ...allEmailUserIds];
          
          let additionalResults: PatientSearchResult[] = [];
          if (allUserIds.length > 0) {
            const additionalQuery = await patientsRef.where('managedByUid', 'in', allUserIds).get();
            const additionalPromises = additionalQuery.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => this.mapProfileToSearchResult(doc));
            additionalResults = await Promise.all(additionalPromises);
          }
          
          const namePromises = nameQuery.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => this.mapProfileToSearchResult(doc));
          const nameResults = await Promise.all(namePromises);
          const combinedResults = [...nameResults, ...additionalResults];
          
          // Remove duplicates and limit results
          const uniqueResults = this.removeDuplicatePatients(combinedResults);
          return uniqueResults.slice(0, limit);
        }
      }

      const snapshot = await queryRef.limit(limit).get();
      const resultPromises = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => this.mapProfileToSearchResult(doc));
      const results = await Promise.all(resultPromises);
      
      return results;
    } catch (error) {
      console.error('Error searching patients:', error);
      throw new Error('Failed to search patients');
    }
  }

  /**
   * Submit a new prescription for a patient
   */
  async submitPrescription(
    doctorUid: string, 
    input: CreateDoctorPrescriptionInput
  ): Promise<DoctorPrescriptionSubmission> {
    try {
      // Validate patient profile exists
      const patientProfileDoc = await this.db.collection('patientProfiles').doc(input.patientProfileId).get();
      if (!patientProfileDoc.exists) {
        throw new Error('Patient profile not found');
      }

      const patientProfileData = patientProfileDoc.data();
      const patientProfile: PatientProfile = {
        ...patientProfileData,
        profileId: patientProfileDoc.id,
        createdAt: patientProfileData?.createdAt?.toDate() || new Date(),
        updatedAt: patientProfileData?.updatedAt?.toDate()
      } as PatientProfile;

      // Generate prescription ID
      const prescriptionId = this.db.collection('doctorPrescriptions').doc().id;
      const now = new Date();

      // Create prescription submission
      const prescription: DoctorPrescriptionSubmission = {
        prescriptionId,
        doctorUid,
        patientProfileId: input.patientProfileId,
        medicationDetails: {
          ...input.medicationDetails,
          refillsRemaining: input.medicationDetails.refillsAuthorized
        },
        prescriptionNotes: input.prescriptionNotes,
        submittedAt: now,
        status: 'submitted'
      };

      // Save prescription to database
      await this.db.collection('doctorPrescriptions').doc(prescriptionId).set({
        ...prescription,
        submittedAt: admin.firestore.Timestamp.fromDate(now)
      });

      // Create prescription order for pharmacist processing
      const orderId = this.db.collection('prescriptionOrders').doc().id;
      const prescriptionOrder: PrescriptionOrder = {
        orderId,
        patientProfileId: input.patientProfileId,
        status: 'pending_verification' as PrescriptionOrderStatus,
        originalImageUrl: '', // No image for doctor submissions
        medicationDetails: {
          name: input.medicationDetails.name,
          dosage: input.medicationDetails.dosage,
          quantity: input.medicationDetails.quantity
        },
        createdAt: now,
        updatedAt: now
      };

      await this.db.collection('prescriptionOrders').doc(orderId).set({
        ...prescriptionOrder,
        createdAt: admin.firestore.Timestamp.fromDate(now),
        updatedAt: admin.firestore.Timestamp.fromDate(now)
      });

      // Send notification to patient
      try {
        const notificationResult = await this.notificationService.notifyPatientOfPrescription(
          prescription,
          patientProfile
        );

        if (notificationResult.success) {
          console.log(`Notifications sent successfully for prescription ${prescriptionId}`);
        } else {
          console.warn(`Failed to send notifications for prescription ${prescriptionId}:`, notificationResult.error);
        }
      } catch (notificationError) {
        console.error('Error sending prescription notifications:', notificationError);
        // Don't fail the prescription submission if notifications fail
      }

      console.log(`Doctor ${doctorUid} submitted prescription ${prescriptionId} for patient ${input.patientProfileId}`);

      return prescription;
    } catch (error) {
      console.error('Error submitting prescription:', error);
      throw error;
    }
  }

  /**
   * Get prescription history for a doctor
   */
  async getPrescriptionHistory(
    doctorUid: string, 
    page: number = 1, 
    limit: number = 10
  ): Promise<DoctorPrescriptionHistoryResponse> {
    try {
      const offset = (page - 1) * limit;
      
      const prescriptionsRef = this.db.collection('doctorPrescriptions');
      const query = prescriptionsRef
        .where('doctorUid', '==', doctorUid)
        .orderBy('submittedAt', 'desc')
        .limit(limit)
        .offset(offset);

      const snapshot = await query.get();
      const prescriptions = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => {
        const data = doc.data();
        return {
          ...data,
          submittedAt: data.submittedAt.toDate()
        } as DoctorPrescriptionSubmission;
      });

      // Get total count for pagination
      const totalQuery = await prescriptionsRef.where('doctorUid', '==', doctorUid).get();
      const total = totalQuery.size;

      return {
        prescriptions,
        pagination: {
          page,
          limit,
          total,
          hasMore: offset + prescriptions.length < total
        }
      };
    } catch (error) {
      console.error('Error getting prescription history:', error);
      throw new Error('Failed to get prescription history');
    }
  }

  /**
   * Map Firestore document to PatientSearchResult
   */
  private async mapProfileToSearchResult(doc: admin.firestore.QueryDocumentSnapshot): Promise<PatientSearchResult> {
    const data = doc.data();
    
    // Get user information for contact details
    const userDoc = await this.db.collection('users').doc(data.managedByUid).get();
    const userData = userDoc.data();

    return {
      profileId: doc.id,
      patientName: data.patientName,
      dateOfBirth: data.dateOfBirth.toDate(),
      phoneNumber: userData?.phoneNumber,
      email: userData?.email,
      insuranceDetails: data.insuranceDetails,
      lastPrescriptionDate: data.lastPrescriptionDate?.toDate()
    };
  }

  /**
   * Remove duplicate patients from search results
   */
  private removeDuplicatePatients(patients: PatientSearchResult[]): PatientSearchResult[] {
    const seen = new Set<string>();
    return patients.filter(patient => {
      if (seen.has(patient.profileId)) {
        return false;
      }
      seen.add(patient.profileId);
      return true;
    });
  }
}

export const doctorPrescriptionService = new DoctorPrescriptionService();