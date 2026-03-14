declare namespace mapboxgl {
  class Map {
    constructor(options: {
      container: HTMLElement;
      style: string;
      center: [number, number];
      zoom: number;
      attributionControl?: boolean;
    });
    on(event: string, callback: () => void): void;
    remove(): void;
    flyTo(options: {
      center: [number, number];
      zoom: number;
      duration?: number;
    }): void;
  }

  class Marker {
    constructor(options?: { element?: HTMLElement });
    setLngLat(lngLat: [number, number]): Marker;
    setPopup(popup: Popup): Marker;
    addTo(map: Map): Marker;
    getElement(): HTMLElement;
    remove(): void;
  }

  class Popup {
    constructor(options?: {
      offset?: number;
      closeButton?: boolean;
      closeOnClick?: boolean;
    });
    setHTML(html: string): Popup;
  }

  let accessToken: string;
}

interface Window {
  mapboxgl: typeof mapboxgl;
}
