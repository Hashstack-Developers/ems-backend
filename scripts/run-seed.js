"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const demo_seed_service_1 = require("../src/database/demo-seed.service");
const seed_module_1 = require("../src/database/seed.module");
async function bootstrap() {
    const args = process.argv.slice(2);
    const confirmed = args.includes('--confirm');
    const fresh = args.includes('--fresh');
    if (!confirmed) {
        console.error('');
        console.error('Demo seed refused: missing --confirm flag.');
        console.error('');
        console.error('Usage:');
        console.error('  npm run seed -- --confirm');
        console.error('  npm run seed -- --confirm --fresh');
        console.error('');
        console.error('  --confirm   Required. Seed runs only when you pass this flag.');
        console.error('  --fresh     Optional. Removes existing @wcla.demo employees first.');
        console.error('');
        process.exit(1);
    }
    const app = await core_1.NestFactory.createApplicationContext(seed_module_1.SeedModule, {
        logger: ['error', 'warn', 'log'],
    });
    try {
        const seeder = app.get(demo_seed_service_1.DemoSeedService);
        const result = await seeder.run({ fresh });
        common_1.Logger.log('Demo seed finished successfully.', 'RunSeed');
        common_1.Logger.log(JSON.stringify(result, null, 2), 'RunSeed');
    }
    finally {
        await app.close();
    }
}
bootstrap().catch((error) => {
    console.error('Demo seed failed:', error);
    process.exit(1);
});
//# sourceMappingURL=run-seed.js.map