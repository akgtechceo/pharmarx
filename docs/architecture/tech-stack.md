# Tech Stack

| Category | Technology | Version | Purpose & Rationale |
|----------|------------|---------|-------------------|
| Frontend Language | TypeScript | ~5.4 | For type safety and maintainability. |
| Frontend Framework | React (with Vite) | ~18.3 | For building a fast, modern, component-based UI. |
| UI Styling | Tailwind CSS | ~3.4 | For rapid, custom UI development. |
| State Management | Zustand | ~4.5 | For simple, lightweight global UI state. |
| Server State | TanStack Query | ~5.35 | For managing server state, caching, and data fetching. |
| Backend Language | TypeScript (Node.js) | ~5.4 (~20.x) | For type safety and code sharing in the monorepo. |
| Backend Framework | Express.js | ~4.19 | For routing and middleware within Google Cloud Functions. |
| API Style | REST API | v1 | A universally understood standard for communication. |
| Database | Google Firestore | (latest) | Scalable, real-time NoSQL database. |
| File Storage | Google Cloud Storage | (latest) | For securely storing prescription images. |
| Authentication | Firebase Auth | (latest) | Manages all multi-role user authentication. |
| Testing | Vitest | ~1.6 | A fast, modern testing framework for frontend and backend. |
| E2E Testing | Playwright | ~1.44 | For end-to-end testing of critical user flows. |
| Monorepo Tool | Turborepo | ~2.0 | For high-performance build and development workflows. |
| Infrastructure | Terraform | ~1.8 | For defining our Google Cloud infrastructure as code. |
| CI/CD | GitHub Actions | (latest) | For automating testing and deployment pipelines. |
| Monitoring | Google Cloud Ops | (native) | Native suite for logging and monitoring on GCP. | 