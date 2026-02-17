import React, { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { MapPin } from 'lucide-react';

interface AddressInputProps {
  label: string;
  value: string;
  onChange: (address: string, coordinates?: { lat: number; lng: number }) => void;
  placeholder?: string;
  required?: boolean;
}

export const AddressInput: React.FC<AddressInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  required,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [showMap, setShowMap] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [markerInstance, setMarkerInstance] = useState<google.maps.Marker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.warn('Google Maps API key not found. Address autocomplete will not work.');
      return;
    }

    setOptions({ key: apiKey, v: 'weekly' });
    importLibrary('places').then(() => {
      setIsLoaded(true);
    }).catch((err: unknown) => {
      console.error('Error loading Google Maps API:', err);
    });
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      fields: ['formatted_address', 'geometry'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();

      if (!place.geometry || !place.geometry.location) {
        return;
      }

      const address = place.formatted_address || '';
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      setCoordinates({ lat, lng });
      setShowMap(true);
      onChange(address, { lat, lng });

      if (mapRef.current && !mapInstance) {
        const map = new google.maps.Map(mapRef.current, {
          center: { lat, lng },
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        const marker = new google.maps.Marker({
          position: { lat, lng },
          map: map,
          title: address,
        });

        setMapInstance(map);
        setMarkerInstance(marker);
      } else if (mapInstance && markerInstance) {
        mapInstance.setCenter({ lat, lng });
        markerInstance.setPosition({ lat, lng });
        markerInstance.setTitle(address);
      }
    });
  }, [isLoaded, onChange, mapInstance, markerInstance]);

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || 'Start typing an address...'}
            required={required}
            className="w-full px-4 py-2.5 pl-10 text-base rounded-lg border border-border bg-background text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
        </div>
        {!isLoaded && (
          <p className="text-xs text-text-tertiary mt-1">
            Loading address suggestions...
          </p>
        )}
      </div>

      {showMap && coordinates && (
        <div className="rounded-lg overflow-hidden border border-border shadow-sm">
          <div
            ref={mapRef}
            className="w-full h-64"
          />
        </div>
      )}
    </div>
  );
};
