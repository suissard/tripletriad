const fs = require('fs');
const file = 'front/src/utils/cardUtils.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Add variantsUrls extraction
const findImgUrlStr = `if (!imgUrl && (raw.imageUrl || attrs.imageUrl)) {
      imgUrl = raw.imageUrl || attrs.imageUrl;
    }`;

const replaceImgUrlStr = `if (!imgUrl && (raw.imageUrl || attrs.imageUrl)) {
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
    }`;

content = content.replace(findImgUrlStr, replaceImgUrlStr);

// 2. Add variantUrls and variantsCount to the returned object
const findReturnStr = `imageUrl: imgUrl,`;
const replaceReturnStr = `imageUrl: imgUrl,
        variantUrls: variantUrls,
        variantsCount: variantUrls.length,`;

content = content.replace(findReturnStr, replaceReturnStr);

fs.writeFileSync(file, content);
