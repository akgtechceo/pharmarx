# PharmC Product Requirements Document (PRD)
**Version: 1.0**
**Date: July 21, 2025**

---

## 1. Goals and Background Context

#### **Goals**
* Become the leading prescription delivery platform in Cotonou, Benin, with a plan for regional expansion.
* Build a sustainable and profitable revenue model.
* Improve medication adherence and health outcomes by simplifying access to medicine.
* Significantly reduce the time, stress, and logistical complexity for users managing prescriptions.

#### **Background Context**
This project addresses the critical need for a modern, reliable prescription fulfillment service in French-speaking West Africa. The current process, reliant on in-person pharmacy visits, poses significant challenges for busy professionals, patients with mobility issues, and caregivers. Our platform will provide a unified, secure, and user-friendly web and mobile application to solve this problem, creating a new standard for convenient access to healthcare in the region.

#### **Change Log**
| Date          | Version | Description         | Author     |
| :------------ | :------ | :------------------ | :--------- |
| July 21, 2025 | 1.0     | Initial PRD Draft   | John, PM   |

---

## 2. Requirements

#### **Functional Requirements**
* **FR1:** The system shall allow users to create an account, log in, and manage a personal profile.
* **FR2:** Users shall be able to upload a prescription by taking a photo or uploading an image file.
* **FR3:** The system shall use AI (Google Cloud Vision) to automatically extract text from the prescription image.
* **FR4:** The system shall display the extracted information to the user and allow them to confirm or correct it.
* **FR5:** All submitted prescriptions must be reviewed and approved by a verified pharmacist before the order is finalized.
* **FR6:** Users shall be able to view their prescription history and request refills.
* **FR7:** Users shall be able to track the real-time status and location of their delivery on a map.
* **FR8:** A Caregiver shall be able to create and manage multiple patient profiles within their single account.
* **FR9:** The system shall integrate with payment gateways, including Stripe, PayPal, and MTN Mobile Money.
* **FR10:** Users shall be able to securely store their insurance information.
* **FR11:** A secure web portal shall exist for verified doctors to digitally submit new prescriptions.
* **FR12:** The system shall send automated WhatsApp notifications for key events.
* **FR13:** Users shall be able to view medication availability from nearby partner pharmacies on a map.
* **FR14:** Users shall be able to view a clear, current status for their orders (e.g., Pending Approval, Preparing, Out for Delivery, Delivered).
* **FR15:** The user interface, including all text and notifications, shall be in French.

#### **Non-Functional Requirements**
* **NFR1:** The platform must be accessible via a responsive web application and native mobile applications (iOS/Android).
* **NFR2:** The application must be performant, optimized for variable network conditions in Cotonou, Benin.
* **NFR3:** The entire platform must be hosted on the Google Cloud Platform.
* **NFR4:** All user data must be handled in compliance with the data privacy and healthcare regulations of Benin.
* **NFR5:** Uploaded prescription images must be securely deleted after a 30-day period.
* **NFR6:** The backend architecture should be service-oriented.

---

## 3. User Interface Design Goals

* **Overall UX Vision:** Clear, simple, trustworthy, and accessible.
* **Key Interaction Paradigms:** Role-Driven Experience, Status-Driven Dashboard, Image-First Workflow, Effortless Caregiver Mode.
* **Core Screens and Views:** Splash Page, Registration (with role selection), Login, Patient/Caregiver Dashboard, Doctor Portal, Pharmacist Portal, Prescription Upload, Order Status & Tracking, History & Refills, Profile Management, Payment & Insurance.
* **Accessibility & Branding:** WCAG AA standards; clean, professional aesthetic; all UI in French.
* **Target Platforms:** Web Responsive and dedicated Mobile Apps (iOS/Android).

---

## 4. Technical Assumptions

* **Repository Structure:** Monorepo.
* **Service Architecture:** Serverless.
* **Testing Requirements:** Unit + Integration tests.
* **Additional Constraints:** Must be hosted on Google Cloud; must integrate with Google Cloud Vision API, MTN MoMo API, and WhatsApp.

---

## 5. Epic List

