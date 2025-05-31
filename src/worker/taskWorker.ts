import { parentPort, workerData } from 'worker_threads';
import { WorkerMessage, WorkerResponse, Task } from '../types';
import { FileLogger } from '../utils/fileLogger';

const logger = new FileLogger();
const workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Simulate task processing
async function processTask(task: Task): Promise<{ success: boolean; error?: string; processingTime: number }> {
  const startTime = Date.now();
  
  try {
    // Log task start
    await logger.appendLog(workerId, task.id, `Started processing: ${task.message}`);
    
    // Simulate processing time
    const duration = workerData.taskSimulatedDuration || 2000;
    await new Promise(resolve => setTimeout(resolve, duration));
    
    // Simulate random failures
    const errorPercentage = workerData.taskSimulatedErrorPercentage || 20;
    const shouldFail = Math.random() * 100 < errorPercentage;
    
    if (shouldFail) {
      const error = `Simulated failure for task ${task.id}`;
      await logger.appendLog(workerId, task.id, `Failed: ${error}`);
      return {
        success: false,
        error,
        processingTime: Date.now() - startTime
      };
    }
    
    // Log successful completion
    await logger.appendLog(workerId, task.id, `Completed successfully: ${task.message}`);
    
    return {
      success: true,
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logger.appendLog(workerId, task.id, `Error: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage,
      processingTime: Date.now() - startTime
    };
  }
}

// Handle messages from main thread
if (parentPort) {
  parentPort.on('message', async (message: WorkerMessage) => {
    if (message.type === 'PROCESS_TASK') {
      const result = await processTask(message.task);
      
      const response: WorkerResponse = {
        type: result.success ? 'TASK_COMPLETED' : 'TASK_FAILED',
        taskId: message.task.id,
        processingTime: result.processingTime,
        error: result.error
      };
      
      parentPort!.postMessage(response);
    }
  });
  
  // Signal that worker is ready
  parentPort.postMessage({ type: 'WORKER_READY', workerId });
} 