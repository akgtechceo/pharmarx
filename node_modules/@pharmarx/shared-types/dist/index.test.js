import { describe, it, expect } from 'vitest';
import { UserRole, validateUser, validateCreateUserInput } from './index';
describe('User Interface Validation', () => {
    describe('validateUser', () => {
        const validUser = {
            uid: 'test-uid-123',
            role: UserRole.Patient,
            email: 'test@example.com',
            displayName: 'John Doe',
            createdAt: new Date()
        };
        it('should validate a complete user with email', () => {
            const result = validateUser(validUser);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        it('should validate a complete user with phone number', () => {
            const userWithPhone = {
                uid: 'test-uid-123',
                role: UserRole.Doctor,
                phoneNumber: '+1-555-123-4567',
                displayName: 'Dr. Smith',
                createdAt: new Date()
            };
            const result = validateUser(userWithPhone);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        it('should validate a user with both email and phone number', () => {
            const userWithBoth = {
                uid: 'test-uid-123',
                role: UserRole.Pharmacist,
                email: 'pharmacist@pharmacy.com',
                phoneNumber: '555-987-6543',
                displayName: 'Jane Pharmacist',
                createdAt: new Date()
            };
            const result = validateUser(userWithBoth);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        it('should reject user without uid', () => {
            const userWithoutUid = { ...validUser, uid: '' };
            const result = validateUser(userWithoutUid);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('uid is required and must be a non-empty string');
        });
        it('should reject user with invalid role', () => {
            const userWithInvalidRole = { ...validUser, role: 'invalid-role' };
            const result = validateUser(userWithInvalidRole);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('role is required and must be one of: patient, caregiver, doctor, pharmacist');
        });
        it('should reject user without displayName', () => {
            const userWithoutDisplayName = { ...validUser, displayName: '' };
            const result = validateUser(userWithoutDisplayName);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('displayName is required and must be a non-empty string');
        });
        it('should reject user without createdAt', () => {
            const userWithoutCreatedAt = { ...validUser, createdAt: undefined };
            const result = validateUser(userWithoutCreatedAt);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('createdAt is required and must be a Date object');
        });
        it('should reject user without email or phone number', () => {
            const userWithoutContact = {
                uid: 'test-uid-123',
                role: UserRole.Patient,
                displayName: 'John Doe',
                createdAt: new Date()
            };
            const result = validateUser(userWithoutContact);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Either email or phoneNumber must be provided');
        });
        it('should reject user with invalid email format', () => {
            const userWithInvalidEmail = { ...validUser, email: 'invalid-email' };
            const result = validateUser(userWithInvalidEmail);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('email must be a valid email address format');
        });
        it('should reject user with invalid phone number format', () => {
            const userWithInvalidPhone = {
                uid: 'test-uid-123',
                role: UserRole.Patient,
                phoneNumber: 'abc-def-ghij',
                displayName: 'John Doe',
                createdAt: new Date()
            };
            const result = validateUser(userWithInvalidPhone);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('phoneNumber must contain only digits, spaces, hyphens, parentheses, and optional plus sign');
        });
        it('should validate all UserRole enum values', () => {
            Object.values(UserRole).forEach(role => {
                const userWithRole = { ...validUser, role };
                const result = validateUser(userWithRole);
                expect(result.isValid).toBe(true);
            });
        });
    });
    describe('validateCreateUserInput', () => {
        const validInput = {
            role: UserRole.Patient,
            email: 'test@example.com',
            displayName: 'John Doe'
        };
        it('should validate complete input with email', () => {
            const result = validateCreateUserInput(validInput);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        it('should validate complete input with phone number', () => {
            const inputWithPhone = {
                role: UserRole.Doctor,
                phoneNumber: '+1-555-123-4567',
                displayName: 'Dr. Smith'
            };
            const result = validateCreateUserInput(inputWithPhone);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        it('should validate input with both email and phone', () => {
            const inputWithBoth = {
                role: UserRole.Caregiver,
                email: 'caregiver@example.com',
                phoneNumber: '(555) 123-4567',
                displayName: 'Caring Person'
            };
            const result = validateCreateUserInput(inputWithBoth);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        it('should reject input without role', () => {
            const inputWithoutRole = { ...validInput, role: undefined };
            const result = validateCreateUserInput(inputWithoutRole);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('role is required and must be one of: patient, caregiver, doctor, pharmacist');
        });
        it('should reject input without displayName', () => {
            const inputWithoutDisplayName = { ...validInput, displayName: '' };
            const result = validateCreateUserInput(inputWithoutDisplayName);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('displayName is required and must be a non-empty string');
        });
        it('should reject input without any contact method', () => {
            const inputWithoutContact = {
                role: UserRole.Patient,
                displayName: 'John Doe'
            };
            const result = validateCreateUserInput(inputWithoutContact);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Either email or phoneNumber must be provided');
        });
        it('should accept various valid phone number formats', () => {
            const validPhoneFormats = [
                '+1-555-123-4567',
                '555-123-4567',
                '(555) 123-4567',
                '+1 555 123 4567',
                '5551234567'
            ];
            validPhoneFormats.forEach(phoneNumber => {
                const input = {
                    role: UserRole.Patient,
                    phoneNumber,
                    displayName: 'Test User'
                };
                const result = validateCreateUserInput(input);
                expect(result.isValid).toBe(true);
            });
        });
        it('should accept various valid email formats', () => {
            const validEmails = [
                'user@example.com',
                'user.name@example.com',
                'user+tag@example.co.uk',
                'user_name@example-site.com'
            ];
            validEmails.forEach(email => {
                const input = {
                    role: UserRole.Patient,
                    email,
                    displayName: 'Test User'
                };
                const result = validateCreateUserInput(input);
                expect(result.isValid).toBe(true);
            });
        });
    });
    describe('UserRole enum', () => {
        it('should contain all expected role values', () => {
            expect(UserRole.Patient).toBe('patient');
            expect(UserRole.Caregiver).toBe('caregiver');
            expect(UserRole.Doctor).toBe('doctor');
            expect(UserRole.Pharmacist).toBe('pharmacist');
        });
        it('should have exactly 4 role values', () => {
            const roleValues = Object.values(UserRole);
            expect(roleValues).toHaveLength(4);
            expect(roleValues).toEqual(['patient', 'caregiver', 'doctor', 'pharmacist']);
        });
    });
});
