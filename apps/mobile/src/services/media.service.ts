import { api } from './api';

export type ExpertMediaTarget =
  | 'selfie'
  | 'tazkira_front'
  | 'tazkira_back'
  | 'shop_image'
  | 'work_license';

export const mediaService = {
  async uploadJobMedia(
    jobId: string,
    uri: string,
    mimeType?: string,
  ): Promise<{ id: string; url: string; type: string }> {
    const ext = mimeType?.split('/')[1] ?? 'jpg';
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: `media.${ext}`,
      type: mimeType ?? 'image/jpeg',
    } as any);

    const { data } = await api.post<{ id: string; url: string; type: string }>(
      `/media/jobs/${jobId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },

  async deleteJobMedia(mediaId: string): Promise<void> {
    await api.delete(`/media/jobs/media/${mediaId}`);
  },

  async uploadAvatar(uri: string, mimeType?: string): Promise<{ url: string }> {
    const ext = mimeType?.split('/')[1] ?? 'jpg';
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: `avatar.${ext}`,
      type: mimeType ?? 'image/jpeg',
    } as any);

    const { data } = await api.post<{ url: string }>(
      '/media/avatar',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },

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
