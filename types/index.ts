// --- Type Definitions ---
export interface Disaster {
  id?: number;
  title: string;
  location_name?: string;
  location?: string;
  description: string;
  tags?: string[];
  owner_id: string;
  created_at?: string;
  audit_trail?: any[];
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'contributor';
}

export interface SocialPost {
  id: number;
  platform: string;
  username: string;
  content: string;
  timestamp: string;
  priority: boolean;
  location: string;
  verified: boolean;
  disaster_id?: number;
}

export interface Resource {
  id?: number;
  disaster_id?: number;
  name: string;
  location_name?: string;
  location?: string;
  type: string;
  created_at?: string;
}

export interface OfficialUpdate {
  id: number;
  disaster_id: number;
  title: string;
  content: string;
  source: string;
  timestamp: string;
  priority: boolean;
}

export interface RequestBody {
  title?: string;
  location_name?: string;
  location?: string;
  description?: string;
  tags?: string[];
  imageUrl?: string;
  lat?: number;
  lon?: number;
  radius?: number;
}

export interface GeocodeResult {
  locationName: string;
  coords: [number, number];
} 