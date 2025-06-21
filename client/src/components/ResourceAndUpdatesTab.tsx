import React, { useState, useEffect } from 'react';
import { Shield, LifeBuoy, Building, Megaphone } from 'lucide-react';
import { fetchDisasterResources, fetchDisasterUpdates } from '../services/api';
import type { Disaster, Resource, OfficialUpdate } from '../../../types';

interface ResourceAndUpdatesTabProps {
  selectedDisaster: Disaster;
}

const iconMap: { [key: string]: React.FC<any> } = {
  medical: Building,
  rescue: LifeBuoy,
  security: Shield,
};

export function ResourceAndUpdatesTab({ selectedDisaster }: ResourceAndUpdatesTabProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [updates, setUpdates] = useState<OfficialUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getData = async () => {
      if (!selectedDisaster) return;
      try {
        setLoading(true);
        const [resourcesRes, updatesRes] = await Promise.all([
          fetchDisasterResources(selectedDisaster.id!),
          fetchDisasterUpdates(selectedDisaster.id!),
        ]);
        setResources(resourcesRes.data);
        setUpdates(updatesRes.data);
      } catch (error) {
        console.error("Error fetching resources/updates:", error);
      } finally {
        setLoading(false);
      }
    };
    getData();
  }, [selectedDisaster]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Resources */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <LifeBuoy size={20} />
            Nearby Resources
          </h2>
        </div>
        <div className="divide-y">
          {loading ? (
            <p className="p-6 text-center">Loading resources...</p>
          ) : (
            resources.map((resource) => {
              const Icon = iconMap[resource.type] || Building;
              return (
                <div key={resource.id} className="p-6 flex items-center gap-4">
                  <Icon size={24} className="text-primary-500" />
                  <div>
                    <p className="font-semibold">{resource.name}</p>
                    <p className="text-gray-500">{resource.location_name}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Official Updates */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Megaphone size={20} />
            Official Updates
          </h2>
        </div>
        <div className="divide-y">
          {loading ? (
            <p className="p-6 text-center">Loading updates...</p>
          ) : (
            updates.map((update) => (
              <div key={update.id} className="p-6">
                <p className="font-semibold">{update.title}</p>
                <p className="text-gray-600 mt-1">{update.content}</p>
                <p className="text-gray-500 text-sm mt-2">Source: {update.source}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 