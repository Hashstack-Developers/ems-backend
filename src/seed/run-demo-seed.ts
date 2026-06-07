import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DemoDataSeedService } from './demo-data.seed';

async function runDemoSeed() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const seeder = app.get(DemoDataSeedService);
    await seeder.seed();
    console.log('Demo seed finished successfully.');
  } finally {
    await app.close();
  }
}

runDemoSeed().catch((err) => {
  console.error('Demo seed failed:', err);
  process.exit(1);
});
