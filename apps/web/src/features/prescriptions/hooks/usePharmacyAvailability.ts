import { useQuery } from '@tanstack/react-query';
import { InventoryItem } from '../../../types/pharmacy.types';

interface UsePharmacyAvailabilityOptions {
  staleTime?: number;
  cacheTime?: number;
  retryCount?: number;
  rateLimitMs?: number; // Minimum time between API calls
}

interface UsePharmacyAvailabilityReturn {
  availabilityData: Record<string, InventoryItem[]>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Rate limiting utility
class RateLimiter {
  private lastCallTime: number = 0;
  public minInterval: number;

  constructor(minIntervalMs: number) {
    this.minInterval = minIntervalMs;
  }

  canMakeCall(): boolean {
    const now = Date.now();
    return now - this.lastCallTime >= this.minInterval;
  }

  recordCall(): void {
    this.lastCallTime = Date.now();
  }

  getTimeUntilNextCall(): number {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    return Math.max(0, this.minInterval - timeSinceLastCall);
  }
}

// Global rate limiter instance
const inventoryRateLimiter = new RateLimiter(1000); // 1 second between calls

export const usePharmacyAvailability = (
  medicationName: string,
  pharmacyIds: string[],
  options: UsePharmacyAvailabilityOptions = {}
): UsePharmacyAvailabilityReturn => {
  const {
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes
    retryCount = 3,
    rateLimitMs = 1000 // 1 second default
  } = options;

  // Update rate limiter if different interval is provided
  if (rateLimitMs !== 1000) {
    inventoryRateLimiter.minInterval = rateLimitMs;
  }

  const {
    data: availabilityData = {},
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['pharmacy-availability', medicationName, pharmacyIds],
    queryFn: async (): Promise<Record<string, InventoryItem[]>> => {
      // Check rate limiting
      if (!inventoryRateLimiter.canMakeCall()) {
        const waitTime = inventoryRateLimiter.getTimeUntilNextCall();
        throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds before trying again.`);
      }

      if (!medicationName || pharmacyIds.length === 0) {
        return {};
      }

      try {
        // Record the API call
        inventoryRateLimiter.recordCall();

        const response = await fetch(
          `/api/inventory/items?medicationName=${encodeURIComponent(medicationName)}&pharmacyIds=${pharmacyIds.join(',')}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch availability: ${response.statusText}`);
        }

        const data: Record<string, InventoryItem[]> = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching pharmacy availability:', error);
        throw error;
      }
    },
    enabled: !!medicationName && pharmacyIds.length > 0,
    staleTime,
    gcTime: cacheTime, // Use gcTime instead of cacheTime
    retry: retryCount,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnWindowFocus: false,
    refetchOnReconnect: true
  });

  return {
    availabilityData,
    isLoading,
    error: error as Error | null,
    refetch
  };
};