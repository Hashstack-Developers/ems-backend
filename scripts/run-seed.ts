import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DemoSeedService } from '../src/database/demo-seed.service';
import { SeedModule } from '../src/database/seed.module';

async function bootstrap(): Promise<void> {
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

  const app = await NestFactory.createApplicationContext(SeedModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const seeder = app.get(DemoSeedService);
    const result = await seeder.run({ fresh });
    Logger.log('Demo seed finished successfully.', 'RunSeed');
    Logger.log(JSON.stringify(result, null, 2), 'RunSeed');
  } finally {
    await app.close();
  }
}

bootstrap().catch((error: unknown) => {
  console.error('Demo seed failed:', error);
  process.exit(1);
});
