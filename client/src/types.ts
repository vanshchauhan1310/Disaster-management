export interface Disaster {
  id: number;
  title: string;
  location_name?: string;
  description: string;
  tags?: string[];
  created_at: string;
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
}

export interface Resource {
  id: number;
  name: string;
  location_name?: string;
  type: string;
}

export interface OfficialUpdate {
  id: number;
  title: string;
  content: string;
  source: string;
  timestamp: string;
  priority: boolean;
} 