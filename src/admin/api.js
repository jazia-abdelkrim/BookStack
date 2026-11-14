import { API_URL } from '../services/api.js';

export async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('admin-unauthorized'));
  }
  if (!response.ok) throw new Error(data.message || 'The request could not be completed.');
  return data;
}

export const adminApi = {
  stats: () => api('/admin/stats'),
  orders: (params = {}) => api(`/admin/orders?${new URLSearchParams(params)}`),
  updateOrder: (id, body) => api(`/admin/orders/${id}`, { method: 'PATCH', body }),
  customers: () => api('/admin/customers'),
  books: () => api('/books'),
  authors: () => api('/authors'),
  saveBook: (book) => book.id ? api(`/books/${book.id}`, { method: 'PUT', body: book }) : api('/books', { method: 'POST', body: book }),
  deleteBook: (id) => api(`/books/${id}`, { method: 'DELETE' }),
  saveAuthor: (author) => author.id ? api(`/authors/${author.id}`, { method: 'PUT', body: author }) : api('/authors', { method: 'POST', body: author }),
  deleteAuthor: (id) => api(`/authors/${id}`, { method: 'DELETE' }),
};
