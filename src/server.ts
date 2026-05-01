import { buildApp } from './app';
import { env } from './shared/config/env';

async function start(): Promise<void> {
  const app = buildApp();

  try {
    await app.listen({
      host: '0.0.0.0',
      port: env.PORT,
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
