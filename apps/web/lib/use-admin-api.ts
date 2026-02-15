import { useAuth } from '@clerk/nextjs';
import { api } from './api';

export function useAdminApi() {
  const { getToken } = useAuth();

  const adminFetcher = async (url: string) => {
    const token = await getToken();
    const res = await api.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  };

  const adminPost = async (url: string, data: any) => {
    const token = await getToken();
    return api.post(url, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const adminPut = async (url: string, data: any) => {
    const token = await getToken();
    return api.put(url, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const adminDelete = async (url: string) => {
    const token = await getToken();
    return api.delete(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  return { adminFetcher, adminPost, adminPut, adminDelete };
}
