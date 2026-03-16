const BASE_URL = 'http://localhost:1337/api';

class StrapiService {
  constructor() {
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  signOut() {
    this.token = null;
  }

  async request(method, path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config = {
      method,
      headers,
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(`${BASE_URL}${path}`, config);
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.indexOf('application/json') !== -1) {
          const data = await response.json();
          if (!response.ok) {
            return { error: data.error || data };
          }
          return data;
      } else {
          if (!response.ok) {
              return { error: await response.text() };
          }
          return await response.text();
      }
    } catch (error) {
      console.error(`API Error (${method} ${path}):`, error);
      return { error: { message: error.message } };
    }
  }

  async login(identifier, password) {
    return this.request('POST', '/auth/local', {
      body: { identifier, password },
    });
  }

  async find(collection, queryParams = {}) {
      const qs = new URLSearchParams();
      if (queryParams.populate) {
          if (Array.isArray(queryParams.populate)) {
              queryParams.populate.forEach(p => qs.append('populate', p));
          } else {
             qs.append('populate', queryParams.populate);
          }
      }
      return this.request('GET', `/${collection}?${qs.toString()}`);
  }
  
  async getGameConfig() {
    const res = await this.request('GET', '/game-config');
    if (res && res.data) {
        return res.data.attributes ? { id: res.data.id, ...res.data.attributes } : res.data;
    }
    return res;
  }
}

const strapiService = new StrapiService();
export default strapiService;
