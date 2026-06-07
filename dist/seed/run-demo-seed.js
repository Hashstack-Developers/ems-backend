"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../app.module");
const demo_data_seed_1 = require("./demo-data.seed");
async function runDemoSeed() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log'],
    });
    try {
        const seeder = app.get(demo_data_seed_1.DemoDataSeedService);
        await seeder.seed();
        console.log('Demo seed finished successfully.');
    }
    finally {
        await app.close();
    }
}
runDemoSeed().catch((err) => {
    console.error('Demo seed failed:', err);
    process.exit(1);
});
//# sourceMappingURL=run-demo-seed.js.map