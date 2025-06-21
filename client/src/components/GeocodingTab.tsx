import React, { useState } from 'react';
import { Map, Search, Navigation, ExternalLink } from 'lucide-react';
import { geocodeLocation } from '../services/api';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface GeocodeResponse {
  success: boolean;
  location: string;
  coordinates: [number, number];
  message?: string;
}

// Fix default marker icon for leaflet in React (for Vite/Bun)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export function GeocodingTab() {
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<GeocodeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGeocode = async () => {
    if (!description.trim()) {
      setError('Please enter a location description.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await geocodeLocation(description);
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to geocode the location.');
      console.error('Geocoding error:', err);
    } finally {
      setLoading(false);
    }
  };

  const openInGoogleMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const openInGoogleMapsDirections = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const openInGoogleMapsEmbed = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${lat},${lng}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Map size={20} />
        <h2 className="text-lg font-semibold">Google Maps Geocoding</h2>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter a location (e.g., 'Times Square, New York', 'Eiffel Tower, Paris', 'Mumbai Central Station')"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </div>
        
        <button 
          onClick={handleGeocode} 
          disabled={loading || !description.trim()} 
          className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Search size={16} />
          {loading ? 'Geocoding...' : 'Find Location'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      {result && result.success && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <h3 className="font-semibold text-green-800 mb-2">Location Found</h3>
            <p className="text-green-700 mb-2">
              <strong>Address:</strong> {result.location}
            </p>
            <p className="text-green-700">
              <strong>Coordinates:</strong> {result.coordinates[1].toFixed(6)}, {result.coordinates[0].toFixed(6)}
            </p>
            {result.message && (
              <p className="text-green-600 text-sm mt-2">{result.message}</p>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => openInGoogleMaps(result.coordinates[1], result.coordinates[0])}
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2"
            >
              <Map size={16} />
              View on Google Maps
            </button>
            <button
              onClick={() => openInGoogleMapsDirections(result.coordinates[1], result.coordinates[0])}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2"
            >
              <Navigation size={16} />
              Get Directions
            </button>
            <button
              onClick={() => openInGoogleMapsEmbed(result.coordinates[1], result.coordinates[0])}
              className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 flex items-center gap-2"
            >
              <ExternalLink size={16} />
              Embed Map
            </button>
          </div>
          
          <div className="bg-gray-50 rounded-md p-4">
            <h4 className="font-medium text-gray-800 mb-2">Map Preview</h4>
            <div className="aspect-video rounded-md overflow-hidden bg-gray-100 flex items-center justify-center" style={{ minHeight: 300 }}>
              <MapContainer
                center={[result.coordinates[1], result.coordinates[0]]}
                zoom={13}
                style={{ width: '100%', height: 300 }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
                />
                <Marker position={[result.coordinates[1], result.coordinates[0]]}>
                  <Popup>
                    {result.location}<br />
                    [{result.coordinates[1].toFixed(6)}, {result.coordinates[0].toFixed(6)}]
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h3 className="font-medium text-blue-800 mb-2">How to use:</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Enter any location description (address, landmark, city, etc.)</li>
          <li>• Click "Find Location" to get precise coordinates</li>
          <li>• Use the buttons to view the location on Google Maps</li>
          <li>• Get directions to the location from your current position</li>
        </ul>
      </div>
    </div>
  );
} 