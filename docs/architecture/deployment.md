# Deployment Architecture

## Deployment Strategy
* **Frontend Deployment:** The React web app will be deployed to Firebase Hosting, providing a global CDN.
* **Backend Deployment:** The Express.js API will be deployed as a single Google Cloud Function.

## CI/CD Pipeline
We will use GitHub Actions to automate testing and deployment on every push to the main branch.

## Environments

| Environment | Frontend URL | Backend URL | Purpose |
|-------------|--------------|-------------|----------|
| Development | http://localhost:5173 | http://localhost:3001 | Local development. |
| Staging | staging.pharmc.app | api-staging.pharmc.app | Pre-production testing. |
| Production | app.pharmc.app | api.pharmc.app | The live application for users. |

## Final Implementation Guidelines

### Security
We will use Firebase Authentication for identity, and all API endpoints will be protected with token validation middleware.

### Testing Strategy
Our strategy requires Unit and Integration tests using Vitest for all code, with Playwright for critical E2E flows.

### Coding Standards
The critical standard is the use of shared TypeScript types from the packages/shared-types directory to ensure consistency. 