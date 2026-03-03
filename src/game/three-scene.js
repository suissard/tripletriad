import * as THREE from 'three';
import gsap from 'gsap';
import { state } from './state.js';
import { getRarity, displayVal } from './constants.js';

export let scene, camera, renderer;
export const slots = [];
let sharedGlowTex;

export function initScene(container) {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.02);
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 19, 15);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(5, 20, 10);
    light.castShadow = true;
    scene.add(light);

    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 64; glowCanvas.height = 64;
    const ctxGlow = glowCanvas.getContext('2d');
    const grd = ctxGlow.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctxGlow.fillStyle = grd;
    ctxGlow.fillRect(0, 0, 64, 64);
    sharedGlowTex = new THREE.CanvasTexture(glowCanvas);

    const slotGeo = new THREE.PlaneGeometry(2.6, 3.8);
    const slotMat = new THREE.MeshPhongMaterial({ color: 0x111122, transparent: true, opacity: 0.8, side: THREE.DoubleSide });

    // Clear slots in case of re-init
    slots.length = 0;

    for (let i = 0; i < 9; i++) {
        const slot = new THREE.Mesh(slotGeo, slotMat);
        slot.rotation.x = -Math.PI / 2;
        slot.position.set((i % 3) * 2.8 - 2.8, 0.01, Math.floor(i / 3) * 4 - 4);
        slot.userData = { isSlot: true, id: i };
        scene.add(slot);
        slots.push(slot);
    }

    window.addEventListener('resize', onWindowResize);
    animate();
}

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    if (renderer && scene && camera) renderer.render(scene, camera);
}

export function cleanupScene() {
    window.removeEventListener('resize', onWindowResize);
    if (renderer && renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
}

export function makeCardMesh(data, initialOwner) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 384;
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    const rarity = getRarity(data);

    const glowMat = new THREE.MeshBasicMaterial({
        map: sharedGlowTex, color: rarity.hex,
        transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const glowMesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 5.2), glowMat);
    glowMesh.rotation.x = -Math.PI / 2;
    glowMesh.position.y = -0.05;

    const draw = (img = null, currentOwner = initialOwner) => {
        const isP = currentOwner === 'player';
        ctx.fillStyle = isP ? '#00d2ff' : '#ff0055';
        ctx.fillRect(0, 0, 256, 384);

        if (isP || data.revealed) {
            ctx.fillStyle = rarity.color;
            ctx.fillRect(8, 8, 240, 368);

            if (img && img.complete && img.naturalWidth !== 0) {
                ctx.drawImage(img, 8, 64, 240, 240);
            }
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(8, 8, 240, 368);

            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            [[128, 45], [128, 339], [45, 192], [211, 192]].forEach(([x, y]) => {
                ctx.beginPath(); ctx.arc(x, y, 25, 0, Math.PI * 2); ctx.fill();
            });

            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(displayVal(data.top), 128, 48);
            ctx.fillText(displayVal(data.bottom), 128, 342);
            ctx.fillText(displayVal(data.left), 45, 195);
            ctx.fillText(displayVal(data.right), 211, 195);

            glowMesh.visible = true;
        } else {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(8, 8, 240, 368);
            ctx.fillStyle = '#ff0055';
            ctx.font = 'bold 100px sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('?', 128, 192);

            glowMesh.visible = false;
        }
        tex.needsUpdate = true;
    };

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => draw(img, initialOwner);
    img.onerror = () => draw(null, initialOwner);
    img.src = data.img;
    draw();

    const geometry = new THREE.BoxGeometry(2.5, 0.15, 3.7);
    const edgeCol = initialOwner === 'player' ? 0x00d2ff : 0xff0055;
    const mat = new THREE.MeshPhongMaterial({ color: edgeCol });
    const materials = [mat, mat, new THREE.MeshPhongMaterial({ map: tex }), new THREE.MeshPhongMaterial({ color: 0x111 }), mat, mat];

    const mesh = new THREE.Mesh(geometry, materials);
    mesh.add(glowMesh);
    mesh.userData = { data, owner: initialOwner, redraw: draw, img };
    mesh.castShadow = true;
    return mesh;
}

export function refillHand(owner) {
    const hand = owner === 'player' ? state.pHand : state.aiHand;
    const zPos = owner === 'player' ? 7 : -9;

    while (hand.length < 3 && state.deck.length > 0) {
        const mesh = makeCardMesh(state.deck.pop(), owner);
        mesh.position.set(12, 5, zPos);
        if (owner === 'ai') mesh.rotation.y = Math.PI;
        scene.add(mesh);
        hand.push(mesh);
    }

    hand.forEach((m, i) => {
        gsap.to(m.position, { x: (i - 1) * 3.5, y: 0.5, z: zPos, duration: 0.5, ease: "back.out" });
    });
}
