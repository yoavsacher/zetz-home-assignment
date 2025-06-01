import { Worker } from 'worker_threads';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Task, WorkerResponse, Statistics } from '../types';
import { config } from '../config';

interface WorkerInfo {
  worker: Worker;
  id: string;
  isIdle: boolean;
  lastUsed: Date;
  timeout?: NodeJS.Timeout;
}

export class WorkerPool {
  private workers: Map<string, WorkerInfo> = new Map();
  private taskQueue: Task[] = [];
  private maxWorkers: number;
  private statistics: Statistics = {
    tasksProcessed: 0,
    retries: 0,
    tasksSucceeded: 0,
    tasksFailed: 0,
    averageProcessingTime: 0,
    currentQueueLength: 0,
    idleWorkers: 0,
    hotWorkers: 0,
  };
  private processingTimes: number[] = [];

  constructor() {
    this.maxWorkers = os.cpus().length;
    console.log(`Worker pool initialized with max ${this.maxWorkers} workers`);
  }

  async enqueueTask(message: string): Promise<string> {
    const task: Task = {
      id: uuidv4(),
      message,
      createdAt: new Date(),
      attempts: 0,
      status: 'pending',
    };

    this.taskQueue.push(task);
    this.updateStatistics();

    // Try to process the task immediately
    this.processNextTask();

    return task.id;
  }

  private async processNextTask(): Promise<void> {
    if (this.taskQueue.length === 0) {
      return;
    }

    const availableWorker = this.getAvailableWorker();
    if (!availableWorker) {
      // Try to create a new worker if under limit
      if (this.workers.size < this.maxWorkers) {
        const newWorker = await this.createWorker();
        if (newWorker) {
          this.assignTaskToWorker(newWorker);
        }
      }
      return;
    }

    this.assignTaskToWorker(availableWorker);
  }

  private getAvailableWorker(): WorkerInfo | null {
    return (
      Array.from(this.workers.values()).find(workerInfo => workerInfo.isIdle) ||
      null
    );
  }

  private async createWorker(): Promise<WorkerInfo | null> {
    try {
      const workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Always use the compiled JS file from dist directory
      // This works for both development (after build) and production
      const workerPath = path.resolve(
        process.cwd(),
        'dist/worker/taskWorker.js'
      );

      console.log(`Creating worker ${workerId} with path: ${workerPath}`);

      // Check if the worker file exists
      if (!fs.existsSync(workerPath)) {
        console.error(`Worker file does not exist at: ${workerPath}`);
        console.log(`Current working directory: ${process.cwd()}`);
        console.log(
          `Please run 'npm run build' first to compile TypeScript files`
        );
        return null;
      }

      const worker = new Worker(workerPath, {
        workerData: {
          taskSimulatedDuration: config.taskSimulatedDuration,
          taskSimulatedErrorPercentage: config.taskSimulatedErrorPercentage,
        },
      });

      const workerInfo: WorkerInfo = {
        worker,
        id: workerId,
        isIdle: true,
        lastUsed: new Date(),
      };

      // Set up worker event handlers
      worker.on('message', (response: WorkerResponse) => {
        console.log(`Received message from worker ${workerId}:`, response);
        this.handleWorkerResponse(workerInfo, response);
      });

      worker.on('error', error => {
        console.error(`Worker ${workerId} error:`, error);
        this.removeWorker(workerId);
      });

      worker.on('exit', code => {
        if (code !== 0) {
          console.error(`Worker ${workerId} exited with code ${code}`);
        }
        this.removeWorker(workerId);
      });

      this.workers.set(workerId, workerInfo);
      this.updateStatistics();

      console.log(`Worker ${workerId} created successfully`);
      return workerInfo;
    } catch (error) {
      console.error('Failed to create worker:', error);
      return null;
    }
  }

  private assignTaskToWorker(workerInfo: WorkerInfo): void {
    const task = this.taskQueue.shift();
    if (!task) {
      return;
    }

    console.log(`Assigning task ${task.id} to worker ${workerInfo.id}`);

    task.status = 'processing';
    task.processingStartTime = new Date();
    task.attempts++;

    workerInfo.isIdle = false;
    workerInfo.lastUsed = new Date();

    // Clear existing timeout
    if (workerInfo.timeout) {
      clearTimeout(workerInfo.timeout);
      workerInfo.timeout = undefined;
    }

    workerInfo.worker.postMessage({
      type: 'PROCESS_TASK',
      task,
    });

    this.updateStatistics();
  }

  private handleWorkerResponse(
    workerInfo: WorkerInfo,
    response: WorkerResponse | any
  ): void {
    // Handle WORKER_READY message
    if (response.type === 'WORKER_READY') {
      console.log(`Worker ${response.workerId} is ready`);
      return;
    }

    // Only process task-related responses
    if (response.type !== 'TASK_COMPLETED' && response.type !== 'TASK_FAILED') {
      return;
    }

    const { taskId, processingTime, error } = response;

    // Update processing times for average calculation
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > 1000) {
      this.processingTimes = this.processingTimes.slice(-1000); // Keep last 1000 entries
    }

    // Update statistics
    this.statistics.tasksProcessed++;

    if (response.type === 'TASK_COMPLETED') {
      this.statistics.tasksSucceeded++;
    } else {
      this.statistics.tasksFailed++;

      // Handle retry logic
      const failedTask = this.findTaskById(taskId);
      if (failedTask && failedTask.attempts < config.taskMaxRetries) {
        this.statistics.retries++;

        // Schedule retry after delay
        setTimeout(() => {
          failedTask.status = 'pending';
          this.taskQueue.push(failedTask);
          this.processNextTask();
        }, config.taskErrorRetryDelay);
      }
    }

    // Calculate average processing time
    if (this.processingTimes.length > 0) {
      this.statistics.averageProcessingTime =
        this.processingTimes.reduce((sum, time) => sum + time, 0) /
        this.processingTimes.length;
    }

    // Mark worker as idle and set timeout
    workerInfo.isIdle = true;
    workerInfo.lastUsed = new Date();

    // Set worker timeout
    workerInfo.timeout = setTimeout(() => {
      this.removeWorker(workerInfo.id);
    }, config.workerTimeout);

    this.updateStatistics();

    // Process next task if available
    this.processNextTask();
  }

  private findTaskById(taskId: string): Task | undefined {
    return this.taskQueue.find(task => task.id === taskId);
  }

  private removeWorker(workerId: string): void {
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      if (workerInfo.timeout) {
        clearTimeout(workerInfo.timeout);
      }
      workerInfo.worker.terminate();
      this.workers.delete(workerId);
      this.updateStatistics();
    }
  }

  private updateStatistics(): void {
    this.statistics.currentQueueLength = this.taskQueue.length;
    this.statistics.idleWorkers = Array.from(this.workers.values()).filter(
      w => w.isIdle
    ).length;
    this.statistics.hotWorkers = Array.from(this.workers.values()).filter(
      w => !w.isIdle
    ).length;
  }

  getStatistics(): Statistics {
    return { ...this.statistics };
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down worker pool...');

    for (const workerInfo of this.workers.values()) {
      if (workerInfo.timeout) {
        clearTimeout(workerInfo.timeout);
      }
      await workerInfo.worker.terminate();
    }

    this.workers.clear();
    console.log('Worker pool shutdown complete');
  }
}
