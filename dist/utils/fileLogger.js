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
exports.FileLogger = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const lockfile = __importStar(require("proper-lockfile"));
class FileLogger {
    constructor(logFileName = 'tasks.log') {
        this.logFilePath = path.join(process.cwd(), 'logs', logFileName);
        this.lockFilePath = `${this.logFilePath}.lock`;
        const logsDir = path.dirname(this.logFilePath);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        if (!fs.existsSync(this.logFilePath)) {
            fs.writeFileSync(this.logFilePath, '', 'utf8');
        }
    }
    async appendLog(workerId, taskId, message) {
        const timestamp = new Date().toISOString();
        const logEntry = `${timestamp} | Worker: ${workerId} | Task: ${taskId} | Message: ${message}\n`;
        try {
            const release = await lockfile.lock(this.logFilePath, {
                retries: {
                    retries: 5,
                    factor: 2,
                    minTimeout: 100,
                    maxTimeout: 1000,
                },
            });
            try {
                await fs.promises.appendFile(this.logFilePath, logEntry, 'utf8');
            }
            finally {
                await release();
            }
        }
        catch (error) {
            console.error('Failed to write to log file:', error);
            throw error;
        }
    }
    async readLogs() {
        try {
            if (fs.existsSync(this.logFilePath)) {
                return await fs.promises.readFile(this.logFilePath, 'utf8');
            }
            return '';
        }
        catch (error) {
            console.error('Failed to read log file:', error);
            return '';
        }
    }
    getLogFilePath() {
        return this.logFilePath;
    }
}
exports.FileLogger = FileLogger;
//# sourceMappingURL=fileLogger.js.map