* **Epic 1: Foundation & Multi-Role Onboarding**
* **Epic 2: The Core Prescription Order Flow**
* **Epic 3: Delivery, History & Refills**
* **Epic 4: Caregiver, Provider & Pharmacy Integration**

---

## 6. Epic Details

#### **Epic 1: Foundation & Multi-Role Onboarding**
**Epic Goal:** To build the foundational infrastructure and deliver the complete user registration and authentication flow for all roles, so that each user type can log in to a placeholder portal.

* **Story 1.1: Project Scaffolding & Setup**
    * *As a* Developer, *I want* a new Monorepo project initialized with the basic folder structure, *so that* we have a clean foundation.
    * **AC:** Git repo created; Monorepo structure setup; placeholder serverless backend and web frontend created; test frameworks installed.
* **Story 1.2: User Model & Database Setup**
    * *As a* System, *I want* a secure database and a flexible user data model, *so that* we can store information for all user roles using either an email or a phone number.
    * **AC:** NoSQL database (Firestore) provisioned; User model created with optional `email` and `phoneNumber` fields (one is required); backend service can connect to DB.
* **Story 1.3: Multi-Role Registration**
    * *As a* new User, *I want* to register with either my email or phone number by selecting my role, *so that* I can access the platform.
    * **AC:** UI provides role choice (Patient/Caregiver, Doctor, Pharmacist); user can register with email OR phone number and a password; user record is created with the correct role; password is hashed.
* **Story 1.4: User Login & Authentication**
    * *As a* registered User, *I want* to log in with my email or phone number and password, *so that* I can access my account.
    * **AC:** Login screen accepts email or phone number; successful login generates a secure token and redirects to the correct role-based portal.
* **Story 1.5: Role-Based Placeholder Portals**
    * *As a* logged-in User, *I want* to be taken to a unique, role-specific portal, *so that* I see an interface relevant to my tasks.
    * **AC:** Users are directed to the correct placeholder portal (Patient, Doctor, or Pharmacist) based on their role.
* **Story 1.6: Research WhatsApp Authentication**
    * *As a* Product Manager, *I want* to investigate the feasibility of a "Sign in with WhatsApp" feature, *so that* we can determine its value for a future release.
    * **AC:** WhatsApp Business API capabilities are documented; technical requirements and costs are outlined; a recommendation is made for future inclusion.

#### **Epic 2: The Core Prescription Order Flow**
**Epic Goal:** To enable a logged-in Patient or Caregiver to submit a new prescription, have it verified, and successfully pay for it.

* **Story 2.1: Prescription Upload Interface**
    * *As a* Patient/Caregiver, *I want* a simple interface to upload a prescription by photo, file, or drag-and-drop, *so that* I can easily submit it.
    * **AC:** UI has options for camera, file browse; web UI supports drag-and-drop; user can preview image before upload.
* **Story 2.2: AI-Powered OCR Processing**
    * *As a* System, *I want* to automatically process an uploaded image using Google Cloud Vision API, *so that* the text is extracted for review.
    * **AC:** Image is securely sent to Google Cloud Vision; extracted text is saved with the order; API failures are handled gracefully.
* **Story 2.3: User Verification of Extracted Data**
    * *As a* Patient/Caregiver, *I want* to review the extracted data or skip review and send it directly to the pharmacist, *so that* I can choose between speed and verification.
    * **AC:** User is shown extracted data next to the image; UI provides clear choices to "Confirm Details" or "Skip & Send to Pharmacist"; user can edit details if they choose to confirm.
* **Story 2.4: Pharmacist Verification Portal**
    * *As a* Pharmacist, *I want* a queue of submitted prescriptions, *so that* I can review and verify them.
    * **AC:** Pharmacist Portal lists pending prescriptions; pharmacist can view image and user-confirmed data; pharmacist can approve, reject (with reason), or edit the order.
* **Story 2.5: Order Payment**
    * *As a* Patient/Caregiver, *I want* to be notified of the final price and pay for it, *so that* I can finalize my order and get a compliant receipt.
    * **AC:** User receives notification of approved order and cost; order status is "Awaiting Payment"; user can pay with Stripe, PayPal, or MTN Mobile Money; after payment, status is "Paid"; receipt conforms to the "facture normalisée du Bénin" standard.
