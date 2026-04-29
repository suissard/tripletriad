import { strapi as createStrapiClient } from '@strapi/client';
import { getStrapiUrl, getStrapiMediaUrl } from '../utils/url.js';

class StrapiApi {
    constructor() {
        this.BASE_URL = getStrapiUrl();
        this.MEDIA_URL = getStrapiMediaUrl();
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

    /**
     * Fetch all records from a collection by handling pagination automatically.
     * Use this for small-to-medium collections where a full dataset is needed (e.g. lists for filters, admin tools).
     * 
     * @param {string} collection - The collection name (e.g., 'cards')
     * @param {Object} queryParams - Any Strapi query parameters (e.g., filters, populate)
     * @returns {Promise<Object>} - An object with { data, meta } where data contains all records.
     * 
     * @example
     * const allCards = await strapiService.fetchAll('cards', { populate: 'image' });
     */
    async fetchAll(collection, queryParams = {}) {
        let allData = [];
        let page = 1;
        let pageCount = 1;
        let lastMeta = {};

        try {
            while (page <= pageCount) {
                const res = await this.find(collection, {
                    ...queryParams,
                    pagination: {
                        ...(queryParams.pagination || {}),
                        page,
                        pageSize: 100, // Reasonable batch size
                    }
                });

                if (res.data) {
                    allData = allData.concat(res.data);
                }
                
                if (res.meta && res.meta.pagination) {
                    pageCount = res.meta.pagination.pageCount;
                    lastMeta = res.meta;
                } else {
                    break;
                }
                
                page++;
            }

            return { data: allData, meta: lastMeta };
        } catch (error) {
            console.error(`[StrapiApi] Error fetching all from ${collection}:`, error);
            return { error, data: allData };
        }
    }

    findOne(collection, id, queryParams) {
        return this.strapiClient.collection(collection).findOne(String(id), queryParams);
    }

    async create(collection, data, queryParams) {
        // Explicitly wrap in data for Strapi 5 REST API
        const payload = (data && data.data) ? data : { data };
        const url = `/${collection}${queryParams ? '?' + new URLSearchParams(queryParams).toString() : ''}`;
        const res = await this.request('POST', url, { body: payload });
        return res.data || res;
    }

    async update(collection, id, data, queryParams) {
        // Explicitly wrap in data for Strapi 5 REST API
        const payload = (data && data.data) ? data : { data };
        const url = `/${collection}/${id}${queryParams ? '?' + new URLSearchParams(queryParams).toString() : ''}`;
        const res = await this.request('PUT', url, { body: payload });
        return res.data || res;
    }

    delete(collection, id, queryParams) {
        return this.strapiClient.collection(collection).delete(String(id), queryParams);
    }

    async login(credentials) {
        try {
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
        } catch (error) {
            // Strapi/ofetch throws on 400 errors. We try to extract the JSON payload.
            const errData = error.data?.error || error.response?.data?.error || { message: error.message || 'Identifiant ou mot de passe incorrect' };
            if (errData.message === 'Invalid identifier or password') {
                 errData.message = 'Identifiant ou mot de passe incorrect';
            }
            return { error: errData };
        }
    }

    async register(userInfo) {
        try {
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
        } catch (error) {
            const errData = error.data?.error || error.response?.data?.error || { message: error.message || 'Erreur lors de la création du compte' };
            if (errData.message === 'Email or Username are already taken') {
                 errData.message = 'Cet email ou nom d\'utilisateur est déjà pris';
            }
            return { error: errData };
        }
    }

    async getMe() {
        const response = await this.strapiClient.fetch('/users/me');
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
        let finalUrl = url;
        if (options.params) {
            const query = new URLSearchParams(options.params).toString();
            if (query) {
                finalUrl += (finalUrl.includes('?') ? '&' : '?') + query;
            }
        }

        const controller = new AbortController();
        const timeout = options.timeout || 10000;
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const fetchOptions = {
            method,
            signal: controller.signal,
            ...options,
        };

        if (options.body && typeof options.body === 'object') {
            fetchOptions.body = JSON.stringify(options.body);
            fetchOptions.headers = {
                ...fetchOptions.headers,
                'Content-Type': 'application/json',
            };
        }

        try {
            const response = await this.strapiClient.fetch(finalUrl, fetchOptions);
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`[StrapiApi] Request failed (${response.status}): ${finalUrl}`, errorData);
                const error = new Error(errorData.error?.message || `Request failed with status ${response.status}`);
                error.status = response.status;
                error.data = errorData;
                throw error;
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                console.error(`[StrapiApi] Request timed out (${timeout}ms): ${finalUrl}`);
                return { error: { message: 'Request timed out' } };
            }
            throw error;
        }
    }

    async trackEvent(eventType, details = {}) {
        try {
            const { relatedCardId, relatedElement, value } = details;
            const res = await this.request('POST', '/player-event-log/track', {
                body: {
                    eventType,
                    relatedCardId,
                    relatedElement,
                    value: value ?? 1
                }
            });
            return res;
        } catch (error) {
            console.error('[StrapiApi] Error tracking event:', error);
            return { error };
        }
    }

    async claimQuestReward(questId) {
        try {
            const res = await this.request('POST', `/player-quests/${questId}/claim`);
            return res;
        } catch (error) {
            console.error('[StrapiApi] Error claiming quest reward:', error);
            return { error };
        }
    }

    async getGameConfig(options = {}) {
        try {
            // Strapi 5 population format (bracket notation) to avoid 400 ValidationError
            const res = await this.request('GET', '/game-config?populate[0]=defaultCardFrame&populate[1]=defaultCardBack', options);
            // Handle Strapi 5 flattened format vs Strapi 4 attributes format
            if (res && res.data) {
                return res.data.attributes ? { id: res.data.id, ...res.data.attributes } : res.data;
            }
            return null;
        } catch (error) {
            console.error('Error fetching game config:', error);
            return null;
        }
    }

    /**
     * Reliable health check that doesn't depend on specific content entries.
     * Uses /admin/init which is public and always exists if Strapi is running.
     */
    async healthCheck(options = {}) {
        try {
            const url = `${this.BASE_URL.replace('/api', '')}/admin/init`;
            const res = await fetch(url, { ...options });
            return res.ok;
        } catch (e) {
            return false;
        }
    }


    get rawClient() {
        return this.strapiClient;
    }
}

const strapiService = new StrapiApi();
export default strapiService;

