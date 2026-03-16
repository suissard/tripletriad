import { strapi as createStrapiClient } from '@strapi/client';

class StrapiApi {
    constructor() {
        this.BASE_URL = 'http://localhost:1337/api';
        this.MEDIA_URL = 'http://localhost:1337';
        this.token = null;
        this.strapiClient = this._createClient();
    }

    _createClient() {
        return createStrapiClient({
            baseURL: this.BASE_URL,
            ...(this.token ? { auth: this.token } : {}),
        });
    }

    find(collection, queryParams) {
        return this.strapiClient.collection(collection).find(queryParams);
    }

    findOne(collection, id, queryParams) {
        return this.strapiClient.collection(collection).findOne(String(id), queryParams);
    }

    create(collection, data, queryParams) {
        return this.strapiClient.collection(collection).create(data, queryParams);
    }

    update(collection, id, data, queryParams) {
        return this.strapiClient.collection(collection).update(String(id), data, queryParams);
    }

    delete(collection, id, queryParams) {
        return this.strapiClient.collection(collection).delete(String(id), queryParams);
    }

    async login(credentials) {
        const response = await this.strapiClient.fetch('/auth/local', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
        });
        const data = await response.json();
        if (data.jwt) {
            this.setToken(data.jwt);
        }
        return data;
    }

    async register(userInfo) {
        const response = await this.strapiClient.fetch('/auth/local/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userInfo),
        });
        const data = await response.json();
        if (data.jwt) {
            this.setToken(data.jwt);
        }
        return data;
    }

    async getMe() {
        const response = await this.strapiClient.fetch('/users/me?populate=*');
        return await response.json();
    }

    setToken(newToken) {
        this.token = newToken;
        this.strapiClient = this._createClient();
    }

    signOut() {
        this.token = null;
        this.strapiClient = this._createClient();
    }

    async request(method, url, options = {}) {
        const response = await this.strapiClient.fetch(url, {
            method,
            ...options,
        });
        return await response.json();
    }

    async getGameConfig() {
        try {
            const res = await this.request('GET', '/game-config');
            if (res && res.data) {
                return res.data.attributes ? { id: res.data.id, ...res.data.attributes } : res.data;
            }
            return null;
        } catch (error) {
            console.error('Error fetching game config:', error);
            return null;
        }
    }

    get rawClient() {
        return this.strapiClient;
    }
}

const strapiService = new StrapiApi();
export default strapiService;

