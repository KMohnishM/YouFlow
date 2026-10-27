import api from './client';

export const getMF = () => api.get('/mf');
export const searchFunds = (q: string) => api.get('/mf/search', { params: { q } });
export const addMF = (data: object) => api.post('/mf', data);
export const updateMF = (id: number, data: object) => api.put(`/mf/${id}`, data);
export const deleteMF = (id: number) => api.delete(`/mf/${id}`);
