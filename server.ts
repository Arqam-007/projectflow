import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { app } from './apps/api/src/app.js';
import { config } from './apps/api/src/config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // In development (including Google AI Studio live preview):
    // Mount Vite dev server middlewares to serve React SPA on port 3000
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
    console.log('[ProjectFlow] Vite dev middleware attached for frontend SPA.');
  } else {
    // In production: Serve compiled static assets from dist/
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = app.listen(config.PORT, config.HOST, () => {
    console.log(`[ProjectFlow] Fullstack Server running at http://${config.HOST}:${config.PORT}`);
    console.log(`[ProjectFlow] API Health check available at http://${config.HOST}:${config.PORT}${config.API_PREFIX}/health`);
  });

  const shutdown = () => {
    console.log('[ProjectFlow] Shutting down gracefully...');
    server.close(() => {
      console.log('[ProjectFlow] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('[ProjectFlow] Failed to start server:', err);
  process.exit(1);
});
