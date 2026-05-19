'use strict';

/**
 * Typed API client for the Полюс Сервис 77 REST API.
 * All requests go to /api/v1/*
 */

const Api = {
  base: '/api/v1',

  async _request(method, endpoint, data = null, opts = {}) {
    const url = `${this.base}/${endpoint}`;

    const headers = {
      'X-Requested-With': 'XMLHttpRequest',
      ...opts.headers,
    };

    let body = null;
    if (data instanceof FormData) {
      body = data;
    } else if (data !== null) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(data);
    }

    const token = localStorage.getItem('auth_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res  = await fetch(url, { method, headers, body, signal: opts.signal });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = Object.assign(
        new Error(json.message || `HTTP ${res.status}`),
        { status: res.status, errors: json.errors ?? {} }
      );
      throw err;
    }

    return json;
  },

  get:    (ep, opts)  => Api._request('GET',    ep, null, opts ?? {}),
  post:   (ep, data)  => Api._request('POST',   ep, data),
  put:    (ep, data)  => Api._request('PUT',     ep, data),
  delete: (ep)        => Api._request('DELETE',  ep),

  // Domain shortcuts
  contact: {
    send: (data) => Api.post('contact', data),
  },

  products: {
    list:     (params = {}) => Api.get('products?' + new URLSearchParams(params).toString()),
    get:      (id)           => Api.get(`products/${id}`),
    search:   (q, limit)     => Api.get(`products?search=${encodeURIComponent(q)}&per_page=${limit ?? 20}`),
    create:   (data)         => Api.post('products', data),
    update:   (id, data)     => Api.put(`products/${id}`, data),
    remove:   (id)           => Api.delete(`products/${id}`),
  },

  categories: {
    list: () => Api.get('categories'),
    get:  (id) => Api.get(`categories/${id}`),
  },

  auth: {
    login:    (email, password) => Api.post('auth/login',    { email, password }),
    register: (data)            => Api.post('auth/register', data),
    logout:   ()                => Api.post('auth/logout'),
    me:       ()                => Api.get('auth/me'),
  },

  orders: {
    list:   ()         => Api.get('orders'),
    get:    (id)       => Api.get(`orders/${id}`),
    create: (data)     => Api.post('orders', data),
    status: (id, s)    => Api.put(`orders/${id}`, { status: s }),
  },

  forum: {
    threads: (page = 1)       => Api.get(`forum/threads?page=${page}`),
    thread:  (id)             => Api.get(`forum/threads/${id}`),
    create:  (data)           => Api.post('forum/threads', data),
    reply:   (threadId, body) => Api.post(`forum/threads/${threadId}/replies`, { body }),
  },
};

export default Api;
