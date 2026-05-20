import axios from 'axios';
import type { ApiResponse } from '@sinyalapi/types';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export const get = async <T>(url: string): Promise<ApiResponse<T>> => {
  const response = await apiClient.get(url);
  return response.data;
};

export const post = async <T>(url: string, data: unknown): Promise<ApiResponse<T>> => {
  const response = await apiClient.post(url, data);
  return response.data;
};

export const put = async <T>(url: string, data: unknown): Promise<ApiResponse<T>> => {
  const response = await apiClient.put(url, data);
  return response.data;
};

export const del = async <T>(url: string): Promise<ApiResponse<T>> => {
  const response = await apiClient.delete(url);
  return response.data;
};

export default apiClient;
