import { app } from './app.js';
import { config } from './config/index.js';

const server = app.listen(config.PORT, config.HOST, () => {
  console.log(`[ProjectFlow API] Server running at http://${config.HOST}:${config.PORT}${config.API_PREFIX}`);
});

process.on('SIGTERM', () => {
  console.log('[ProjectFlow API] SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('[ProjectFlow API] Process terminated.');
  });
});
