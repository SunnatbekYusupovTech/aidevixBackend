import axiosInstance from './axiosInstance';

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export const pushApi = {
  getVapidKey: () =>
    axiosInstance.get<{ success: boolean; data: { publicKey: string | null } }>('push/vapid-public-key'),

  subscribe: (subscription: PushSubscriptionJSON) =>
    axiosInstance.post<{ success: boolean; message: string }>('push/subscribe', subscription),

  unsubscribe: (endpoint: string) =>
    axiosInstance.post<{ success: boolean; message: string }>('push/unsubscribe', { endpoint }),
};
