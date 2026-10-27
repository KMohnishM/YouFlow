import api from './client';

export const getStocks = () => api.get('/stocks');
export const addStock = (data: object) => api.post('/stocks', data);
export const updateStock = (id: number, data: object) => api.put(`/stocks/${id}`, data);
export const deleteStock = (id: number) => api.delete(`/stocks/${id}`);
