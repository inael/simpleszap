import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL,
});

if (typeof window !== 'undefined') {
  api.interceptors.request.use((config) => {
    const t = localStorage.getItem('simpleszap_client_token');
    if (t) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>)['Client-Token'] = t;
    }
    return config;
  });
}

export const fetcher = (url: string) => api.get(url).then((res) => res.data);
