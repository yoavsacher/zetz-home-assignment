import { Router, Request, Response } from 'express';
import { WorkerPool } from '../services/workerPool';

const router = Router();
const workerPool = new WorkerPool();

// POST /tasks - Enqueue a new task
router.post('/tasks', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message } = req.body;
    
    // Validate input
    if (!message || typeof message !== 'string') {
      res.status(400).json({
        error: 'Invalid request body. Expected { "message": "string" }'
      });
      return;
    }
    
    if (message.trim().length === 0) {
      res.status(400).json({
        error: 'Message cannot be empty'
      });
      return;
    }
    
    // Enqueue the task
    const taskId = await workerPool.enqueueTask(message.trim());
    
    res.status(201).json({
      taskId,
      message: 'Task enqueued successfully'
    });
  } catch (error) {
    console.error('Error enqueuing task:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// GET /statistics - Get real-time processing metrics
router.get('/statistics', (req: Request, res: Response): void => {
  try {
    const statistics = workerPool.getStatistics();
    res.json(statistics);
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Graceful shutdown handler
export const shutdownWorkerPool = async (): Promise<void> => {
  await workerPool.shutdown();
};

export default router; 