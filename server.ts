import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './src/main/database/db';
import apiRouter from './src/main/routes/routes';
import { SocketServer } from './src/main/socket/socket';
import { ComputerService } from './src/main/services/services';
import { logger } from './src/main/utils/logger';

async function startServer() {
  logger.info("Bootstrapping NEX Cafe Management backend server...");
  
  // 1. Initialize persistent storage
  db.init();

  const app = express();
  const server = http.createServer(app);

  // 2. Middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 3. Mount API Routes
  app.use('/api', apiRouter);

  // 4. Session Heartbeat & Timer Service (Runs every 1 second)
  const pcService = new ComputerService();
  setInterval(() => {
    try {
      pcService.tickSessions();
    } catch (err: any) {
      logger.error(`Error in session ticking job: ${err.message}`);
    }
  }, 1000);

  // 5. Mount Vite or Static asset handlers
  if (process.env.NODE_ENV !== "production") {
    logger.info("Initializing Vite middleware for development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    logger.info("Running in PRODUCTION mode. Serving static frontend assets...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 6. Connect Real-time Sockets
  const socketServer = new SocketServer(server);

  // 7. Bind and Listen
  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    logger.info(`NEX Computer Shop server actively listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  logger.error("FATAL: Failed to launch backend server process:", error);
});
