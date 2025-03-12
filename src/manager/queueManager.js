const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const { TaskStatus, WorkerStatus } = require("../common/status");

const WORKER_URLS = [
  "http://worker1:3001",
  "http://worker2:3002",
  "http://worker3:3003",
];

const MAX_ACTIVE_REQUESTS = 5;

const tasks = [];
const requests = new Map();

function processQueue() {
  while (tasks.length > 0 && requests.size < MAX_ACTIVE_REQUESTS) {
    const task = tasks.shift();
    const requestId = task.requestId;

    if (task.status === TaskStatus.IN_QUEUE) {
      task.status = TaskStatus.IN_PROGRESS;
      task.completedWorkers = 0;
      task.results = [];
      task.workerStatuses = Array(WORKER_URLS.length).fill(
        WorkerStatus.IN_PROGRESS
      );
      task.workerResults = Array(WORKER_URLS.length).fill([]);

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
            console.log(`Response from worker ${workerUrl}:`, response.data);
            const task = requests.get(requestId);

            task.results.push(...response.data.words);
            task.completedWorkers++;
            task.workerStatuses[partNumber] = WorkerStatus.READY;
            task.workerResults[partNumber] =
              response.data.words || "No matches";

            if (task.results.length > 0) {
              // stopAllWorkers(requestId);
              task.status = TaskStatus.READY;
            } else if (task.completedWorkers === WORKER_URLS.length) {
              task.status = TaskStatus.ERROR;
            } else {
              task.results.push("No matches");
            }
          })
          .catch((error) => {
            console.error(`Error from worker ${workerUrl}:`, error.message);
            const task = requests.get(requestId);
            task.completedWorkers++;
            task.workerStatuses[partNumber] = WorkerStatus.ERROR;

            if (task.completedWorkers === WORKER_URLS.length) {
              task.status = TaskStatus.ERROR;
            }
          });
      });
    }
  }
}

function stopAllWorkers(requestId) {
  WORKER_URLS.forEach((workerUrl, index) => {
    axios
      .post(`${workerUrl}/internal/api/worker/hash/crack/stop`, { requestId })
      .then((response) => {
        console.log(
          `Worker ${workerUrl} stopped successfully for requestId: ${requestId}`
        );
        const task = requests.get(requestId);
        if (task) {
          task.workerStatuses[index] = WorkerStatus.STOPPED;
        }
      })
      .catch((error) => {
        console.error(`Error stopping worker ${workerUrl}:`, error.message);
        const task = requests.get(requestId);
        if (task) {
          task.workerStatuses[index] = WorkerStatus.ERROR;
        }
      });
  });
}

function addRequest(hash, maxLength) {
  const requestId = uuidv4();
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

function getWorkersInfo(requestId) {
  const task = requests.get(requestId);
  if (!task) return null;

  return WORKER_URLS.map((workerUrl, index) => {
    const workerStatus = task.workerStatuses[index] || WorkerStatus.IN_PROGRESS;
    const workerResult = task.workerResults[index] || [];

    return {
      number: index + 1,
      status: workerStatus,
      data: workerResult,
    };
  });
}

module.exports = {
  addRequest,
  getRequestStatus,
  getWorkersInfo,
  stopAllWorkers,
};
