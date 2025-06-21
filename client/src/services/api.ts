import axios from 'axios';
import type { Disaster, SocialPost, Resource, OfficialUpdate, GeocodeResult } from '../../../types';

const api = axios.create({
  baseURL: '/api',
});

// Disaster endpoints
export const fetchDisasters = () => api.get<Disaster[]>('/disasters');
export const createDisaster = (data: Omit<Disaster, 'id' | 'created_at'>) => api.post<Disaster>('/disasters', data);
export const deleteDisaster = (id: number) => api.delete(`/disasters/${id}`);

// Resource and Update endpoints
export const fetchDisasterResources = (disasterId: number) => api.get<Resource[]>(`/disasters/${disasterId}/resources`);
export const fetchDisasterUpdates = (disasterId: number) => api.get<OfficialUpdate[]>(`/disasters/${disasterId}/official-updates`);

// Tool endpoints
export const geocodeLocation = (location: string) => api.post<any>('/geocode', { location });
export const verifyImage = (imageUrl: string) => api.post<any>('/verify-image', { imageUrl });

// Social media endpoint
export const fetchSocialPosts = () => api.get<SocialPost[]>('/social'); 