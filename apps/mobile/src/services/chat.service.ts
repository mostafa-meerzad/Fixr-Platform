import { api } from './api';

export const chatService = {
  getToken: (jobId: string) =>
    api.get<ChatTokenResponse>(`/chat/jobs/${jobId}/token`),
};

export interface ChatTokenResponse {
  token: string;
  channelId: string;
  channelType: string;
  apiKey: string;
}
