"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shutdownWorkerPool = void 0;
const express_1 = require("express");
const workerPool_1 = require("../services/workerPool");
const router = (0, express_1.Router)();
const workerPool = new workerPool_1.WorkerPool();
router.post('/tasks', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || typeof message !== 'string') {
            res.status(400).json({
                error: 'Invalid request body. Expected { "message": "string" }'
            });
            return;
        }
        if (message.trim().length === 0) {
            res.status(400).json({
                error: 'Message cannot be empty'
            });
            return;
        }
        const taskId = await workerPool.enqueueTask(message.trim());
        res.status(201).json({
            taskId,
            message: 'Task enqueued successfully'
        });
    }
    catch (error) {
        console.error('Error enqueuing task:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});
router.get('/statistics', (req, res) => {
    try {
        const statistics = workerPool.getStatistics();
        res.json(statistics);
    }
    catch (error) {
        console.error('Error getting statistics:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});
const shutdownWorkerPool = async () => {
    await workerPool.shutdown();
};
exports.shutdownWorkerPool = shutdownWorkerPool;
exports.default = router;
//# sourceMappingURL=tasks.js.map