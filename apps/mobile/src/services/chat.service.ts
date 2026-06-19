import { api } from './api';

export const chatService = {
  getToken: (jobId: string) =>
    api.get<ChatTokenResponse>(`/chat/token/${jobId}`),
};

export interface ChatTokenResponse {
  token: string;
  channelId: string;
  channelType: string;
  apiKey: string;
}
