const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5001/api');

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'The request could not be completed.');
  return data;
}

export const getBooks = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/books${query ? `?${query}` : ''}`);
};
export const getAuthors = () => request('/authors');
export const createOrder = (items) => request('/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
  body: JSON.stringify({ items }),
});
export { API_URL };
