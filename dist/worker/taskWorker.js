"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const fileLogger_1 = require("../utils/fileLogger");
const logger = new fileLogger_1.FileLogger();
const workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
async function processTask(task) {
    const startTime = Date.now();
    try {
        await logger.appendLog(workerId, task.id, `Started processing: ${task.message}`);
        const duration = worker_threads_1.workerData.taskSimulatedDuration || 2000;
        await new Promise(resolve => setTimeout(resolve, duration));
        const errorPercentage = worker_threads_1.workerData.taskSimulatedErrorPercentage || 20;
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
        await logger.appendLog(workerId, task.id, `Completed successfully: ${task.message}`);
        return {
            success: true,
            processingTime: Date.now() - startTime
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await logger.appendLog(workerId, task.id, `Error: ${errorMessage}`);
        return {
            success: false,
            error: errorMessage,
            processingTime: Date.now() - startTime
        };
    }
}
if (worker_threads_1.parentPort) {
    worker_threads_1.parentPort.on('message', async (message) => {
        if (message.type === 'PROCESS_TASK') {
            const result = await processTask(message.task);
            const response = {
                type: result.success ? 'TASK_COMPLETED' : 'TASK_FAILED',
                taskId: message.task.id,
                processingTime: result.processingTime,
                error: result.error
            };
            worker_threads_1.parentPort.postMessage(response);
        }
    });
    worker_threads_1.parentPort.postMessage({ type: 'WORKER_READY', workerId });
}
//# sourceMappingURL=taskWorker.js.map