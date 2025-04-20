import axios from 'axios';

// Set your API base URL here
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optionally add interceptors for auth, logging, etc.
// api.interceptors.request.use(...)
// api.interceptors.response.use(...)

// --- Example API Methods ---

export const getBots = async () => {
  const res = await api.get('/bots');
  return res.data;
};

export const getUserProfile = async (userId: string) => {
  const res = await api.get(`/users/${userId}`);
  return res.data;
};

export const updateUserProfile = async (userId: string, data: any) => {
  const res = await api.put(`/users/${userId}`, data);
  return res.data;
};

export const getMarketplaceItems = async () => {
  const res = await api.get('/marketplace/items');
  return res.data;
};

export const buyMarketplaceItem = async (itemId: string) => {
  const res = await api.post(`/marketplace/buy`, { itemId });
  return res.data;
};

export const getGuilds = async () => {
  const res = await api.get('/guilds');
  return res.data;
};

export const joinGuild = async (guildId: string) => {
  const res = await api.post(`/guilds/${guildId}/join`);
  return res.data;
};

export const leaveGuild = async (guildId: string) => {
  const res = await api.post(`/guilds/${guildId}/leave`);
  return res.data;
};

// Add more API methods as needed for your app

export default api;
