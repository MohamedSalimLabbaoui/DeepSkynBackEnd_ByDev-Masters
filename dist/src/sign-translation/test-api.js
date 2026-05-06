const API_URL = 'http://localhost:3000';
async function testTranslateText() {
    const start = Date.now();
    const testName = 'POST /sign-translation/translate';
    try {
        const res = await fetch(`${API_URL}/sign-translation/translate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: 'Bonjour je suis content',
                language: 'fr',
            }),
        });
        const data = await res.json();
        const duration = Date.now() - start;
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📡 ${testName}`);
        console.log(`${'='.repeat(60)}`);
        console.log(`Status: ${res.status} ${res.statusText}`);
        console.log(`Durée: ${duration}ms`);
        console.log(`\nRéponse (résumé):`);
        if (data.frames) {
            console.log(`  ✅ frames: ${data.frames.length} frames`);
            if (data.frames[0]) {
                console.log(`     - hand_right_keypoints: ${data.frames[0].hand_right_keypoints?.length || 0} points`);
                console.log(`     - hand_left_keypoints: ${data.frames[0].hand_left_keypoints?.length || 0} points`);
                console.log(`     - pose_keypoints: ${data.frames[0].pose_keypoints?.length || 0} points`);
            }
        }
        else {
            console.log(`  ⚠️ Pas de frames dans la réponse`);
        }
        if (data.metadata) {
            console.log(`  ✅ metadata:`);
            console.log(`     - gloss: "${data.metadata.gloss}"`);
            console.log(`     - fps: ${data.metadata.fps}`);
            console.log(`     - total_frames: ${data.metadata.total_frames}`);
        }
        if (data.status) {
            console.log(`  ✅ status: "${data.status}"`);
        }
        console.log(`\nRéponse complète (JSON):`);
        console.log(JSON.stringify(data, null, 2).substring(0, 2000));
        return {
            testName,
            success: res.ok && !!data.frames,
            status: res.status,
            response: data,
            duration,
        };
    }
    catch (error) {
        const duration = Date.now() - start;
        console.log(`\n❌ ${testName} - ERREUR`);
        console.log(`   ${error.message}`);
        if (error.cause?.code === 'ECONNREFUSED') {
            console.log(`\n💡 Le serveur backend ne semble pas être démarré.`);
            console.log(`   Lancer: cd DeepSkynBackEnd_ByDev-Masters && npm run start:dev`);
        }
        return {
            testName,
            success: false,
            error: error.message,
            duration,
        };
    }
}
async function testTranslateEmpty() {
    const start = Date.now();
    const testName = 'POST /sign-translation/translate (texte vide)';
    try {
        const res = await fetch(`${API_URL}/sign-translation/translate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: '',
                language: 'fr',
            }),
        });
        const data = await res.json();
        const duration = Date.now() - start;
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📡 ${testName}`);
        console.log(`${'='.repeat(60)}`);
        console.log(`Status: ${res.status} (attendu: 400)`);
        console.log(`Durée: ${duration}ms`);
        console.log(`Réponse:`, JSON.stringify(data, null, 2).substring(0, 500));
        return {
            testName,
            success: res.status === 400,
            status: res.status,
            response: data,
            duration,
        };
    }
    catch (error) {
        return {
            testName,
            success: false,
            error: error.message,
            duration: Date.now() - start,
        };
    }
}
async function testHealthCheck() {
    const start = Date.now();
    const testName = 'GET / (health check)';
    try {
        const res = await fetch(API_URL);
        const duration = Date.now() - start;
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📡 ${testName}`);
        console.log(`${'='.repeat(60)}`);
        console.log(`Status: ${res.status}`);
        console.log(`Durée: ${duration}ms`);
        return {
            testName,
            success: res.ok,
            status: res.status,
            duration,
        };
    }
    catch (error) {
        return {
            testName,
            success: false,
            error: error.message,
            duration: Date.now() - start,
        };
    }
}
async function main() {
    console.log(`\n🧪 Tests API Sign Translation - ${new Date().toLocaleString('fr-FR')}`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`Serveur cible: ${API_URL}`);
    const results = [];
    results.push(await testHealthCheck());
    results.push(await testTranslateText());
    results.push(await testTranslateEmpty());
    console.log(`\n\n${'═'.repeat(60)}`);
    console.log(`📊 RÉSUMÉ DES TESTS`);
    console.log(`${'═'.repeat(60)}`);
    const passed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    for (const r of results) {
        const icon = r.success ? '✅' : '❌';
        console.log(`  ${icon} ${r.testName} ${r.status ? `(${r.status})` : ''} - ${r.duration}ms`);
        if (r.error) {
            console.log(`     └─ ${r.error}`);
        }
    }
    console.log(`\n  Total: ${passed} passés, ${failed} échoués sur ${results.length}`);
    console.log(`${'═'.repeat(60)}\n`);
    process.exit(failed > 0 ? 1 : 0);
}
main().catch(console.error);
//# sourceMappingURL=test-api.js.map