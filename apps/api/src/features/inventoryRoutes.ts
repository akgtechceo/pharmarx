import { Router, Request, Response } from 'express';
import { InventoryService } from './inventoryService';
import { 
  InventoryQueryRequest, 
  InventorySyncRequest,
  UserRole 
} from '@pharmarx/shared-types';

const router = Router();
const inventoryService = new InventoryService();

// Middleware to check if user is a pharmacist
const requirePharmacist = (req: Request, res: Response, next: Function) => {
  const user = req.user as any;
  if (!user || user.role !== UserRole.Pharmacist) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Pharmacist role required.'
    });
  }
  next();
};

// GET /api/inventory/items - Query inventory items with filters
router.get('/items', async (req: Request, res: Response) => {
  try {
    const queryRequest: InventoryQueryRequest = {
      medicationName: req.query.medicationName as string,
      genericName: req.query.genericName as string,
      dosage: req.query.dosage as string,
      form: req.query.form as string,
      pharmacyIds: req.query.pharmacyIds ? (req.query.pharmacyIds as string).split(',') : undefined,
      includeUnavailable: req.query.includeUnavailable === 'true',
      location: req.query.latitude && req.query.longitude && req.query.radiusKm ? {
        latitude: parseFloat(req.query.latitude as string),
        longitude: parseFloat(req.query.longitude as string),
        radiusKm: parseFloat(req.query.radiusKm as string)
      } : undefined
    };

    const result = await inventoryService.queryInventory(queryRequest);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error querying inventory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to query inventory'
    });
  }
});

// GET /api/inventory/pharmacies - Get pharmacy locations and status
router.get('/pharmacies', async (req: Request, res: Response) => {
  try {
    const locations = await inventoryService.getPharmacyLocations();

    res.json({
      success: true,
      data: {
        locations,
        totalCount: locations.length
      }
    });
  } catch (error) {
    console.error('Error fetching pharmacy locations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pharmacy locations'
    });
  }
});

// POST /api/inventory/sync - Trigger manual inventory sync (Pharmacist only)
router.post('/sync', requirePharmacist, async (req: Request, res: Response) => {
  try {
    const syncRequest: InventorySyncRequest = {
      pharmacyIds: req.body.pharmacyIds,
      forceSync: req.body.forceSync || false
    };

    const result = await inventoryService.syncInventory(syncRequest);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error syncing inventory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync inventory'
    });
  }
});

// GET /api/inventory/health - Check pharmacy integration health (Pharmacist only)
router.get('/health', requirePharmacist, async (req: Request, res: Response) => {
  try {
    const healthStatus = await inventoryService.checkHealth();

    res.json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    console.error('Error checking inventory health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check inventory health'
    });
  }
});

// GET /api/inventory/config - Get inventory configuration (Pharmacist only)
router.get('/config', requirePharmacist, async (req: Request, res: Response) => {
  try {
    const config = inventoryService.getConfig();
    const pharmacyConfigs = inventoryService.getAllPharmacyConfigs();

    res.json({
      success: true,
      data: {
        config,
        pharmacyConfigs
      }
    });
  } catch (error) {
    console.error('Error fetching inventory config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory configuration'
    });
  }
});

// POST /api/inventory/config/pharmacy - Add or update pharmacy configuration (Pharmacist only)
router.post('/config/pharmacy', requirePharmacist, async (req: Request, res: Response) => {
  try {
    const pharmacyConfig = req.body;
    
    if (!pharmacyConfig.pharmacyId) {
      return res.status(400).json({
        success: false,
        error: 'Pharmacy ID is required'
      });
    }

    const success = inventoryService.updatePharmacyConfig(pharmacyConfig);

    if (success) {
      res.json({
        success: true,
        message: 'Pharmacy configuration updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to update pharmacy configuration'
      });
    }
  } catch (error) {
    console.error('Error updating pharmacy config:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update pharmacy configuration'
    });
  }
});

// DELETE /api/inventory/config/pharmacy/:pharmacyId - Remove pharmacy configuration (Pharmacist only)
router.delete('/config/pharmacy/:pharmacyId', requirePharmacist, async (req: Request, res: Response) => {
  try {
    const { pharmacyId } = req.params;
    
    const success = inventoryService.removePharmacyConfig(pharmacyId);

    if (success) {
      res.json({
        success: true,
        message: 'Pharmacy configuration removed successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Pharmacy configuration not found'
      });
    }
  } catch (error) {
    console.error('Error removing pharmacy config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove pharmacy configuration'
    });
  }
});

// GET /api/inventory/config/pharmacy/:pharmacyId - Get specific pharmacy configuration (Pharmacist only)
router.get('/config/pharmacy/:pharmacyId', requirePharmacist, async (req: Request, res: Response) => {
  try {
    const { pharmacyId } = req.params;
    
    const config = inventoryService.getPharmacyConfig(pharmacyId);

    if (config) {
      res.json({
        success: true,
        data: config
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Pharmacy configuration not found'
      });
    }
  } catch (error) {
    console.error('Error fetching pharmacy config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pharmacy configuration'
    });
  }
});

export default router;