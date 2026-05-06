"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const churn_service_1 = require("./churn/churn.service");
async function testChurn() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const churnService = app.get(churn_service_1.ChurnService);
    console.log('🔄 Testing Churn Prediction System\n');
    console.log('═'.repeat(60));
    console.log('\n[TEST 1] Get Churn Statistics');
    console.log('─'.repeat(60));
    try {
        const stats = await churnService.getChurnStats();
        console.log('✓ Stats retrieved:');
        console.log(JSON.stringify(stats, null, 2));
    }
    catch (error) {
        console.error('✗ Error:', error.message);
    }
    console.log('\n[TEST 2] Analyze All Users for Churn Risk');
    console.log('─'.repeat(60));
    try {
        const report = await churnService.analyzeAllUsers();
        console.log(`✓ Analysis complete:`);
        console.log(`  Total users analyzed: ${report.totalUsers}`);
        console.log(`  At-risk users: ${report.atRiskCount}`);
        console.log(`  Critical users: ${report.criticalCount}`);
        if (report.predictions.length > 0) {
            console.log('\n  Top 5 Predictions:');
            report.predictions.slice(0, 5).forEach((pred, i) => {
                console.log(`    ${i + 1}. User ${pred.id}: ${(pred.churnProbability * 100).toFixed(2)}% churn risk (${pred.riskLevel})`);
            });
        }
    }
    catch (error) {
        console.error('✗ Error:', error.message);
    }
    console.log('\n[TEST 3] Get At-Risk Users (high + critical)');
    console.log('─'.repeat(60));
    try {
        const atRiskUsers = await churnService.getAtRiskUsers(5);
        console.log(`✓ Found ${atRiskUsers.length} at-risk users:`);
        atRiskUsers.forEach((user, i) => {
            console.log(`  ${i + 1}. ${user.email}`);
            console.log(`     Risk: ${user.churnRiskLevel.toUpperCase()} (${(user.churnRiskScore * 100).toFixed(2)}%)`);
            console.log(`     Interactions: ${user.interactionCount}, Sessions: ${user.sessionCount}`);
            console.log(`     Last seen: ${user.lastActivity ? Math.floor((Date.now() - user.lastActivity.getTime()) / (1000 * 60 * 60 * 24)) + ' days ago' : 'Never'}`);
        });
    }
    catch (error) {
        console.error('✗ Error:', error.message);
    }
    if (true) {
        console.log('\n[TEST 4] Predict Risk for a Single User');
        console.log('─'.repeat(60));
        try {
            const prediction = await churnService.predictSingleUser('user-active');
            if (prediction) {
                console.log(`✓ Prediction for ${prediction.email}:`);
                console.log(`  Risk probability: ${(prediction.churnProbability * 100).toFixed(2)}%`);
                console.log(`  Risk level: ${prediction.riskLevel.toUpperCase()}`);
                console.log(`  Is churned: ${prediction.isChurned}`);
            }
            else {
                console.log('⚠ User not found in database');
            }
        }
        catch (error) {
            console.error('✗ Error:', error.message);
        }
    }
    console.log('\n' + '═'.repeat(60));
    console.log('✓ All tests completed!\n');
    await app.close();
    process.exit(0);
}
testChurn().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
//# sourceMappingURL=test-churn.js.map