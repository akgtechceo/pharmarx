# PharmC Fullstack Architecture Document
**Version: 1.0**
**Date: July 21, 2025**

---

## Introduction
This document outlines the complete fullstack architecture for PharmC, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for all development.

#### Change Log
| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| July 21, 2025 | 1.0 | Initial Architecture Draft | Winston, Architect |

---

## High Level Architecture

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
``` 