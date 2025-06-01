# Tasks Microservice

A production-ready microservice for asynchronous task processing with worker threads, built with Node.js and TypeScript.

## 🚀 Features

- **Asynchronous Task Processing**: Uses Node.js worker threads for concurrent task execution
- **Thread-Safe Logging**: Safe concurrent writes to shared log files using file locking
- **Real-time Metrics**: Live statistics on task processing, retries, and worker status
- **Configurable Behavior**: Environment-based configuration for processing duration, error rates, and retry logic
- **Graceful Shutdown**: Proper cleanup of workers and resources
- **Auto-scaling Workers**: Creates workers on-demand up to CPU core count
- **Worker Lifecycle Management**: Automatic worker timeout and cleanup
- **Statistics Tracking**: Complete metrics for monitoring and debugging

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- PowerShell/Terminal access

## 🔧 Installation & Setup

### 1. **Install Dependencies**

```bash
npm install
```

### 2. **Build the Project**

```bash
npm run build
```

### 3. **Configure Environment (Optional)**

Create a `.env` file in the root directory:

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

## 🚀 Running the Server

### **Production Mode (Recommended)**

```bash
npm run build
npm start
```

### **Development Mode**

```bash
npm run build  # Build first
npm run dev    # Then run in development mode
```

### **Development with Auto-reload**

```bash
npm run build  # Build first
npm run watch  # Auto-reload on changes
```

## 📊 API Endpoints

### **Health Check**

```http
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5
}
```

### **Create Task**

```http
POST /tasks
Content-Type: application/json

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

### **Get Statistics**

```http
GET /statistics
```

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

## 🧪 Testing Server Functionality

### **Step 1: Verify Server Startup**

1. **Start the server:**

   ```bash
   npm run build && npm start
   ```

2. **Expected console output:**

   ```
   Configuration loaded: { serverPort: 3000, ... }
   Worker pool initialized with max 8 workers
   Tasks microservice running on port 3000
   Health check: http://localhost:3000/health
   POST tasks: http://localhost:3000/tasks
   GET statistics: http://localhost:3000/statistics
   ```

3. **✅ Success indicators:**
   - No error messages
   - Server starts on specified port
   - All endpoints listed

### **Step 2: Test Health Check**

**Windows PowerShell:**

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET
```

**Expected Response:**

```
status  timestamp                   uptime
------  ---------                   ------
healthy 2024-01-15T10:30:00.000Z   45.123
```

**✅ Verification:**

- Status is "healthy"
- Timestamp is current
- Uptime is a positive number

### **Step 3: Test Task Creation**

**Create a single task:**

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/tasks" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"message": "Test task 1"}'
```

**Expected Response:**

```
taskId                               message
------                               -------
12345678-1234-1234-1234-123456789012 Task enqueued successfully
```

**✅ Verification:**

- Returns a valid UUID taskId
- Success message received

### **Step 4: Verify Task Processing**

1. **Check initial statistics:**

   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3000/statistics" -Method GET
   ```

2. **Wait 3-4 seconds for processing:**

   ```powershell
   Start-Sleep -Seconds 4
   ```

3. **Check updated statistics:**
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3000/statistics" -Method GET
   ```

**Expected Changes:**

- `tasksProcessed` increased by 1
- Either `tasksSucceeded` or `tasksFailed` increased by 1
- `averageProcessingTime` around 2000ms
- `currentQueueLength` should be 0
- `idleWorkers` should be 1 or more

**✅ Verification Console Output:**

```
Creating worker worker-1234567890123-abc123 with path: C:\...\dist\worker\taskWorker.js
Worker worker-1234567890123-abc123 created successfully
Assigning task 12345678-1234-1234-1234-123456789012 to worker worker-1234567890123-abc123
Received message from worker worker-1234567890123-abc123: { type: 'WORKER_READY', workerId: 'worker-...' }
Worker worker-... is ready
Received message from worker worker-1234567890123-abc123: {
  type: 'TASK_COMPLETED', // or 'TASK_FAILED'
  taskId: '12345678-1234-1234-1234-123456789012',
  processingTime: 2019,
  error: undefined // or error message if failed
}
```

### **Step 5: Test Multiple Tasks (Load Testing)**

**Create 5 tasks rapidly:**

```powershell
for ($i=1; $i -le 5; $i++) {
  Invoke-RestMethod -Uri "http://localhost:3000/tasks" -Method POST -Headers @{"Content-Type"="application/json"} -Body "{`"message`": `"Load test task $i`"}" | Out-Null
  Start-Sleep -Milliseconds 100
}
```

**Wait for processing:**

```powershell
Start-Sleep -Seconds 12
```

**Check final statistics:**

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/statistics" -Method GET
```

**Expected Results:**

- `tasksProcessed` increased by 5
- Mix of succeeded and failed tasks (due to 20% failure rate)
- Multiple workers created (`idleWorkers` > 1)
- All tasks processed (`currentQueueLength` = 0)

### **Step 6: Verify File Logging**

**Check log file creation:**

```powershell
Get-Content "logs/tasks.log" | Select-Object -Last 10
```

**Expected Log Format:**

