"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerPool = void 0;
const worker_threads_1 = require("worker_threads");
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
const config_1 = require("../config");
class WorkerPool {
    constructor() {
        this.workers = new Map();
        this.taskQueue = [];
        this.statistics = {
            tasksProcessed: 0,
            retries: 0,
            tasksSucceeded: 0,
            tasksFailed: 0,
            averageProcessingTime: 0,
            currentQueueLength: 0,
            idleWorkers: 0,
            hotWorkers: 0,
        };
        this.processingTimes = [];
        this.maxWorkers = os.cpus().length;
        console.log(`Worker pool initialized with max ${this.maxWorkers} workers`);
    }
    async enqueueTask(message) {
        const task = {
            id: (0, uuid_1.v4)(),
            message,
            createdAt: new Date(),
            attempts: 0,
            status: 'pending',
        };
        this.taskQueue.push(task);
        this.updateStatistics();
        this.processNextTask();
        return task.id;
    }
    async processNextTask() {
        if (this.taskQueue.length === 0) {
            return;
        }
        const availableWorker = this.getAvailableWorker();
        if (!availableWorker) {
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
    getAvailableWorker() {
        for (const workerInfo of this.workers.values()) {
            if (workerInfo.isIdle) {
                return workerInfo;
            }
        }
        return null;
    }
    async createWorker() {
        try {
            const workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const workerPath = path.join(__dirname, '../worker/taskWorker.js');
            const worker = new worker_threads_1.Worker(workerPath, {
                workerData: {
                    taskSimulatedDuration: config_1.config.taskSimulatedDuration,
                    taskSimulatedErrorPercentage: config_1.config.taskSimulatedErrorPercentage,
                },
            });
            const workerInfo = {
                worker,
                id: workerId,
                isIdle: true,
                lastUsed: new Date(),
            };
            worker.on('message', (response) => {
                this.handleWorkerResponse(workerInfo, response);
            });
            worker.on('error', (error) => {
                console.error(`Worker ${workerId} error:`, error);
                this.removeWorker(workerId);
            });
            worker.on('exit', (code) => {
                if (code !== 0) {
                    console.error(`Worker ${workerId} exited with code ${code}`);
                }
                this.removeWorker(workerId);
            });
            this.workers.set(workerId, workerInfo);
            this.updateStatistics();
            return workerInfo;
        }
        catch (error) {
            console.error('Failed to create worker:', error);
            return null;
        }
    }
    assignTaskToWorker(workerInfo) {
        const task = this.taskQueue.shift();
        if (!task) {
            return;
        }
        task.status = 'processing';
        task.processingStartTime = new Date();
        task.attempts++;
        workerInfo.isIdle = false;
        workerInfo.lastUsed = new Date();
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
    handleWorkerResponse(workerInfo, response) {
        const { taskId, processingTime, error } = response;
        this.processingTimes.push(processingTime);
        if (this.processingTimes.length > 1000) {
            this.processingTimes = this.processingTimes.slice(-1000);
        }
        this.statistics.tasksProcessed++;
        if (response.type === 'TASK_COMPLETED') {
            this.statistics.tasksSucceeded++;
        }
        else {
            this.statistics.tasksFailed++;
            const failedTask = this.findTaskById(taskId);
            if (failedTask && failedTask.attempts < config_1.config.taskMaxRetries) {
                this.statistics.retries++;
                setTimeout(() => {
                    failedTask.status = 'pending';
                    this.taskQueue.push(failedTask);
                    this.processNextTask();
                }, config_1.config.taskErrorRetryDelay);
            }
        }
        if (this.processingTimes.length > 0) {
            this.statistics.averageProcessingTime =
                this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length;
        }
        workerInfo.isIdle = true;
        workerInfo.lastUsed = new Date();
        workerInfo.timeout = setTimeout(() => {
            this.removeWorker(workerInfo.id);
        }, config_1.config.workerTimeout);
        this.updateStatistics();
        this.processNextTask();
    }
    findTaskById(taskId) {
        return this.taskQueue.find(task => task.id === taskId);
    }
    removeWorker(workerId) {
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
    updateStatistics() {
        this.statistics.currentQueueLength = this.taskQueue.length;
        this.statistics.idleWorkers = Array.from(this.workers.values()).filter(w => w.isIdle).length;
        this.statistics.hotWorkers = Array.from(this.workers.values()).filter(w => !w.isIdle).length;
    }
    getStatistics() {
        return { ...this.statistics };
    }
    async shutdown() {
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
exports.WorkerPool = WorkerPool;
//# sourceMappingURL=workerPool.js.map