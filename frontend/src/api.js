// API helper
const API_BASE = '/api';

export function getAuthToken() {
  return localStorage.getItem('pokemon_tcg_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('pokemon_tcg_token', token);
  } else {
    localStorage.removeItem('pokemon_tcg_token');
  }
}

export async function apiRequest(endpoint, method = 'GET', data = null) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = json.error || `Error ${response.status}: ${response.statusText}`;
    throw new Error(errorMsg);
  }

  return json;
}
