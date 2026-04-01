import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

async function bootstrap() {
  if (environment.useMsw) {
    const { worker } = await import('../msw/worker');
    // serviceWorker.url must match the deployed base href so the browser
    // can register the script (GitHub Pages serves at a sub-path).
    const base = new URL(document.baseURI).pathname;
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: { url: `${base}mockServiceWorker.js` },
    });
  }

  await bootstrapApplication(App, appConfig);
}

bootstrap().catch((err) => console.error(err));
