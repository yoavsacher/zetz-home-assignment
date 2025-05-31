import { Statistics } from '../types';
export declare class WorkerPool {
    private workers;
    private taskQueue;
    private maxWorkers;
    private statistics;
    private processingTimes;
    constructor();
    enqueueTask(message: string): Promise<string>;
    private processNextTask;
    private getAvailableWorker;
    private createWorker;
    private assignTaskToWorker;
    private handleWorkerResponse;
    private findTaskById;
    private removeWorker;
    private updateStatistics;
    getStatistics(): Statistics;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=workerPool.d.ts.map