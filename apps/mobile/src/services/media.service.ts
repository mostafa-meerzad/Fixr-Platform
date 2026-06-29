import { api } from './api';

export type ExpertMediaTarget =
  | 'selfie'
  | 'tazkira_front'
  | 'tazkira_back'
  | 'shop_image'
  | 'work_license';

export const mediaService = {
  async uploadExpert(
    target: ExpertMediaTarget,
    uri: string,
    mimeType?: string,
  ): Promise<{ url: string }> {
    const ext = mimeType?.split('/')[1] ?? 'jpg';
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: `${target}.${ext}`,
      type: mimeType ?? 'image/jpeg',
    } as any);

    const { data } = await api.post<{ url: string }>(
      `/media/expert/${target}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },
};
