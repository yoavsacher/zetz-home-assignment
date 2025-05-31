import * as fs from 'fs';
import * as path from 'path';
import * as lockfile from 'proper-lockfile';

export class FileLogger {
  private logFilePath: string;
  private lockFilePath: string;

  constructor(logFileName: string = 'tasks.log') {
    this.logFilePath = path.join(process.cwd(), 'logs', logFileName);
    this.lockFilePath = `${this.logFilePath}.lock`;
    
    // Ensure logs directory exists
    const logsDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Ensure log file exists
    if (!fs.existsSync(this.logFilePath)) {
      fs.writeFileSync(this.logFilePath, '', 'utf8');
    }
  }

  async appendLog(workerId: string, taskId: string, message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} | Worker: ${workerId} | Task: ${taskId} | Message: ${message}\n`;

    try {
      // Acquire lock on the log file
      const release = await lockfile.lock(this.logFilePath, {
        retries: {
          retries: 5,
          factor: 2,
          minTimeout: 100,
          maxTimeout: 1000,
        },
      });

      try {
        // Append to log file
        await fs.promises.appendFile(this.logFilePath, logEntry, 'utf8');
      } finally {
        // Always release the lock
        await release();
      }
    } catch (error) {
      console.error('Failed to write to log file:', error);
      throw error;
    }
  }

  async readLogs(): Promise<string> {
    try {
      if (fs.existsSync(this.logFilePath)) {
        return await fs.promises.readFile(this.logFilePath, 'utf8');
      }
      return '';
    } catch (error) {
      console.error('Failed to read log file:', error);
      return '';
    }
  }

  getLogFilePath(): string {
    return this.logFilePath;
  }
} 