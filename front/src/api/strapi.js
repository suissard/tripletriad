import { strapi as createStrapiClient } from '@strapi/client';

// Base URL for the Strapi API
const BASE_URL = 'http://localhost:1337/api';

// Initial token
let token = null;

// Create the client instance
let strapiClient = createStrapiClient({
    baseURL: BASE_URL,
    ...(token ? { auth: token } : {}),
});

// Wrapper object to export
const strapiService = {
    find(collection, queryParams) {
        return strapiClient.collection(collection).find(queryParams);
    },

    findOne(collection, id, queryParams) {
        return strapiClient.collection(collection).findOne(String(id), queryParams);
    },

    create(collection, data, queryParams) {
        return strapiClient.collection(collection).create(data, queryParams);
    },

    update(collection, id, data, queryParams) {
        return strapiClient.collection(collection).update(String(id), data, queryParams);
    },

    delete(collection, id, queryParams) {
        return strapiClient.collection(collection).delete(String(id), queryParams);
    },

    async login(credentials) {
        const response = await strapiClient.fetch('/auth/local', {
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
    },

    async register(userInfo) {
        const response = await strapiClient.fetch('/auth/local/register', {
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
    },

    async getMe() {
        const response = await strapiClient.fetch('/users/me?populate=*');
        return await response.json();
    },

    setToken(newToken) {
        token = newToken;
        strapiClient = createStrapiClient({
            baseURL: BASE_URL,
            auth: token,
        });
    },

    signOut() {
        token = null;
        strapiClient = createStrapiClient({
            baseURL: BASE_URL,
        });
    },

    async request(method, url, options = {}) {
        const response = await strapiClient.fetch(url, {
            method,
            ...options,
        });
        return await response.json();
    },

    get rawClient() {
        return strapiClient;
    }
};

export default strapiService;
