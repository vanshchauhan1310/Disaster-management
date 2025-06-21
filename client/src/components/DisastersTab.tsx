import React, { useState } from 'react';
import { MapPin, Users, Trash2 } from 'lucide-react';
import { createDisaster, deleteDisaster as apiDeleteDisaster } from '../services/api';
import type { Disaster } from '../../../types';

interface DisastersTabProps {
  disasters: Disaster[];
  onDisasterCreated: (disaster: Disaster) => void;
  onDisasterDeleted: (id: number) => void;
  onSelectDisaster: (disaster: Disaster) => void;
}

export function DisastersTab({ disasters, onDisasterCreated, onDisasterDeleted, onSelectDisaster }: DisastersTabProps) {
  const [loading, setLoading] = useState(false);
  const [newDisaster, setNewDisaster] = useState({
    title: '',
    location_name: '',
    description: '',
    tags: ''
  });

  const handleCreateDisaster = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const tags = newDisaster.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      const response = await createDisaster({ ...newDisaster, tags, owner_id: 'demo-user' });
      onDisasterCreated(response.data);
      setNewDisaster({ title: '', location_name: '', description: '', tags: '' });
    } catch (error) {
      console.error('Error creating disaster:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDisaster = async (id: number) => {
    try {
      await apiDeleteDisaster(id);
      onDisasterDeleted(id);
    } catch (error) {
      console.error('Error deleting disaster:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Disaster Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Create New Disaster</h2>
        <form onSubmit={handleCreateDisaster} className="space-y-4">
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
          {Array.isArray(disasters) && disasters.length > 0 ? (
            disasters.map((disaster) => (
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
                      <span>{disaster.created_at ? new Date(disaster.created_at).toLocaleDateString() : ''}</span>
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
                      onClick={() => onSelectDisaster(disaster)}
                      className="text-primary-500 hover:text-primary-600"
                    >
                      <Users size={20} />
                    </button>
                    <button
                      onClick={() => handleDeleteDisaster(disaster.id!)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-500">
              {Array.isArray(disasters) ? 'No disasters found.' : 'Loading disasters...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 