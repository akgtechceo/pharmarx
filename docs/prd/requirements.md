# Requirements

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