import { MapPharmacyData } from '../../../types/pharmacy.types';

// Google Maps API types
declare global {
  interface Window {
    google: {
      maps: {
        Map: any;
        LatLng: any;
        Marker: any;
        InfoWindow: any;
        MarkerClusterer?: any;
        places: {
          PlacesService: any;
        };
      };
    };
  }
}

export interface MapConfig {
  apiKey: string;
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface MapInstance {
  map: any;
  markers: Map<string, any>;
  infoWindows: Map<string, any>;
  clusterer?: any; // Add clusterer to the interface
}

class MapService {
  private mapInstance: MapInstance | null = null;
  private config: MapConfig | null = null;

  async initialize(config: MapConfig): Promise<void> {
    this.config = config;
    
    // Wait for Google Maps API to be available (loaded by @googlemaps/react-wrapper)
    if (!window.google?.maps) {
      throw new Error('Google Maps API not loaded. Ensure @googlemaps/react-wrapper is used to load the API.');
    }
  }

  createMap(container: HTMLElement, options?: Partial<MapConfig>): any {
    if (!this.config) {
      throw new Error('Map service not initialized. Call initialize() first.');
    }

    const mapOptions = {
      center: options?.center || this.config.center,
      zoom: options?.zoom || this.config.zoom,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      scaleControl: true,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: false,
      styles: this.getMapStyles()
    };

    const map = new window.google.maps.Map(container, mapOptions);

    this.mapInstance = {
      map,
      markers: new Map(),
      infoWindows: new Map()
    };

    return map;
  }

  private getMapStyles() {
    return [
      {
        featureType: 'poi.business',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      },
      {
        featureType: 'transit',
        elementType: 'labels.icon',
        stylers: [{ visibility: 'off' }]
      }
    ];
  }

  async getUserLocation(): Promise<UserLocation> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  addPharmacyMarkers(pharmacies: MapPharmacyData[]): void {
    if (!this.mapInstance) return;

    // Clear existing markers
    this.clearMarkers();

    // Create markers for each pharmacy
    const markers: any[] = [];
    pharmacies.forEach(pharmacy => {
      const marker = this.createPharmacyMarker(pharmacy);
      this.mapInstance!.markers.set(pharmacy.pharmacy.pharmacyId, marker);
      markers.push(marker);
    });

    // Add marker clustering if we have multiple markers
    if (markers.length > 1) {
      this.addMarkerClustering(markers);
    }
  }

  private createPharmacyMarker(pharmacy: MapPharmacyData): any {
    if (!this.mapInstance) {
      throw new Error('Map not initialized');
    }

    const position = new window.google.maps.LatLng(
      pharmacy.pharmacy.coordinates.latitude,
      pharmacy.pharmacy.coordinates.longitude
    );

    const marker = new window.google.maps.Marker({
      position,
      map: this.mapInstance.map,
      title: pharmacy.pharmacy.name,
      icon: this.getMarkerIcon(pharmacy),
      animation: window.google.maps.Animation.DROP
    });

    // Add click event listener
    window.google.maps.event.addListener(marker, 'click', () => {
      this.onMarkerClick(pharmacy, marker);
    });

    return marker;
  }

  private onMarkerClick(pharmacy: MapPharmacyData, marker: any): void {
    // Create info window content
    const content = this.createInfoWindowContent(pharmacy);
    const infoWindow = this.createInfoWindow(pharmacy, content);
    this.showInfoWindow(pharmacy.pharmacy.pharmacyId, marker);
    
    // Dispatch custom event for React components
    const event = new CustomEvent('pharmacyMarkerClick', {
      detail: { pharmacy, marker }
    });
    window.dispatchEvent(event);
  }

