import dotenv from 'dotenv';
import { Config } from '../types';

// Load environment variables
dotenv.config();

export const config: Config = {
  serverPort: parseInt(process.env.SERVER_PORT || '3000', 10),
  taskSimulatedDuration: parseInt(process.env.TASK_SIMULATED_DURATION || '2000', 10),
  taskSimulatedErrorPercentage: parseInt(process.env.TASK_SIMULATED_ERROR_PERCENTAGE || '20', 10),
  taskErrorRetryDelay: parseInt(process.env.TASK_ERROR_RETRY_DELAY || '1000', 10),
  taskMaxRetries: parseInt(process.env.TASK_MAX_RETRIES || '3', 10),
  workerTimeout: parseInt(process.env.WORKER_TIMEOUT || '30000', 10),
};

// Validate configuration
if (config.taskSimulatedErrorPercentage < 0 || config.taskSimulatedErrorPercentage > 100) {
  throw new Error('TASK_SIMULATED_ERROR_PERCENTAGE must be between 0 and 100');
}

if (config.taskMaxRetries < 0) {
  throw new Error('TASK_MAX_RETRIES must be non-negative');
}

if (config.taskSimulatedDuration < 0) {
  throw new Error('TASK_SIMULATED_DURATION must be non-negative');
}

console.log('Configuration loaded:', config); 