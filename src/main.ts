import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

async function bootstrap() {
  // Demo mode (GitHub Pages): start MSW service worker to mock all /api/* calls
  if (location.hostname !== 'localhost') {
    const { worker } = await import('../msw/worker');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }

  await bootstrapApplication(App, appConfig);
}

bootstrap().catch((err) => console.error(err));
