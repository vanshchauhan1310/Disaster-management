import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, MapPin, Users, MessageSquare, Shield, Globe, Trash2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Disaster {
  id: number;
  title: string;
  location_name?: string;
  description: string;
  tags?: string[];
  created_at: string;
}

interface SocialPost {
  id: number;
  platform: string;
  username: string;
  content: string;
  timestamp: string;
  priority: boolean;
  location: string;
  verified: boolean;
}

interface Resource {
  id: number;
  name: string;
  location_name?: string;
  type: string;
}

interface OfficialUpdate {
  id: number;
  title: string;
  content: string;
  source: string;
  timestamp: string;
  priority: boolean;
}

interface GeocodeResult {
  locationName: string;
  coords: [number, number];
}

function App() {
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [officialUpdates, setOfficialUpdates] = useState<OfficialUpdate[]>([]);
  const [selectedDisaster, setSelectedDisaster] = useState<Disaster | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('disasters');
  const [wsConnected, setWsConnected] = useState(false);

  // Form states
  const [newDisaster, setNewDisaster] = useState({
    title: '',
    location_name: '',
    description: '',
    tags: ''
  });

  const [geocodeInput, setGeocodeInput] = useState('');
  const [geocodeResult, setGeocodeResult] = useState<GeocodeResult | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [verificationResult, setVerificationResult] = useState<any>(null);

  // WebSocket connection
  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setWsConnected(true);
      console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WebSocket message:', data);
      
      if (data.type === 'disaster:new') {
        setDisasters(prev => [...prev, data.data]);
      } else if (data.type === 'disaster:update') {
        setDisasters(prev => prev.map(d => d.id === data.data.id ? data.data : d));
      } else if (data.type === 'disaster:delete') {
        setDisasters(prev => prev.filter(d => d.id !== data.data));
      }
    };
    
    ws.onclose = () => {
      setWsConnected(false);
      console.log('WebSocket disconnected');
    };
    
    return () => ws.close();
  }, []);

  // Load initial data
  useEffect(() => {
    fetchDisasters();
    fetchSocialPosts();
  }, []);

  const fetchDisasters = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/disasters');
      setDisasters(response.data);
    } catch (error) {
      console.error('Error fetching disasters:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSocialPosts = async () => {
    try {
      const response = await axios.get('/api/social');
      setSocialPosts(response.data);
    } catch (error) {
      console.error('Error fetching social posts:', error);
    }
  };

  const createDisaster = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const tags = newDisaster.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      const response = await axios.post('/api/disasters', {
        ...newDisaster,
        tags
      });
      setDisasters(prev => [...prev, response.data]);
      setNewDisaster({ title: '', location_name: '', description: '', tags: '' });
    } catch (error) {
      console.error('Error creating disaster:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteDisaster = async (id: number) => {
    try {
      await axios.delete(`/api/disasters/${id}`);
      setDisasters(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      console.error('Error deleting disaster:', error);
    }
  };

  const geocodeLocation = async () => {
    try {
      const response = await axios.post('/api/geocode', {
        description: geocodeInput
      });
      setGeocodeResult(response.data);
    } catch (error) {
      console.error('Error geocoding:', error);
    }
  };

  const verifyImage = async () => {
    try {
      // Use the new, general-purpose endpoint. No disaster ID needed.
      const response = await axios.post(`/api/verify-image`, {
        imageUrl
      });
      setVerificationResult(response.data);
    } catch (error) {
      console.error('Error verifying image:', error);
    }
  };

  const fetchDisasterResources = async (disasterId: number) => {
    try {
      const response = await axios.get(`/api/disasters/${disasterId}/resources`);
      setResources(response.data);
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

  const fetchDisasterUpdates = async (disasterId: number) => {
    try {
      const response = await axios.get(`/api/disasters/${disasterId}/official-updates`);
      setOfficialUpdates(response.data);
    } catch (error) {
      console.error('Error fetching updates:', error);
    }
  };

  const TabButton = ({ id, icon: Icon, label, active, disabled }: { id: string; icon: any; label: string; active: boolean; disabled?: boolean; }) => (
    <button
      onClick={() => setActiveTab(id)}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        active ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <Icon size={20} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-500" size={24} />
              <h1 className="text-xl font-semibold text-gray-900">Disaster Response Platform</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                {wsConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8">
          <TabButton id="disasters" icon={AlertTriangle} label="Disasters" active={activeTab === 'disasters'} />
          <TabButton id="social" icon={MessageSquare} label="Social Media" active={activeTab === 'social'} />
          <TabButton id="resources" icon={Users} label="Resources" active={activeTab === 'resources'} disabled={!selectedDisaster} />
          <TabButton id="updates" icon={Shield} label="Official Updates" active={activeTab === 'updates'} disabled={!selectedDisaster} />
          <TabButton id="geocode" icon={Globe} label="Geocoding" active={activeTab === 'geocode'} />
          <TabButton id="verification" icon={Shield} label="Image Verification" active={activeTab === 'verification'} />
        </div>

        {/* Disasters Tab */}
        {activeTab === 'disasters' && (
          <div className="space-y-6">
            {/* Create Disaster Form */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Create New Disaster</h2>
              <form onSubmit={createDisaster} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Title"
                    value={newDisaster.title}
                    onChange={(e) => setNewDisaster(prev => ({ ...prev, title: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Location"
                    value={newDisaster.location_name}
                    onChange={(e) => setNewDisaster(prev => ({ ...prev, location_name: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <textarea
                  placeholder="Description"
                  value={newDisaster.description}
                  onChange={(e) => setNewDisaster(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  required
                />
                <input
                  type="text"
                  placeholder="Tags (comma-separated)"
                  value={newDisaster.tags}
                  onChange={(e) => setNewDisaster(prev => ({ ...prev, tags: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Disaster'}
                </button>
              </form>
            </div>

            {/* Disasters List */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold">Active Disasters</h2>
              </div>
              <div className="divide-y">
                {disasters.map((disaster) => (
                  <div key={disaster.id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium">{disaster.title}</h3>
                        <p className="text-gray-600 mt-1">{disaster.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin size={16} />
                            {disaster.location_name || 'No location'}
                          </span>
                          <span>{new Date(disaster.created_at).toLocaleDateString()}</span>
                        </div>
                        {disaster.tags && disaster.tags.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {disaster.tags.map((tag, index) => (
                              <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedDisaster(disaster);
                            fetchDisasterResources(disaster.id);
                            fetchDisasterUpdates(disaster.id);
                            setActiveTab('resources'); // Switch to resources tab on selection
                          }}
                          className="text-primary-500 hover:text-primary-600"
                        >
                          <Users size={20} />
                        </button>
                        <button
                          onClick={() => deleteDisaster(disaster.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Disaster Details - This section is now replaced by dedicated tabs */}
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && selectedDisaster && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              Resources for <span className="text-primary-500">{selectedDisaster.title}</span>
            </h2>
            <div className="space-y-2">
              {resources.length > 0 ? resources.map((resource) => (
                <div key={resource.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{resource.name}</p>
                    <p className="text-sm text-gray-600">{resource.type}</p>
                  </div>
                </div>
              )) : <p>No resources found for this disaster.</p>}
            </div>
          </div>
        )}

        {/* Official Updates Tab */}
        {activeTab === 'updates' && selectedDisaster && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              Official Updates for <span className="text-primary-500">{selectedDisaster.title}</span>
            </h2>
            <div className="space-y-3">
              {officialUpdates.length > 0 ? officialUpdates.map((update) => (
                <div key={update.id} className="p-3 bg-gray-50 rounded">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">{update.title}</h4>
                    {update.priority && (
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Priority</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{update.content}</p>
                  <p className="text-xs text-gray-500 mt-2">Source: {update.source}</p>
                </div>
              )) : <p>No official updates found for this disaster.</p>}
            </div>
          </div>
        )}

        {/* Social Media Tab */}
        {activeTab === 'social' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Social Media Feed</h2>
            </div>
            <div className="divide-y">
              {socialPosts.map((post) => (
                <div key={post.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{post.username}</span>
                        <span className="text-sm text-gray-500">@{post.platform}</span>
                        {post.verified && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Verified</span>
                        )}
                        {post.priority && (
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Priority</span>
                        )}
                      </div>
                      <p className="text-gray-800">{post.content}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>{post.location}</span>
                        <span>{new Date(post.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Geocoding Tab */}
        {activeTab === 'geocode' && (
          <div className="space-y-6">
            {/* Geocoding Form */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Location Geocoding</h2>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter location description..."
                    value={geocodeInput}
                    onChange={(e) => setGeocodeInput(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={geocodeLocation}
                    className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600"
                  >
                    Geocode
                  </button>
                </div>
                {geocodeResult && (
                  <div className="p-4 bg-gray-50 rounded">
                    <h3 className="font-medium mb-2">Result:</h3>
                    <p><strong>Location:</strong> {geocodeResult.locationName}</p>
                    <p><strong>Coordinates (Lat, Lon):</strong> {geocodeResult.coords ? [geocodeResult.coords[1], geocodeResult.coords[0]].join(', ') : 'N/A'}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Map Display */}
            {geocodeResult && geocodeResult.coords && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Location on Map</h3>
                <div className="h-96 rounded-lg overflow-hidden">
                  <MapContainer
                    center={[geocodeResult.coords[1], geocodeResult.coords[0]]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <Marker position={[geocodeResult.coords[1], geocodeResult.coords[0]]}>
                      <Popup>
                        <div>
                          <h4 className="font-medium">{geocodeResult.locationName}</h4>
                          <p className="text-sm text-gray-600">
                            Lat: {geocodeResult.coords[1].toFixed(4)}, Lon: {geocodeResult.coords[0].toFixed(4)}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Image Verification Tab */}
        {activeTab === 'verification' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Image Verification</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Image URL..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={verifyImage}
                className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600"
              >
                Verify Image
              </button>
              {verificationResult && (
                <div className="p-4 bg-gray-50 rounded">
                  <h3 className="font-medium mb-2">Verification Result:</h3>
                  <p><strong>Authenticity Score:</strong> {verificationResult.authenticityScore ?? 'N/A'}</p>
                  <p><strong>Likely Authentic:</strong> {verificationResult.isLikelyAuthentic ? 'Yes' : 'No'}</p>
                  <p><strong>Analysis:</strong> {verificationResult.analysis}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;