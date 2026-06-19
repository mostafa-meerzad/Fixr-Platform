import { api } from './api';

export const lookupService = {
  categories: () => api.get<Category[]>('/categories'),
  zones: ()      => api.get<Zone[]>('/zones'),
};

export interface Category {
  id: string;
  name: string;
  nameEn?: string;
  icon?: string;
}

export interface Zone {
  id: string;
  name: string;
  nameEn?: string;
}
