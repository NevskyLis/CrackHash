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
  const hasInProgressTasks = tasks.some(
    (task) => task.status === TaskStatus.IN_PROGRESS
  );

  if (hasInProgressTasks) {
    console.log("There are tasks in progress");
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
          const task = requests.get(requestId);

          task.results.push(...response.data.words);
          task.completedWorkers++;
          task.workerStatuses[partNumber] = WorkerStatus.READY;
          task.workerResults[partNumber] = response.data.words;

          task.progress = (
            (task.completedWorkers / WORKER_URLS.length) *
            100
          ).toFixed(2);

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
    progress: 0
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

let lastWorkersInfo = {};
let lastQueueInfo = [];

function getWorkersInfo(requestId) {
  const task = requests.get(requestId);
  if (!task) return null;

  const workersInfo = WORKER_URLS.map((workerUrl, index) => {
    const workerStatus = task.workerStatuses[index] || WorkerStatus.IN_PROGRESS;
    const workerResult = task.workerResults[index] || [];

    return {
      number: index + 1,
      status: workerStatus,
      data: workerResult,
    };
  });

  const hasChanged =
    !lastWorkersInfo[requestId] ||
    !arraysEqual(lastWorkersInfo[requestId], workersInfo);

  if (hasChanged) {
    lastWorkersInfo[requestId] = workersInfo;
    return workersInfo;
  }

  return null;
}

function getQueueInfo() {
  const queueInfo = tasks.map((task) => ({
    requestId: task.requestId,
    status: task.status,
    result: task.results,
  }));

  const hasChanged = !arraysEqual(lastQueueInfo, queueInfo);

  if (hasChanged) {
    lastQueueInfo = queueInfo;
    return queueInfo;
  }

  return null;
}

function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return false;
  }

  return true;
}

module.exports = {
  addRequest,
  getRequestStatus,
  getWorkersInfo,
  getQueueInfo,
};
