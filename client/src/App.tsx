import React, { useState, useEffect, useCallback } from 'react';
import { List, Rss, Map, ShieldCheck, LifeBuoy } from 'lucide-react';
import { Header } from './components/Header';
import { TabButton } from './components/TabButton';
import { DisastersTab } from './components/DisastersTab';
import { SocialFeedTab } from './components/SocialFeedTab';
import { GeocodingTab } from './components/GeocodingTab';
import { VerificationTab } from './components/VerificationTab';
import { ResourceAndUpdatesTab } from './components/ResourceAndUpdatesTab';
import { useWebSocket } from './hooks/useWebSocket';
import { fetchDisasters } from './services/api';
import type { Disaster } from '../../types';

type TabId = 'disasters' | 'social' | 'geocode' | 'verify' | 'resources';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('disasters');
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [selectedDisaster, setSelectedDisaster] = useState<Disaster | null>(null);
  const [loading, setLoading] = useState(true);

  // WebSocket handlers with useCallback to prevent unnecessary re-renders
  const handleNewDisaster = useCallback((newDisaster: Disaster) => {
    setDisasters((prev) => [newDisaster, ...prev]);
  }, []);

  const handleUpdateDisaster = useCallback((updatedDisaster: Disaster) => {
    setDisasters((prev) =>
      prev.map((d) => (d.id === updatedDisaster.id ? updatedDisaster : d))
    );
  }, []);

  const handleDeleteDisaster = useCallback((deletedDisasterId: number) => {
    setDisasters((prev) => prev.filter((d) => d.id !== deletedDisasterId));
  }, []);

  // WebSocket connection and handlers
  const { isConnected: wsConnected, reconnect: wsReconnect } = useWebSocket(
    handleNewDisaster,
    handleUpdateDisaster,
    handleDeleteDisaster
  );

  // Initial data fetch
  useEffect(() => {
    const getDisasters = async () => {
      try {
        setLoading(true);
        const response = await fetchDisasters();
        console.log('API Response:', response);
        console.log('Response data:', response.data);
        
        // Ensure disasters is always an array
        const disastersData = Array.isArray(response.data) ? response.data : [];
        console.log('Processed disasters:', disastersData);
        
        setDisasters(disastersData);
      } catch (error) {
        console.error('Error fetching disasters:', error);
        setDisasters([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };
    getDisasters();
  }, []);

  const handleSelectDisaster = (disaster: Disaster) => {
    setSelectedDisaster(disaster);
    setActiveTab('resources');
  };

  const renderTabContent = () => {
    if (loading && activeTab === 'disasters') {
      return <p className="text-center p-6">Loading disasters...</p>;
    }
    switch (activeTab) {
      case 'disasters':
        return (
          <DisastersTab
            disasters={disasters}
            onDisasterCreated={(newDisaster) => setDisasters((prev) => [newDisaster, ...prev])}
            onDisasterDeleted={(id) => setDisasters((prev) => prev.filter((d) => d.id !== id))}
            onSelectDisaster={handleSelectDisaster}
          />
        );
      case 'social':
        return <SocialFeedTab />;
      case 'geocode':
        return <GeocodingTab />;
      case 'verify':
        return <VerificationTab />;
      case 'resources':
        return selectedDisaster ? (
          <ResourceAndUpdatesTab selectedDisaster={selectedDisaster} />
        ) : (
          <p className="text-center p-6">Select a disaster to see resources.</p>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      <Header wsConnected={wsConnected} onReconnect={wsReconnect} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Navigation */}
          <div className="w-full md:w-64">
            <div className="bg-white rounded-lg shadow p-4 space-y-2">
              <TabButton id="disasters" icon={List} label="Disasters" active={activeTab === 'disasters'} onClick={() => setActiveTab('disasters')} />
              <TabButton id="social" icon={Rss} label="Social Feed" active={activeTab === 'social'} onClick={() => setActiveTab('social')} />
              <TabButton id="geocode" icon={Map} label="Geocoding" active={activeTab === 'geocode'} onClick={() => setActiveTab('geocode')} />
              <TabButton id="verify" icon={ShieldCheck} label="Verification" active={activeTab === 'verify'} onClick={() => setActiveTab('verify')} />
              <TabButton
                id="resources"
                icon={LifeBuoy}
                label="Resources"
                active={activeTab === 'resources'}
                onClick={() => setActiveTab('resources')}
                disabled={!selectedDisaster}
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {renderTabContent()}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;