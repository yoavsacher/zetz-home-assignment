# Tasks Microservice

A self-contained microservice for asynchronous task processing with worker threads, built with Node.js and TypeScript.

## Features

- **Asynchronous Task Processing**: Uses Node.js worker threads for concurrent task execution
- **Thread-Safe Logging**: Safe concurrent writes to shared log files using file locking
- **Real-time Metrics**: Live statistics on task processing, retries, and worker status
- **Configurable Behavior**: Environment-based configuration for processing duration, error rates, and retry logic
- **Graceful Shutdown**: Proper cleanup of workers and resources
- **Auto-scaling Workers**: Creates workers on-demand up to CPU core count
- **Worker Lifecycle Management**: Automatic worker timeout and cleanup

## API Endpoints

### POST `/tasks`
Enqueue a new task for asynchronous processing.

**Request Body:**
```json
{
  "message": "Your task message here"
}
```

**Response:**
```json
{
  "taskId": "uuid-generated-task-id",
  "message": "Task enqueued successfully"
}
```

### GET `/statistics`
Get real-time processing metrics.

**Response:**
```json
{
  "tasksProcessed": 42,
  "retries": 5,
  "tasksSucceeded": 37,
  "tasksFailed": 5,
  "averageProcessingTime": 2150.5,
  "currentQueueLength": 3,
  "idleWorkers": 2,
  "hotWorkers": 1
}
```

### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5
}
```

## Configuration

The microservice can be configured using environment variables. Create a `.env` file in the root directory:

```env
# Server Configuration
SERVER_PORT=3000

# Task Processing Configuration
TASK_SIMULATED_DURATION=2000
TASK_SIMULATED_ERROR_PERCENTAGE=20
TASK_ERROR_RETRY_DELAY=1000
TASK_MAX_RETRIES=3

# Worker Configuration
WORKER_TIMEOUT=30000
```

### Configuration Options

- `SERVER_PORT`: HTTP server port (default: 3000)
- `TASK_SIMULATED_DURATION`: Simulated task duration in milliseconds (default: 2000)
- `TASK_SIMULATED_ERROR_PERCENTAGE`: Percentage of tasks that should fail (0-100, default: 20)
- `TASK_ERROR_RETRY_DELAY`: Delay between retries in milliseconds (default: 1000)
- `TASK_MAX_RETRIES`: Maximum number of retries per task (default: 3)
- `WORKER_TIMEOUT`: Idle timeout for workers in milliseconds (default: 30000)

## Installation and Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone or extract the project:**
   ```bash
   cd tasks-microservice
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file (optional):**
   ```bash
   cp .env.example .env
   # Edit .env with your preferred settings
   ```

4. **Build the TypeScript code:**
   ```bash
   npm run build
   ```

5. **Start the service:**
   ```bash
   npm start
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

## Usage Examples

### Using curl

1. **Health Check:**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Enqueue a Task:**
   ```bash
   curl -X POST http://localhost:3000/tasks \
     -H "Content-Type: application/json" \
     -d '{"message": "Process this important task"}'
   ```

3. **Get Statistics:**
   ```bash
   curl http://localhost:3000/statistics
   ```

4. **Enqueue Multiple Tasks:**
   ```bash
   # Task 1
   curl -X POST http://localhost:3000/tasks \
     -H "Content-Type: application/json" \
     -d '{"message": "First task"}'

   # Task 2
   curl -X POST http://localhost:3000/tasks \
     -H "Content-Type: application/json" \
     -d '{"message": "Second task"}'

   # Check statistics
   curl http://localhost:3000/statistics
   ```

### Using JavaScript/Node.js

```javascript
// Enqueue a task
const response = await fetch('http://localhost:3000/tasks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'My task message'
  })
});

const result = await response.json();
console.log('Task ID:', result.taskId);

// Get statistics
const statsResponse = await fetch('http://localhost:3000/statistics');
const stats = await statsResponse.json();
console.log('Current statistics:', stats);
```

## Development

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start the production server
- `npm run dev` - Start development server with ts-node
- `npm run watch` - Start development server with auto-reload
- `npm run clean` - Remove compiled files

### Project Structure

```
src/
├── config/           # Configuration management
├── routes/           # Express route handlers
├── services/         # Business logic (WorkerPool)
├── types/            # TypeScript type definitions
├── utils/            # Utility functions (FileLogger)
├── worker/           # Worker thread implementation
└── server.ts         # Main application entry point
```

## Logging

The service creates a `logs/` directory with a `tasks.log` file that contains all task processing events:

```
2024-01-15T10:30:15.123Z | Worker: worker-1705315815123-abc123 | Task: uuid-task-id | Message: Started processing: My task
2024-01-15T10:30:17.456Z | Worker: worker-1705315815123-abc123 | Task: uuid-task-id | Message: Completed successfully: My task
```

## Error Handling

- **Invalid Requests**: Returns 400 with error details
- **Server Errors**: Returns 500 with generic error message
- **Task Failures**: Automatically retried based on configuration
- **Worker Failures**: Workers are automatically recreated as needed

## Graceful Shutdown

The service handles shutdown signals (SIGTERM, SIGINT) gracefully:
1. Stops accepting new HTTP connections
2. Waits for active workers to complete current tasks
3. Terminates all worker threads
4. Exits cleanly

## Performance Considerations

- **Worker Scaling**: Number of workers scales up to CPU core count
- **Memory Management**: Processing time history is limited to last 1000 entries
- **File Locking**: Uses proper-lockfile for thread-safe log writes
- **Worker Lifecycle**: Idle workers automatically terminate after timeout

## Troubleshooting

### Common Issues

1. **Port already in use**: Change `SERVER_PORT` in environment variables
2. **Permission errors**: Ensure write permissions for logs directory
3. **Worker failures**: Check system resources and reduce `TASK_SIMULATED_DURATION`

### Debugging

Enable verbose logging by setting `NODE_ENV=development` and check:
- Console output for worker creation/termination
- `logs/tasks.log` for task processing details
- `/statistics` endpoint for real-time metrics

## License

MIT # zetz-home-assignment
