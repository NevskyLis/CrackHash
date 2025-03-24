const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const { TaskStatus, WorkerStatus } = require("../common/status");
require("dotenv").config();

const WORKER_URLS = [
  process.env.WORKER_1,
  process.env.WORKER_2,
  process.env.WORKER_3,
];
const MAX_ACTIVE_REQUESTS = parseInt(process.env.MAX_ACTIVE_REQUESTS, 10) || 5;

const tasks = [];
const requests = new Map();

function processQueue() {
  const hasInProgressTasks = tasks.some(
    (task) => task.status === TaskStatus.IN_PROGRESS
  );

  if (hasInProgressTasks) {
    return;
  }

  const taskIndex = tasks.findIndex(
    (task) => task.status === TaskStatus.IN_QUEUE
  );

  if (taskIndex !== -1) {
    const task = tasks[taskIndex];
    const requestId = task.requestId;
    task.status = TaskStatus.IN_PROGRESS;

    WORKER_URLS.forEach((workerUrl, partNumber) => {
      console.log(
        `Sending task to worker ${workerUrl} for requestId: ${requestId}`
      );
      axios
        .post(`${workerUrl}/internal/api/worker/hash/crack/task`, {
          requestId,
          hash: task.hash,
          maxLength: task.maxLength,
          partNumber,
          partCount: WORKER_URLS.length,
        })
        .then((response) => {
          task.workerStatuses[partNumber] = WorkerStatus.READY;
          task.workerResults[partNumber] = response.data.results; 
          task.workerProgress[partNumber] = 100;
          task.completedWorkers++;
          task.results.push(...response.data.results); 

          if (task.completedWorkers === WORKER_URLS.length) {
            task.workerStatuses.every((status) => status === TaskStatus.READY)
              ? (task.status = TaskStatus.READY)
              : TaskStatus.PARTIAL;
            processQueue();
          }
        })
        .catch((error) => {
          console.error(`Error from worker ${workerUrl}:`, error.message);
          const task = requests.get(requestId);
          task.completedWorkers++;
          task.workerStatuses[partNumber] = WorkerStatus.ERROR;
        });
    });
  }
}

function addRequest(hash, maxLength) {
  const requestId = uuidv4();
  const inQueueCount = tasks.filter(
    (task) => task.status === TaskStatus.IN_QUEUE
  ).length;
  if (inQueueCount >= MAX_ACTIVE_REQUESTS) {
    throw new Error(
      "Достигнуто максимальное количество задач в очереди, подождите"
    );
  }
  const task = {
    requestId,
    status: TaskStatus.IN_QUEUE,
    hash,
    maxLength,
    data: null,
    completedWorkers: 0,
    results: [],
    workerStatuses: Array(WORKER_URLS.length).fill(WorkerStatus.IN_PROGRESS),
    workerResults: Array(WORKER_URLS.length).fill([]),
    workerProgress: Array(WORKER_URLS.length).fill(0),
    progress: 0,
  };
  requests.set(requestId, task);
  tasks.push(task);
  processQueue();
  return requestId;
}

function getRequestStatus(requestId) {
  const task = requests.get(requestId);
  if (!task) return null;
  return {
    ...task,
  };
}

let lastWorkersInfoStr = "";
let lastQueueInfoStr = "";

function getWorkersInfo(requestId) {
  const task = requests.get(requestId);
  if (!task) return null;

  const workersInfo = WORKER_URLS.map((workerUrl, index) => ({
    number: index + 1,
    status: task.workerStatuses[index] || WorkerStatus.IN_PROGRESS,
    data: task.workerResults[index] || [],
  }));

  const workersInfoStr = JSON.stringify(workersInfo);
  if (workersInfoStr !== lastWorkersInfoStr) {
    lastWorkersInfoStr = workersInfoStr;
    return workersInfo;
  }

  return null;
}

function getQueueInfo() {
  const queueInfo = tasks.map((task) => ({
    requestId: task.requestId,
    status: task.status,
    result: task.results,
    progress: task.progress,
  }));

  const queueInfoStr = JSON.stringify(queueInfo);
  if (queueInfoStr !== lastQueueInfoStr) {
    lastQueueInfoStr = queueInfoStr;
    return queueInfo;
  }

  return null;
}

function updateWorkerProgress(requestId, partNumber, progress) {
  const task = requests.get(requestId);
  if (!task) {
    throw new Error("Task not found");
  }
  task.workerProgress[partNumber] = progress;
  task.progress =
    task.workerProgress.reduce((sum, p) => sum + p, 0) /
    task.workerProgress.length;
}

module.exports = {
  addRequest,
  getRequestStatus,
  getWorkersInfo,
  getQueueInfo,
  updateWorkerProgress, 
};
