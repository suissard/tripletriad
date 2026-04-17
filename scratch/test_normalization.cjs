import { normalizeCard } from './front/src/game/state.js';
import assert from 'assert';

// Mock getStrapiMediaUrl if it depends on env
// (Actually it's imported in state.js)

const mockCard = {
    id: 1,
    attributes: {
        name: "Test Card",
        image: {
            data: {
                attributes: {
                    url: "/uploads/test.png"
                }
            }
        }
    }
};

const n1 = normalizeCard(mockCard);
console.log("N1:", n1.imageUrl);
assert(n1.imageUrl.includes('/uploads/test.png'));

const n2 = normalizeCard(n1);
console.log("N2:", n2.imageUrl);
assert(n2.imageUrl === n1.imageUrl);

const mockCardWithImageUrl = {
    id: 2,
    name: "Manual Card",
    imageUrl: "https://example.com/manual.png"
};

const n3 = normalizeCard(mockCardWithImageUrl);
console.log("N3:", n3.imageUrl);
assert(n3.imageUrl === "https://example.com/manual.png");

console.log("All tests passed!");
