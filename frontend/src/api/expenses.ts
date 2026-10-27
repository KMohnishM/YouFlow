import api from './client';
import { Expense } from '../types';

export const getExpenses = (params?: { month?: string; category?: string; search?: string }) =>
  api.get('/expenses', { params });

export const createExpense = (data: Omit<Expense, 'id' | 'created_at'>) =>
  api.post('/expenses', data);

export const updateExpense = (id: number, data: Partial<Expense>) =>
  api.put(`/expenses/${id}`, data);

export const deleteExpense = (id: number) =>
  api.delete(`/expenses/${id}`);

export const getExpenseSummary = (month?: string) =>
  api.get('/expenses/summary', { params: { month } });
