# Project Structure

This is the definitive folder structure for our Turborepo monorepo.

```plaintext
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
``` 