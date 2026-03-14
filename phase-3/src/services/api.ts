import axios from 'axios';
import { Review, Theme, WeeklyPulse, UserPreferences, DashboardStats } from '../types';

// Use environment variable for API URL, fallback to local development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4002/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Reviews API
export const reviewsApi = {
  scrape: (weeks: number = 12) => 
    api.post('/reviews/scrape', { weeks }),
  
  list: (params?: { week_start?: string; minRating?: number; maxRating?: number }) =>
    api.get<{ ok: boolean; reviews: Review[] }>('/reviews', { params }).then(r => ({ ...r, data: r.data.reviews })),
  
  getStats: () =>
    api.get<{ ok: boolean; stats: DashboardStats }>('/reviews/stats').then(r => ({ ...r, data: r.data.stats }))
};

// Themes API
export const themesApi = {
  generate: () =>
    api.post<{ ok: boolean; themes: Theme[] }>('/themes/generate').then(r => ({ ...r, data: r.data.themes })),
  
  list: () =>
    api.get<{ ok: boolean; themes: Theme[] }>('/themes').then(r => ({ ...r, data: r.data.themes })),
  
  assign: (week_start: string) =>
    api.post('/themes/assign', { week_start })
};

// Pulses API
export const pulsesApi = {
  generate: (week_start: string) =>
    api.post<{ ok: boolean; pulse: WeeklyPulse }>('/pulses/generate', { week_start }).then(r => ({ ...r, data: r.data.pulse })),
  
  list: (limit: number = 10) =>
    api.get<{ ok: boolean; pulses: WeeklyPulse[] }>(`/pulses?limit=${limit}`).then(r => ({ ...r, data: r.data.pulses })),
  
  get: (id: number) =>
    api.get<{ ok: boolean; pulse: WeeklyPulse }>(`/pulses/${id}`).then(r => ({ ...r, data: r.data.pulse })),
  
  sendEmail: (id: number, to?: string) =>
    api.post(`/pulses/${id}/send-email`, to ? { to } : undefined)
};

// User Preferences API
export const preferencesApi = {
  get: () =>
    api.get<{ ok: boolean; preferences: UserPreferences }>('/user-preferences').then(r => ({ ...r, data: r.data.preferences })),
  
  save: (prefs: Omit<UserPreferences, 'id' | 'created_at' | 'updated_at'>) =>
    api.post<{ ok: boolean; preferences: UserPreferences; confirmation: string }>('/user-preferences', prefs).then(r => ({ ...r, data: r.data.preferences }))
};

export default api;
