// Re-export pharmacy types from shared package
export type {
  InventoryItem,
  PharmacyLocation,
  MapPharmacyData,
  InventoryQueryRequest,
  InventoryQueryResponse,
  InventorySyncRequest,
  InventorySyncResponse,
  PharmacyHealthStatus,
  InventoryHealthResponse,
  PharmacyConfig
} from '@pharmarx/shared-types';

export {
  InventoryStatus,
  PharmacyIntegrationType
} from '@pharmarx/shared-types';