  private createInfoWindowContent(pharmacy: MapPharmacyData): string {
    const availabilityStatus = this.getAvailabilityStatus(pharmacy);
    const statusColor = {
      'in-stock': '#10B981',
      'low-stock': '#F59E0B', 
      'out-of-stock': '#EF4444',
      'unavailable': '#9CA3AF'
    }[availabilityStatus];

    return `
      <div style="padding: 10px; max-width: 250px;">
        <h3 style="margin: 0 0 8px 0; color: #1F2937; font-size: 16px; font-weight: 600;">
          ${pharmacy.pharmacy.name}
        </h3>
        <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 14px;">
          ${pharmacy.pharmacy.address.street}<br>
          ${pharmacy.pharmacy.address.city}, ${pharmacy.pharmacy.address.state} ${pharmacy.pharmacy.address.postalCode}
        </p>
        <div style="display: flex; align-items: center; margin: 8px 0;">
          <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${statusColor}; margin-right: 8px;"></div>
          <span style="color: #374151; font-size: 14px; text-transform: capitalize;">
            ${availabilityStatus.replace('-', ' ')}
          </span>
        </div>
        <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 14px;">
          Distance: ${pharmacy.distance.toFixed(1)} km<br>
          Est. delivery: ${pharmacy.estimatedDeliveryTime} min
        </p>
        <button 
          onclick="window.dispatchEvent(new CustomEvent('selectPharmacy', {detail: '${pharmacy.pharmacy.pharmacyId}'}))"
          style="background-color: #3B82F6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; width: 100%;">
          Select Pharmacy
        </button>
      </div>
    `;
  }

  private getMarkerIcon(pharmacy: MapPharmacyData): any {
    // In a real implementation, you'd have different marker images
    // based on availability status. For now, using a simple colored circle
    return {
      url: this.getMarkerUrl(pharmacy),
      scaledSize: new window.google.maps.Size(32, 32),
      origin: new window.google.maps.Point(0, 0),
      anchor: new window.google.maps.Point(16, 32)
    };
  }

  private getMarkerUrl(pharmacy: MapPharmacyData): string {
    const status = this.getAvailabilityStatus(pharmacy);
    
    const colors = {
      'in-stock': '#10B981', // green
      'low-stock': '#F59E0B', // yellow
      'out-of-stock': '#EF4444', // red
      'unavailable': '#9CA3AF' // gray
    };
    
    const color = colors[status] || colors.unavailable;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="12" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="16" cy="16" r="4" fill="white"/>
      </svg>
    `)}`;
  }

  private getAvailabilityStatus(pharmacy: MapPharmacyData): 'in-stock' | 'low-stock' | 'out-of-stock' | 'unavailable' {
    // This would be determined by inventory data
    // For now, returning a default status based on pharmacy data
    if (pharmacy.inventoryItems && pharmacy.inventoryItems.length > 0) {
      const totalQuantity = pharmacy.inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
      if (totalQuantity > 10) return 'in-stock';
      if (totalQuantity > 0) return 'low-stock';
      return 'out-of-stock';
    }
    return 'unavailable';
  }

  createInfoWindow(pharmacy: MapPharmacyData, content: string): any {
    if (!this.mapInstance) {
      throw new Error('Map not initialized');
    }

    const infoWindow = new window.google.maps.InfoWindow({
      content,
      maxWidth: 300
    });

    this.mapInstance.infoWindows.set(pharmacy.pharmacy.pharmacyId, infoWindow);
    return infoWindow;
  }

  showInfoWindow(pharmacyId: string, marker: any): void {
    const infoWindow = this.mapInstance?.infoWindows.get(pharmacyId);
    if (infoWindow && marker) {
      infoWindow.open(this.mapInstance!.map, marker);
    }
  }

  hideInfoWindow(pharmacyId: string): void {
    const infoWindow = this.mapInstance?.infoWindows.get(pharmacyId);
    if (infoWindow) {
      infoWindow.close();
    }
  }

  clearMarkers(): void {
    if (!this.mapInstance) return;

    this.mapInstance.markers.forEach((marker) => {
      marker.setMap(null);
    });
    this.mapInstance.markers.clear();
  }

