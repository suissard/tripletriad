import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setDefaultResultOrder } from 'node:dns';

setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_PATH = path.join(__dirname, '..', '.env');

function loadEnv() {
  const env = {};
  if (fs.existsSync(ENV_PATH)) {
    const content = fs.readFileSync(ENV_PATH, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) return;
      const match = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim();
      }
    });
  }
  return env;
}

const env = loadEnv();
const STRAPI_URL = `http://localhost:${env.STRAPI_PORT || env.PORT || 1340}`;
const ADMIN_EMAIL = env.ADMIN_EMAIL;
const ADMIN_PASSWORD = env.ADMIN_PASSWORD;

async function getAdminToken() {
  const res = await fetch(`${STRAPI_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Échec login Strapi (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.data.token;
}

async function fetchAll(token, endpoint) {
  let allResults = [];
  let page = 1;
  const pageSize = 100;
  
  while (true) {
    const res = await fetch(`${STRAPI_URL}${endpoint}?page=${page}&pageSize=${pageSize}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) {
        if (res.status === 404) {
            // fallback without pagination for files if needed, but /upload/files uses it
            break;
        }
        const err = await res.text();
        throw new Error(`Fetch failed ${endpoint}: ${err}`);
    }
    
    const data = await res.json();
    const results = data.results || data; // /upload/files might return an array directly or with results
    
    if (Array.isArray(results)) {
        allResults = allResults.concat(results);
        if (results.length < pageSize) break;
    } else if (results && Array.isArray(results.results)) {
        allResults = allResults.concat(results.results);
        if (page >= data.pagination?.pageCount || results.results.length === 0) break;
    } else {
        allResults = allResults.concat(data.results || []);
        if (!data.pagination || page >= data.pagination.pageCount) break;
    }
    page++;
  }
  return allResults;
}

async function deleteItem(token, endpoint, id) {
  const res = await fetch(`${STRAPI_URL}${endpoint}/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Failed to delete ${id} at ${endpoint}: ${err}`);
  }
}

async function main() {
    try {
        console.log('Authenticating...');
        const token = await getAdminToken();
        
        console.log('Fetching cards...');
        const cards = await fetchAll(token, '/content-manager/collection-types/api::card.card');
        console.log(`Found ${cards.length} cards.`);
        
        // Group cards by name
        const cardsByName = {};
        for (const card of cards) {
            if (!cardsByName[card.name]) cardsByName[card.name] = [];
            cardsByName[card.name].push(card);
        }
        
        // Process cards
        for (const [name, duplicates] of Object.entries(cardsByName)) {
            if (duplicates.length > 1) {
                // Keep the most recent (createdAt descending)
                duplicates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                const keep = duplicates[0];
                const toDelete = duplicates.slice(1);
                
                console.log(`Card "${name}": Found ${duplicates.length}. Keeping ID ${keep.id} (last updated/created), deleting ${toDelete.length}...`);
                for (const item of toDelete) {
                    await deleteItem(token, '/content-manager/collection-types/api::card.card', item.documentId || item.id);
                    console.log(` - Deleted card ID ${item.documentId || item.id}`);
                }
            }
        }
        
        console.log('Fetching files...');
        let files = [];
        try {
            files = await fetchAll(token, '/upload/files');
        } catch(e) {
            console.log("Could not fetch files using standard pagination, trying bulk get");
            const res = await fetch(`${STRAPI_URL}/upload/files?pageSize=5000`, { headers: { 'Authorization': `Bearer ${token}` }});
            if (res.ok) {
                const results = await res.json();
                files = results.results || results;
            } else {
                console.error("Failed to fetch files:", await res.text());
            }
        }
        
        console.log(`Found ${files.length} files.`);
        
        // Group files by name
        const filesByName = {};
        for (const f of files) {
            if (!filesByName[f.name]) filesByName[f.name] = [];
            filesByName[f.name].push(f);
        }
        
        // Process files
        for (const [name, duplicates] of Object.entries(filesByName)) {
            if (duplicates.length > 1) {
                // Keep the most recent (createdAt descending) - same logic as "supprime le splsu ancienne" (delete the oldest)
                duplicates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                const keep = duplicates[0];
                const toDelete = duplicates.slice(1);
                
                console.log(`File "${name}": Found ${duplicates.length}. Keeping ID ${keep.id}, deleting ${toDelete.length}...`);
                for (const item of toDelete) {
                    await deleteItem(token, '/upload/files', item.id);
                    console.log(` - Deleted file ID ${item.id}`);
                }
            }
        }
        
        console.log('Cleanup finished.');
    } catch (e) {
        console.error(e);
    }
}

main();