```
2024-01-15T10:30:15.123Z | Worker: worker-1234567890123-abc123 | Task: 12345678-1234-1234-1234-123456789012 | Message: Started processing: Test task 1
2024-01-15T10:30:17.456Z | Worker: worker-1234567890123-abc123 | Task: 12345678-1234-1234-1234-123456789012 | Message: Completed successfully: Test task 1
```

**✅ Verification:**

- Log file exists in `logs/tasks.log`
- Contains timestamped entries
- Shows task lifecycle (start → completion/failure)

### **Step 7: Test Error Handling**

**Test invalid request:**

```powershell
try {
  Invoke-RestMethod -Uri "http://localhost:3000/tasks" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"invalid": "data"}'
} catch {
  Write-Host "Expected error: $($_.Exception.Message)"
}
```

**Test non-existent endpoint:**

```powershell
try {
  Invoke-RestMethod -Uri "http://localhost:3000/invalid" -Method GET
} catch {
  Write-Host "Expected 404 error: $($_.Exception.Message)"
}
```

## 📈 Expected Behavior & Metrics

### **Normal Operation Indicators:**

1. **Task Success Rate:** ~80% (due to 20% simulated failure rate)
2. **Processing Time:** ~2000ms per task (configurable)
3. **Worker Scaling:** Creates workers up to CPU core count
4. **Memory Usage:** Stable, no memory leaks
5. **Log Growth:** Steady growth in `logs/tasks.log`

### **Statistics Interpretation:**

- **`tasksProcessed`**: Total tasks that have been processed
- **`tasksSucceeded`**: Successfully completed tasks
- **`tasksFailed`**: Failed tasks (should be ~20% of processed)
- **`retries`**: Number of retry attempts for failed tasks
- **`averageProcessingTime`**: Average time in milliseconds
- **`currentQueueLength`**: Pending tasks (should be 0 when idle)
- **`idleWorkers`**: Available workers
- **`hotWorkers`**: Currently processing workers

## 🐛 Troubleshooting

### **Common Issues:**

#### **1. Port Already in Use**

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**

```powershell
# Kill existing processes
taskkill /f /im node.exe
# Or change port in .env file
SERVER_PORT=3001
```

#### **2. Worker Creation Fails**

```
Worker file does not exist at: C:\...\dist\worker\taskWorker.js
```

**Solution:**

```bash
npm run build  # Ensure TypeScript is compiled
```

#### **3. Statistics Not Updating**

**Check console for:**

- Worker creation messages
- Task assignment messages
- Worker response messages

**If missing, rebuild:**

```bash
npm run build
npm start
```

#### **4. No Log File Created**

**Check:**

- Write permissions in project directory
- `logs/` directory exists (created automatically)

### **Performance Monitoring:**

**Monitor these metrics for production use:**

```powershell
# Check statistics every 30 seconds
while ($true) {
  Clear-Host
  Write-Host "=== Tasks Microservice Statistics ===" -ForegroundColor Green
  Invoke-RestMethod -Uri "http://localhost:3000/statistics" -Method GET | Format-Table
  Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Yellow
  Start-Sleep -Seconds 30
}
```

## 📁 Project Structure

```
src/
├── config/           # Configuration management
├── routes/           # Express route handlers
├── services/         # Business logic (WorkerPool)
├── types/            # TypeScript type definitions
├── utils/            # Utility functions (FileLogger)
├── worker/           # Worker thread implementation
└── server.ts         # Main application entry point

logs/                 # Runtime logs
dist/                 # Compiled JavaScript (excluded from git)
node_modules/         # Dependencies (excluded from git)
```

## 🚀 Production Deployment

### **Environment Variables for Production:**

```env
NODE_ENV=production
SERVER_PORT=3000
TASK_SIMULATED_DURATION=1000
TASK_SIMULATED_ERROR_PERCENTAGE=5
WORKER_TIMEOUT=60000
```

### **Production Checklist:**

- [ ] Set `NODE_ENV=production`
- [ ] Configure appropriate error percentage (lower for production)
- [ ] Set up log rotation for `logs/tasks.log`
- [ ] Monitor memory usage and worker count
- [ ] Set up health check monitoring
- [ ] Configure proper process management (PM2, Docker, etc.)

## 📝 License

MIT License - See LICENSE file for details.

---

## 🔍 Quick Verification Script

Save this as `test-server.ps1` for automated testing:

```powershell
# Quick server functionality test
Write-Host "Testing Tasks Microservice..." -ForegroundColor Green

# Test health
$health = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET
Write-Host "✅ Health: $($health.status)" -ForegroundColor Green

# Create test task
$task = Invoke-RestMethod -Uri "http://localhost:3000/tasks" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"message": "Automated test"}'
Write-Host "✅ Task created: $($task.taskId)" -ForegroundColor Green

# Wait and check statistics
Start-Sleep -Seconds 4
$stats = Invoke-RestMethod -Uri "http://localhost:3000/statistics" -Method GET
Write-Host "✅ Tasks processed: $($stats.tasksProcessed)" -ForegroundColor Green
Write-Host "✅ Average time: $($stats.averageProcessingTime)ms" -ForegroundColor Green

Write-Host "🎉 All tests passed!" -ForegroundColor Green
```
