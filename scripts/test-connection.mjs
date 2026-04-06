async function test() {
    const url = 'http://127.0.0.1:1340/admin/login';
    console.log(`📡 Test de connexion à ${url}...`);
    try {
        const res = await fetch(url, { method: 'POST' });
        console.log(`✅ Status: ${res.status}`);
        const text = await res.text();
        console.log(`📝 Réponse (limitée): ${text.slice(0, 100)}`);
    } catch (err) {
        console.error(`❌ Erreur:`, err);
    }
}
test();
