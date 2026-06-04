import { getStrapiMediaUrl } from './url.js';
import { GameEngine } from '../game/GameEngine.js';

/**
 * Parse a card stat value: 'A' → 100, string numbers → int
 */
export function parseStatValue(v) {
    if (v === 'A' || v === 'a') return 100;
    const n = parseInt(v, 10);
    return isNaN(n) ? 0 : n;
}

/**
 * Robust card normalization logic.
 * Handles:
 * - Raw Strapi objects (with .attributes or .data.attributes)
 * - Nested Strapi media objects
 * - Already normalized cards
 * - Fallback for missing images
 */
export function normalizeCard(raw) {
    if (!raw) return null;
    
    // If it's already normalized (has a specific flag or property we trust), return it
    if (raw.__normalized) return raw;

    const attrs = raw.attributes || raw;
    
    // Robust image URL extraction for Strapi
    let imgUrl = null;
    
    // Handle Strapi media object (both flat and nested structures)
    const imageObj = raw.image || attrs.image;
    // Strapi 4/5 often has image.data.attributes.url or just image.url
    const strapiImg = imageObj?.data?.attributes || imageObj?.data || imageObj;
    
    if (strapiImg?.url) {
        imgUrl = strapiImg.url.startsWith('http') 
            ? strapiImg.url 
            : getStrapiMediaUrl(strapiImg.url);
    }

    // Support already normalized cards or cards with direct imageUrl property
    if (!imgUrl && (raw.imageUrl || attrs.imageUrl)) {
      imgUrl = raw.imageUrl || attrs.imageUrl;
    }

    // Extract variants
    let variantUrls = [];
    if (imgUrl) {
      variantUrls.push(imgUrl); // First one is the default
    }

    const variantsData = raw.variants || attrs.variants;
    const strapiVariants = variantsData?.data || variantsData;
    if (Array.isArray(strapiVariants)) {
      strapiVariants.forEach(v => {
        const vAttrs = v?.attributes || v;
        if (vAttrs?.url) {
          const vUrl = vAttrs.url.startsWith('http')
              ? vAttrs.url
              : getStrapiMediaUrl(vAttrs.url);
          variantUrls.push(vUrl);
        }
      });
    }

    if (!imgUrl) {
      // Fallback to DiceBear if no image is found
      imgUrl = `https://api.dicebear.com/9.x/bottts/svg?seed=${(raw.id || raw.documentId || 0) * 42}&backgroundColor=transparent`;
    }

    // Stats parsing
    const top = attrs.top ?? parseStatValue(attrs.topValue);
    const right = attrs.right ?? parseStatValue(attrs.rightValue);
    const bottom = attrs.bottom ?? parseStatValue(attrs.bottomValue);
    const left = attrs.left ?? parseStatValue(attrs.leftValue);

    // Faction normalization
    const factionData = attrs.faction?.data?.attributes || attrs.faction?.data || attrs.faction;
    const factionName = factionData?.name || (typeof attrs.faction === 'string' ? attrs.faction : 'Neutre');
    const factionMap = {
      'neutre': 'NEUTRAL',
      'hégémonie martienne': 'MARS',
      'hégemonie martienne': 'MARS',
      'exode pélagique': 'PELAGIC',
      'héritiers des cendres': 'ASHES',
      'omni-réseau': 'OMNI',
      'chœur synthétique': 'SYNTH',
      'choeur synthétique': 'SYNTH',
      'éveil chthonien': 'CHTHON',
      'incursion dissonante': 'DISSONANCE',
      'ferrailleurs de la ceinture': 'SCRAPPERS',
      'les ferrailleurs': 'SCRAPPERS',
      'fléau spore': 'SPORE'
    };
    const factionCode = factionData?.code || factionMap[factionName.toLowerCase()] || 'NEUTRAL';
    const factionStyle = factionData?.style || {};

    // Collection normalization (handles many-to-many)
    const collectionsData = attrs.collections?.data || attrs.collections;
    let collectionCodes = [];
    if (Array.isArray(collectionsData)) {
        collectionCodes = collectionsData.map(c => {
            const cAttrs = c.attributes || c;
            return cAttrs?.code;
        }).filter(Boolean);
    }
    
    // Fallback for legacy 'collection' field
    if (collectionCodes.length === 0) {
        const legacyColl = attrs.collection?.data?.attributes || attrs.collection?.data || attrs.collection;
        if (legacyColl?.code) collectionCodes.push(legacyColl.code);
        else if (attrs.collectionName) collectionCodes.push(attrs.collectionName);
    }
    
    const collectionCode = collectionCodes[0] || 'base';

    return {
        id: raw.id,
        documentId: raw.documentId || attrs.documentId,
        name: attrs.name || `Card #${raw.id}`,
        description: attrs.description || '',
        level: GameEngine.calculateCardLevel({
            topValue: attrs.topValue ?? String(top),
            rightValue: attrs.rightValue ?? String(right),
            bottomValue: attrs.bottomValue ?? String(bottom),
            leftValue: attrs.leftValue ?? String(left)
        }),
        element: attrs.element || 'None',
        elements: Array.isArray(attrs.elements) ? attrs.elements : (attrs.element && attrs.element !== 'None' ? [attrs.element] : []),
        faction: factionName,
        factionCode: factionCode,
        factionStyle: factionStyle,
        top,
        right,
        bottom,
        left,
        topValue: attrs.topValue ?? (top === 100 ? 'A' : String(top)),
        rightValue: attrs.rightValue ?? (right === 100 ? 'A' : String(right)),
        bottomValue: attrs.bottomValue ?? (bottom === 100 ? 'A' : String(bottom)),
        leftValue: attrs.leftValue ?? (left === 100 ? 'A' : String(left)),
        imageUrl: imgUrl,
        img: imgUrl,
        variantUrls: variantUrls,
        variantsCount: variantUrls.length,
        revealed: attrs.revealed !== undefined ? attrs.revealed : true,
        isPremium: attrs.isPremium || false,
        rarity: (typeof attrs.rarity === 'object' ? attrs.rarity?.name : attrs.rarity) || null,
        collectionName: collectionCode,
        collectionNames: collectionCodes,
        skills: attrs.skills || [],
        
        // --- System Events Hooks (preserving if they exist) ---
        onDrawn: raw.onDrawn || ((ctx) => {}),
        onPlaced: raw.onPlaced || ((ctx) => {}),
        onCaptured: raw.onCaptured || ((ctx) => {}),

        // Flag to avoid redundant normalization
        __normalized: true
    };
}
