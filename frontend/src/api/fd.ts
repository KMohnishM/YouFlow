import api from './client';

export const getFDs = () => api.get('/fd');
export const addFD = (data: object) => api.post('/fd', data);
export const updateFD = (id: number, data: object) => api.put(`/fd/${id}`, data);
export const deleteFD = (id: number) => api.delete(`/fd/${id}`);
