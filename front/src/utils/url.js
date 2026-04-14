/**
 * Centralized URL management utility for the tripleTriad project.
 * Provides consistent access to Strapi and Website URLs.
 */

// Strapi configuration
const STRAPI_BASE_URL = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1340';
const STRAPI_API_PATH = '/api';

/**
 * Get the full Strapi API URL for a given path.
 * @param {string} path - The API endpoint path (e.g., '/cards')
 * @returns {string} The full API URL.
 */
export const getStrapiUrl = (path = '') => {
  if (!path || path === '/') return `${STRAPI_BASE_URL}${STRAPI_API_PATH}`;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${STRAPI_BASE_URL}${STRAPI_API_PATH}${normalizedPath}`;
};

export const getStrapiMediaUrl = (path = '') => {
  if (!path || path === '/') return STRAPI_BASE_URL;
  if (path.startsWith('http')) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${STRAPI_BASE_URL}${normalizedPath}`;
};

/**
 * Website page mapping for centralized route management.
 */
const SITE_PAGES = {
  home: '/',
  game: '/game',
  collection: '/collection',
  decks: '/decks',
  boutique: '/boutique',
  story: '/story',
  quests: '/quests',
  admin: '/admin',
  'admin-foil-editor': '/admin/foil-editor',
  'admin-game-config': '/admin/game-config',
  'admin-test-api': '/admin/test-api',
};

/**
 * Get the full Website URL for a given page name or path.
 * @param {string} pageOrPath - The page name from SITE_PAGES or a direct path.
 * @param {Object} queryParams - Optional query parameters.
 * @returns {string} The full Website URL.
 */
export const getWebSiteUrl = (pageOrPath = '', queryParams = {}) => {
  const base = import.meta.env.VITE_WEBSITE_URL || window.location.origin;
  let path = SITE_PAGES[pageOrPath] || pageOrPath;
  
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  const url = new URL(path, base);
  
  Object.keys(queryParams).forEach(key => {
    url.searchParams.append(key, queryParams[key]);
  });

  return url.toString();
};
