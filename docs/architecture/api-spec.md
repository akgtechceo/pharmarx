# API Specification

This is a high-level overview of the API structure using the OpenAPI 3.0 standard.

```yaml
openapi: 3.0.0
info:
  title: PharmC API
  version: "1.0.0"
  description: The official API for the PharmC Prescription Delivery Service.
servers:
  - url: "https://api.pharmc.app/v1"
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
``` 