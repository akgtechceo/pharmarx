// User types
export var UserRole;
(function (UserRole) {
    UserRole["Patient"] = "patient";
    UserRole["Caregiver"] = "caregiver";
    UserRole["Doctor"] = "doctor";
    UserRole["Pharmacist"] = "pharmacist";
})(UserRole || (UserRole = {}));
// User validation functions
export const validateUser = (user) => {
    const errors = [];
    // Validate required fields
    if (!user.uid || typeof user.uid !== 'string' || user.uid.trim() === '') {
        errors.push('uid is required and must be a non-empty string');
    }
    if (!user.role || !Object.values(UserRole).includes(user.role)) {
        errors.push('role is required and must be one of: patient, caregiver, doctor, pharmacist');
    }
    if (!user.displayName || typeof user.displayName !== 'string' || user.displayName.trim() === '') {
        errors.push('displayName is required and must be a non-empty string');
    }
    if (!user.createdAt || !(user.createdAt instanceof Date)) {
        errors.push('createdAt is required and must be a Date object');
    }
    // Validate that at least one contact method is provided
    const hasEmail = user.email && typeof user.email === 'string' && user.email.trim() !== '';
    const hasPhoneNumber = user.phoneNumber && typeof user.phoneNumber === 'string' && user.phoneNumber.trim() !== '';
    if (!hasEmail && !hasPhoneNumber) {
        errors.push('Either email or phoneNumber must be provided');
    }
    // Validate email format if provided
    if (hasEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(user.email)) {
            errors.push('email must be a valid email address format');
        }
    }
    // Validate phone number format if provided (basic validation)
    if (hasPhoneNumber) {
        const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
        if (!phoneRegex.test(user.phoneNumber)) {
            errors.push('phoneNumber must contain only digits, spaces, hyphens, parentheses, and optional plus sign');
        }
    }
    return {
        isValid: errors.length === 0,
        errors
    };
};
export const validateCreateUserInput = (input) => {
    const errors = [];
    if (!input.role || !Object.values(UserRole).includes(input.role)) {
        errors.push('role is required and must be one of: patient, caregiver, doctor, pharmacist');
    }
    if (!input.displayName || typeof input.displayName !== 'string' || input.displayName.trim() === '') {
        errors.push('displayName is required and must be a non-empty string');
    }
    // Validate that at least one contact method is provided
    const hasEmail = input.email && typeof input.email === 'string' && input.email.trim() !== '';
    const hasPhoneNumber = input.phoneNumber && typeof input.phoneNumber === 'string' && input.phoneNumber.trim() !== '';
    if (!hasEmail && !hasPhoneNumber) {
        errors.push('Either email or phoneNumber must be provided');
    }
    // Validate email format if provided
    if (hasEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.email)) {
            errors.push('email must be a valid email address format');
        }
    }
    // Validate phone number format if provided (basic validation)
    if (hasPhoneNumber) {
        const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
        if (!phoneRegex.test(input.phoneNumber)) {
            errors.push('phoneNumber must contain only digits, spaces, hyphens, parentheses, and optional plus sign');
        }
    }
    return {
        isValid: errors.length === 0,
        errors
    };
};
// File validation functions
export const validatePrescriptionFile = (file) => {
    const errors = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
        errors.push('File must be an image (JPG, PNG) or PDF');
    }
    if (file.size > maxSize) {
        errors.push('File size must be less than 10MB');
    }
    if (file.size === 0) {
        errors.push('File cannot be empty');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
};
// Re-export payment link types
export * from './paymentLink.types';
// Re-export delivery tracking types
export * from './deliveryTracking.types';
export const validateCreateProfileRequest = (input) => {
    const errors = [];
    if (!input.patientName || typeof input.patientName !== 'string' || input.patientName.trim() === '') {
        errors.push('patientName is required and must be a non-empty string');
    }
    if (!input.dateOfBirth || typeof input.dateOfBirth !== 'string') {
        errors.push('dateOfBirth is required and must be a valid ISO date string');
    }
    else {
        const date = new Date(input.dateOfBirth);
        if (isNaN(date.getTime())) {
            errors.push('dateOfBirth must be a valid date');
        }
        // Check if date is not in the future
        if (date > new Date()) {
            errors.push('dateOfBirth cannot be in the future');
        }
    }
    // Validate insurance details if provided
    if (input.insuranceDetails) {
        if (!input.insuranceDetails.provider || typeof input.insuranceDetails.provider !== 'string' || input.insuranceDetails.provider.trim() === '') {
            errors.push('insurance provider is required when insurance details are provided');
        }
        if (!input.insuranceDetails.policyNumber || typeof input.insuranceDetails.policyNumber !== 'string' || input.insuranceDetails.policyNumber.trim() === '') {
            errors.push('insurance policy number is required when insurance details are provided');
        }
    }
    return {
        isValid: errors.length === 0,
        errors
    };
};
export const validateUpdateProfileRequest = (input) => {
    const errors = [];
    // Validate date of birth format if provided
    if (input.dateOfBirth) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(input.dateOfBirth)) {
            errors.push('dateOfBirth must be in YYYY-MM-DD format');
        }
        else {
            const date = new Date(input.dateOfBirth);
            if (isNaN(date.getTime())) {
                errors.push('dateOfBirth must be a valid date');
            }
        }
    }
    // Validate insurance details if provided
    if (input.insuranceDetails) {
        if (!input.insuranceDetails.provider || typeof input.insuranceDetails.provider !== 'string' || input.insuranceDetails.provider.trim() === '') {
            errors.push('insurance provider is required when insurance details are provided');
        }
        if (!input.insuranceDetails.policyNumber || typeof input.insuranceDetails.policyNumber !== 'string' || input.insuranceDetails.policyNumber.trim() === '') {
            errors.push('insurance policy number is required when insurance details are provided');
        }
    }
    return {
        isValid: errors.length === 0,
        errors
    };
};
