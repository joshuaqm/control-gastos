import { Router } from 'express';
import { AppDataSource } from '../config/database';

const router = Router();

router.get('/', async (req, res) => {
  try {
    // Check database connection
    const isConnected = AppDataSource.isInitialized;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: isConnected ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: (error as Error).message
    });
  }
});

export { router as healthRouter };