* **Story 2.6: Request Payment from a Third Party**
    * *As a* Patient/Caregiver, *I want* to send a payment link for my order to a third party via WhatsApp or SMS, *so that* someone else can easily pay for my medication.
    * **AC:** "Request Payment" button is available on orders awaiting payment; user can enter a phone number; a secure, unique link is sent; the public page shows minimal info; successful payment updates the original user's order.

#### **Epic 3: Delivery, History & Refills**
**Epic Goal:** To implement the post-payment experience, including delivery tracking, order history, and refill management.

* **Story 3.1: Pharmacist Order Fulfillment**
    * *As a* Pharmacist, *I want* to update an order's status as I prepare it, *so that* the user is informed.
    * **AC:** Pharmacist can update order status to "Preparing" and "Ready for Delivery"; status updates are visible to the user.
* **Story 3.2: Real-Time Delivery Tracking**
    * *As a* Patient/Caregiver, *I want* to track my delivery's location on a map, *so that* I know when it will arrive.
    * **AC:** Map view with delivery person's location and an ETA is available for orders "Out for Delivery"; user receives notifications on approach/arrival.
* **Story 3.3: Order History**
    * *As a* Patient/Caregiver, *I want* a history of my past orders, *so that* I can reference them.
    * **AC:** "Order History" screen lists all past orders; user can view details and re-download the compliant receipt for any completed order.
* **Story 3.4: Refill Management**
    * *As a* Patient/Caregiver, *I want* to easily request a refill from my history, *so that* I don't have to start over.
    * **AC:** Eligible prescriptions in history have a "Request Refill" button; clicking it creates a new order and sends it for pharmacist approval.

#### **Epic 4: Caregiver, Provider & Pharmacy Integration**
**Epic Goal:** To build the advanced features that connect all user roles and integrate with pharmacy inventory.

* **Story 4.1: Caregiver Multi-Profile Management**
    * *As a* Caregiver, *I want* to manage separate profiles for each person I care for, *so that* I can keep their information organized.
    * **AC:** Caregivers can add/manage dependent profiles from their dashboard; all actions are performed in the context of the selected profile.
* **Story 4.2: Doctor Prescription Submission Portal**
    * *As a* Doctor, *I want* a simple portal to securely submit new prescriptions for my patients, *so that* I can save them time.
    * **AC:** Doctors can search for registered patients in their portal; a structured form allows them to submit new prescriptions directly to the patient's account; patient is notified.
* **Story 4.3: Pharmacy Inventory Integration**
    * *As a* System, *I want* to connect to partner pharmacy inventory systems, *so that* we can provide real-time stock data.
    * **AC:** An integration layer is built to communicate with pharmacy inventory APIs; stock levels are synced or queried; system handles API downtime.
* **Story 4.4: Medication Availability Map View**
    * *As a* Patient/Caregiver, *I want* to see which pharmacies have my medication in stock, *so that* I can choose a pharmacy and avoid delays.
    * **AC:** When ordering, a map shows nearby pharmacies with the medication in stock; user can select their preferred pharmacy; a clear message is shown if the medication is unavailable.

---

## 7. Checklist Results Report
The PM-Checklist validation has been completed. The PRD is comprehensive, logically structured, and meets all requirements for moving to the next phase. The plan is validated and ready.

---

## 8. Next Steps

#### **UX Expert Prompt**
"Sally, please review this PRD for 'PharmC'. Your task is to create a detailed UI/UX Specification based on the 'User Interface Design Goals' (Section 3). Please pay close attention to the role-based portals and the need for a simple, accessible interface for our diverse user base in Cotonou, Benin."

#### **Architect Prompt**
"Winston, please review this PRD for 'PharmC'. Your task is to create a comprehensive full-stack architecture document. The key constraints are defined in 'Technical Assumptions' (Section 4), including Google Cloud, a serverless backend, a monorepo structure, and integrations with Google Cloud Vision, WhatsApp, and the MTN MoMo API."