  clearInfoWindows(): void {
    if (!this.mapInstance) return;

    this.mapInstance.infoWindows.forEach((infoWindow) => {
      infoWindow.close();
    });
    this.mapInstance.infoWindows.clear();
  }

  panToLocation(latitude: number, longitude: number): void {
    if (!this.mapInstance) return;

    const position = new window.google.maps.LatLng(latitude, longitude);
    this.mapInstance.map.panTo(position);
  }

  setZoom(zoom: number): void {
    if (!this.mapInstance) return;
    this.mapInstance.map.setZoom(zoom);
  }

  getMapBounds(): any {
    if (!this.mapInstance) return null;
    return this.mapInstance.map.getBounds();
  }

  addMapListener(event: string, callback: Function): void {
    if (!this.mapInstance) return;
    window.google.maps.event.addListener(this.mapInstance.map, event, callback);
  }

  addMarkerListener(marker: any, event: string, callback: Function): void {
    if (!marker) return;
    window.google.maps.event.addListener(marker, event, callback);
  }

  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private addMarkerClustering(markers: any[]): void {
    if (!this.mapInstance || !window.google?.maps) return;

    try {
      // Check if MarkerClusterer is available (it should be loaded with the Google Maps API)
      if (typeof window.google.maps.MarkerClusterer !== 'undefined') {
        this.mapInstance.clusterer = new window.google.maps.MarkerClusterer(
          this.mapInstance.map,
          markers,
          {
            gridSize: 50,
            minimumClusterSize: 3,
            maxZoom: 15,
            styles: this.getClusterStyles()
          }
        );
      } else {
        console.warn('MarkerClusterer not available, falling back to individual markers');
      }
    } catch (error) {
      console.warn('Failed to create marker clusterer:', error);
    }
  }

  private getClusterStyles(): any[] {
    return [
      {
        textColor: 'white',
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="#3B82F6" stroke="white" stroke-width="2"/>
            <text x="20" y="25" text-anchor="middle" font-size="14" font-weight="bold" fill="white">#</text>
          </svg>
        `),
        height: 40,
        width: 40
      },
      {
        textColor: 'white',
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="#F59E0B" stroke="white" stroke-width="2"/>
            <text x="20" y="25" text-anchor="middle" font-size="14" font-weight="bold" fill="white">#</text>
          </svg>
        `),
        height: 40,
        width: 40
      },
      {
        textColor: 'white',
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="#EF4444" stroke="white" stroke-width="2"/>
            <text x="20" y="25" text-anchor="middle" font-size="14" font-weight="bold" fill="white">#</text>
          </svg>
        `),
        height: 40,
        width: 40
      }
    ];
  }

  destroy(): void {
    if (this.mapInstance) {
      // Clear marker clusterer
      if (this.mapInstance.clusterer) {
        try {
          this.mapInstance.clusterer.clearMarkers();
        } catch (error) {
          console.warn('Failed to clear marker clusterer:', error);
        }
        this.mapInstance.clusterer = null;
      }

      // Clear all markers and their event listeners
      this.mapInstance.markers.forEach((marker, pharmacyId) => {
        try {
          // Clear all event listeners from the marker
          if (window.google?.maps?.event?.clearInstanceListeners) {
            window.google.maps.event.clearInstanceListeners(marker);
          }
          // Remove marker from map
          marker.setMap(null);
        } catch (error) {
          console.warn(`Failed to cleanup marker for pharmacy ${pharmacyId}:`, error);
        }
      });
      
      // Clear all info windows
      this.mapInstance.infoWindows.forEach((infoWindow, pharmacyId) => {
        try {
          infoWindow.close();
        } catch (error) {
          console.warn(`Failed to close info window for pharmacy ${pharmacyId}:`, error);
        }
      });
      
      // Clear collections
      this.mapInstance.markers.clear();
      this.mapInstance.infoWindows.clear();
      
      // Clear map instance
      this.mapInstance = null;
    }
    
    // Clear configuration
    this.config = null;
  }
}

export const mapService = new MapService();
export default mapService;