 interface Task {
  id: string;
  message: string;
  createdAt: Date;
  attempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processingStartTime?: Date;
  processingEndTime?: Date;
  error?: string;
}

 interface WorkerMessage {
  type: 'PROCESS_TASK';
  task: Task;
}

 interface WorkerResponse {
  type: 'TASK_COMPLETED' | 'TASK_FAILED';
  taskId: string;
  processingTime: number;
  error?: string;
}

 interface Statistics {
  tasksProcessed: number;
  retries: number;
  tasksSucceeded: number;
  tasksFailed: number;
  averageProcessingTime: number;
  currentQueueLength: number;
  idleWorkers: number;
  hotWorkers: number;
}

 interface Config {
  serverPort: number;
  taskSimulatedDuration: number;
  taskSimulatedErrorPercentage: number;
  taskErrorRetryDelay: number;
  taskMaxRetries: number;
  workerTimeout: number;
}

export {Task, WorkerMessage, WorkerResponse, Statistics, Config};