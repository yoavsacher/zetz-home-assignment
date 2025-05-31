export declare class FileLogger {
    private logFilePath;
    private lockFilePath;
    constructor(logFileName?: string);
    appendLog(workerId: string, taskId: string, message: string): Promise<void>;
    readLogs(): Promise<string>;
    getLogFilePath(): string;
}
//# sourceMappingURL=fileLogger.d.ts.map