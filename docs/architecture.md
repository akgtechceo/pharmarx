Markdown

# PharmC Fullstack Architecture Document
**Version: 1.0**
**Date: July 21, 2025**

---

## 1. Introduction
This document outlines the complete fullstack architecture for PharmC, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for all development.

#### Change Log
| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| July 21, 2025 | 1.0 | Initial Architecture Draft | Winston, Architect |

---

## 2. High Level Architecture

#### Technical Summary
The architecture for PharmC will be a modern, serverless system hosted entirely on the Google Cloud Platform. It will feature a monorepo containing a responsive web application, dedicated mobile frontends, and a backend powered by decoupled, event-driven functions. This approach is designed for rapid development, scalability, and cost-efficiency.

#### Platform and Infrastructure Choice
* **Platform:** Google Cloud
* **Key Services:** Google Cloud Functions, Firestore, Firebase Authentication, Google Cloud Storage, Firebase Hosting, Google Cloud Vision API.
* **Repository Structure:** We will use a **Monorepo** managed with **Turborepo** to simplify code sharing and streamline development.

#### High Level Architecture Diagram
```mermaid
graph TD
    subgraph Users
        U[Patient / Caregiver / Doctor]
    end

    subgraph "Google Cloud Platform (GCP)"
        subgraph "Frontend"
            FH[Firebase Hosting] --> FE[Web & Mobile App];
        end

        subgraph "API & Authentication"
            APIG[API Gateway / Cloud Functions]
            AUTH[Firebase Authentication]
        end

        subgraph "Backend Services (Cloud Functions)"
            F_OCR[Prescription OCR Function]
            F_Order[Order Management Function]
            F_User[User Management Function]
            F_Notify[Notification Function]
        end

        subgraph "Data & Storage"
            DB[Firestore Database]
            CS[Cloud Storage for Images]
        end
    end

    subgraph "External Services"
        GVS[Google Vision API]
        MTN[MTN MoMo API]
        WA[WhatsApp API]
    end

    U -- Interacts with --> FE;
    FE -- Auth requests --> AUTH;
    FE -- API calls --> APIG;
    APIG -- Routes to --> F_OCR;
    APIG -- Routes to --> F_Order;
    APIG -- Routes to --> F_User;
    APIG -- Routes to --> F_Notify;
    F_User -- Reads/Writes --> DB;
    F_Order -- Reads/Writes --> DB;
    F_Order -- Interacts with --> MTN;
    F_Notify -- Interacts with --> WA;
    F_OCR -- Uploads to --> CS;
    F_OCR -- Calls --> GVS;
Architectural and Design Patterns
Serverless Architecture: Using managed functions (Google Cloud Functions) for all backend logic to eliminate server management and auto-scale.

API Gateway Pattern: A single, secure entry point for all API requests to centralize authentication, validation, and routing.

Repository Pattern: A dedicated data layer to decouple our business logic from the database (Firestore), improving testability and maintainability.

3. Tech Stack
Category	Technology	Version	Purpose & Rationale
Frontend Language	TypeScript	~5.4	For type safety and maintainability.
Frontend Framework	React (with Vite)	~18.3	For building a fast, modern, component-based UI.
UI Styling	Tailwind CSS	~3.4	For rapid, custom UI development.
State Management	Zustand	~4.5	For simple, lightweight global UI state.
Server State	TanStack Query	~5.35	For managing server state, caching, and data fetching.
Backend Language	TypeScript (Node.js)	~5.4 (~20.x)	For type safety and code sharing in the monorepo.
Backend Framework	Express.js	~4.19	For routing and middleware within Google Cloud Functions.
API Style	REST API	v1	A universally understood standard for communication.
Database	Google Firestore	(latest)	Scalable, real-time NoSQL database.
File Storage	Google Cloud Storage	(latest)	For securely storing prescription images.
Authentication	Firebase Auth	(latest)	Manages all multi-role user authentication.
Testing	Vitest	~1.6	A fast, modern testing framework for frontend and backend.
E2E Testing	Playwright	~1.44	For end-to-end testing of critical user flows.
Monorepo Tool	Turborepo	~2.0	For high-performance build and development workflows.
Infrastructure	Terraform	~1.8	For defining our Google Cloud infrastructure as code.
CI/CD	GitHub Actions	(latest)	For automating testing and deployment pipelines.
Monitoring	Google Cloud Ops	(native)	Native suite for logging and monitoring on GCP.

Export to Sheets
4. Data Models
This section defines the core TypeScript interfaces that will be shared between the frontend and backend.

User Model
TypeScript

interface User {
  uid: string;
  role: 'patient' | 'caregiver' | 'doctor' | 'pharmacist';
  email?: string;
  phoneNumber?: string;
  displayName: string;
  createdAt: Date;
}
PatientProfile Model
TypeScript

interface PatientProfile {
  profileId: string;
  managedByUid: string;
  patientName: string;
  dateOfBirth: Date;
  insuranceDetails?: {
    provider: string;
    policyNumber: string;
  };
}
PrescriptionOrder Model
TypeScript

interface PrescriptionOrder {
  orderId: string;
  patientProfileId: string;
  status: 'pending_verification' | 'awaiting_payment' | 'preparing' | 'out_for_delivery' | 'delivered' | 'rejected';
  originalImageUrl: string;
  medicationDetails: {
    name: string;
    dosage: string;
    quantity: number;
  };
  cost: number;
  createdAt: Date;
}
Payment Model
TypeScript

interface Payment {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  gateway: 'mtn' | 'stripe' | 'paypal';
  transactionId: string;
  status: 'succeeded' | 'failed';
  receiptDetails: object; // For facture normalisée data
}
5. API Specification
This is a high-level overview of the API structure using the OpenAPI 3.0 standard.

YAML

openapi: 3.0.0
info:
  title: PharmC API
  version: "1.0.0"
  description: The official API for the PharmC Prescription Delivery Service.
servers:
  - url: "[https://api.pharmc.app/v1](https://api.pharmc.app/v1)"
    description: Production Server
paths:
  /auth/register:
    post:
      summary: Register a new user.
  /auth/login:
    post:
      summary: Log in a user.
  /orders:
    post:
      summary: Create a new prescription order.
    get:
      summary: Get a list of the user's orders.
  /orders/{orderId}/request-payment:
    post:
      summary: Generate and send a payment link to a third party.
  /public/pay/{paymentToken}:
    get:
      summary: Get minimal order details for a third-party payer.
    post:
      summary: Process a payment from a third-party payer.
  /provider/prescriptions:
    post:
      summary: Allow a doctor to submit a new prescription.
  /pharmacist/queue:
    get:
      summary: Get the queue of prescriptions awaiting verification.
  /pharmacist/orders/{orderId}/verify:
    post:
      summary: Approve or reject a prescription.
12. Unified Project Structure
This is the definitive folder structure for our Turborepo monorepo.

Plaintext

pharmc-monorepo/
├── apps/
│   ├── api/                # The Express.js backend for GCP Cloud Functions
│   │   ├── src/
│   │   │   ├── features/
│   │   │   ├── middleware/
│   │   │   └── index.ts
│   │   └── package.json
│   └── web/                # The React (Vite) frontend application
│       ├── src/
│       │   ├── components/
│       │   ├── features/
│       │   └── main.tsx
│       └── package.json
│
├── packages/
│   ├── shared-types/       # Shared TypeScript interfaces (User, Order)
│   │   └── index.ts
│   ├── eslint-config/
│   └── tsconfig/
│
├── infra/
│   └── terraform/          # Our Terraform (IaC) files for Google Cloud
│
├── package.json
├── turbo.json
└── tsconfig.json
14. Deployment Architecture
Deployment Strategy
Frontend Deployment: The React web app will be deployed to Firebase Hosting, providing a global CDN.

Backend Deployment: The Express.js API will be deployed as a single Google Cloud Function.

CI/CD Pipeline
We will use GitHub Actions to automate testing and deployment on every push to the main branch.

Environments
Environment	Frontend URL	Backend URL	Purpose
Development	http://localhost:5173	http://localhost:3001	Local development.
Staging	staging.pharmc.app	api-staging.pharmc.app	Pre-production testing.
Production	app.pharmc.app	api.pharmc.app	The live application for users.

Export to Sheets
15. Final Implementation Guidelines
Security: We will use Firebase Authentication for identity, and all API endpoints will be protected with token validation middleware.

Testing Strategy: Our strategy requires Unit and Integration tests using Vitest for all code, with Playwright for critical E2E flows.

Coding Standards: The critical standard is the use of shared TypeScript types from the packages/shared-types directory to ensure consistency.