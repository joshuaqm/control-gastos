import 'reflect-metadata';
import dotenv from 'dotenv';

// Align server-side date calculations (month boundaries, reminders) with
// Ciudad de México time even when TZ isn't set at the OS level.
process.env.TZ = process.env.TZ || 'America/Mexico_City';

import app from './app';
import { ensureDb } from './config/database';
import { logger } from './utils/logger';

dotenv.config();

const PORT = Number(process.env.PORT) || 8000;

// Inicializar base de datos y servidor (desarrollo local / Docker)
ensureDb()
  .then(() => {
    logger.info('Database connected successfully');
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((error) => {
    logger.error('Database connection failed:', error);
    process.exit(1);
  });

export default app;
