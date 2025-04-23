const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const { TaskStatus, WorkerStatus } = require("../common/status");
require("dotenv").config();
const TaskModel = require("./models/Task");

const WORKER_URLS = [
  process.env.WORKER_1,
  process.env.WORKER_2,
  process.env.WORKER_3,
];
const MAX_ACTIVE_REQUESTS = parseInt(process.env.MAX_ACTIVE_REQUESTS, 10) || 5;

async function restoreTasksFromDB() {
  
  try {
    console.log("Starting tasks restoration from DB...");
    const tasksFromDB = await TaskModel.find({
      status: { $in: [TaskStatus.IN_PROGRESS, TaskStatus.IN_QUEUE] },
    });
    console.log("→ restoreTasksFromDB(): found tasks", tasksFromDB.length);

    await Promise.all(tasksFromDB.map(async (task) => {
      const requestId = task.taskId;
      if (!requestId) {
        console.warn("Found task without requestId, skipping:", task._id);
        return;
      }

      const resetTask = {
        requestId,
        status: TaskStatus.IN_QUEUE,
        hash: task.hash,
        maxLength: task.maxLength,
        completedWorkers: 0,
        results: [],
        workerStatuses: Array(WORKER_URLS.length).fill(WorkerStatus.IN_PROGRESS),
        workerResults: Array(WORKER_URLS.length).fill([]),
        workerProgress: Array(WORKER_URLS.length).fill(0),
        progress: 0
      };

      await TaskModel.updateOne(
        { taskId: requestId },
        {
          status: TaskStatus.IN_QUEUE,
          workerProgress: resetTask.workerProgress,
          progress: 0
        }
      );

      console.log(`Restored task: ${requestId}`);
    }));

    processQueue();
    return true;
  } catch (err) {
    console.error("Failed to restore tasks from DB:", err);
    throw err;
  }
}


async function processQueue() {
  const hasInProgress = await TaskModel.exists({ 
    status: TaskStatus.IN_PROGRESS 
  });
  
  if (hasInProgress) return;

  const task = await TaskModel.findOneAndUpdate(
    { status: TaskStatus.IN_QUEUE },
    { $set: { status: TaskStatus.IN_PROGRESS } },
    { sort: { createdAt: 1 }, new: true }
  );

  if (!task) return;

  WORKER_URLS.forEach(async (workerUrl, partNumber) => {
     console.log(
        `Sending task to worker ${workerUrl} for requestId: ${task.taskId}`
      );
    try {
      const response = await axios.post(`${workerUrl}/internal/api/worker/hash/crack/task`, {
        requestId: task.taskId,
        hash: task.hash,
        maxLength: task.maxLength,
        partNumber,
        partCount: WORKER_URLS.length,
      });

      await TaskModel.updateOne(
        { taskId: task.taskId },
        {
          $set: {
            [`workerStatuses.${partNumber}`]: WorkerStatus.READY,
            [`workerResults.${partNumber}`]: response.data.results,
            [`workerProgress.${partNumber}`]: 100
          },
          $push: { result: { $each: response.data.results } }
        }
      );
   
      const updatedTask = await TaskModel.findOne({ taskId: task.taskId });
      
      if (updatedTask.workerProgress.every(p => p === 100)) {
        const status = updatedTask.workerStatuses.every(s => s === WorkerStatus.READY)
          ? TaskStatus.READY
          : TaskStatus.PARTIAL;
     
          await TaskModel.updateOne(
            { taskId: task.taskId },
            { $set: { status, result: [].concat(...updatedTask.workerResults), progress: 100 } }
          );
        }
      } catch (error) {
        await TaskModel.updateOne(
          { taskId: task.taskId },
          { $set: { [`workerStatuses.${partNumber}`]: WorkerStatus.ERROR } }
        );
      }
    });
  }

async function addRequest(hash, maxLength) {
  const requestId = uuidv4();
  
  const inQueueCount = await TaskModel.countDocuments({ 
    status: TaskStatus.IN_QUEUE 
  });
  
  if (inQueueCount >= MAX_ACTIVE_REQUESTS) {
    throw new Error("Достигнуто максимальное количество задач в очереди, подождите");
  }

  const task = new TaskModel({
    taskId: requestId,
    status: TaskStatus.IN_QUEUE,
    hash,
    maxLength,
    workerStatuses: Array(WORKER_URLS.length).fill(WorkerStatus.IN_PROGRESS),
    workerResults: [],
    workerProgress: Array(WORKER_URLS.length).fill(0),
    result: [],
    progress: 0
  });

  await task.save();
  processQueue();
  return requestId;
}

async function getRequestStatus(requestId) {
  return await TaskModel.findOne({ taskId: requestId });
}

let lastWorkersInfoStr = "";
let lastQueueInfoStr = "";

async function getWorkersInfo(requestId) {
  try {
    const task = await TaskModel.findOne(
      { taskId: requestId },
      {
        workerStatuses: 1,
        workerResults: 1,
        _id: 0
      }
    ).lean();

    if (!task) return null;

    const workersInfo = WORKER_URLS.map((workerUrl, index) => ({
      number: index + 1,
      status: task.workerStatuses?.[index] || WorkerStatus.IN_PROGRESS,
      data: task.workerResults?.[index] || []
    }));

    const workersInfoStr = JSON.stringify(workersInfo);
    
    if (workersInfoStr !== lastWorkersInfoStr) {
      lastWorkersInfoStr = workersInfoStr;
      return workersInfo;
    }

    return null;
  } catch (err) {
    console.error("Error fetching workers info:", err);
    return null;
  }
}

async function getQueueInfo() {
  try {
    const queueData = await TaskModel.find(
      {},
      {
        taskId: 1,
        status: 1,
        result: 1,
        progress: 1,
        _id: 0
      }
    )
    .sort({ createdAt: 1 })
    .lean();

    const queueInfo = queueData.map(task => ({
      requestId: task.taskId,
      status: task.status,
      result: task.result,
      progress: task.progress
    }));

    return queueInfo;
  } catch (err) {
    console.error("Error fetching queue info:", err);
    return null;
  }
}

async function updateWorkerProgress(requestId, partNumber, progress) {
  try {
    await TaskModel.updateOne(
      { taskId: requestId },
      { $set: { [`workerProgress.${partNumber}`]: progress } }
    );

    const task = await TaskModel.findOne({ taskId: requestId });
    const totalProgress = task.workerProgress.reduce((a, b) => a + b, 0) / WORKER_URLS.length;
    
    await TaskModel.updateOne(
      { taskId: requestId },
      { $set: { progress: totalProgress } }
    );
  } catch (err) {
    console.error("Update progress error:", err);
  }
}

module.exports = {
  addRequest,
  getRequestStatus,
  getWorkersInfo,
  getQueueInfo,
  updateWorkerProgress,
  restoreTasksFromDB,
};