import { api } from './api';

export const creditsService = {
  ledger: (page = 1, limit = 20) =>
    api.get('/credits/me/ledger', { params: { page, limit } }),
};
