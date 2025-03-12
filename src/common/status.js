const TaskStatus = {
  IN_QUEUE: "IN_QUEUE",
  IN_PROGRESS: "IN_PROGRESS",
  READY: "READY",
  ERROR: "ERROR",
  PARTIAL: "PARTIAL",
};

const WorkerStatus = {
  IN_PROGRESS: "IN_PROGRESS",
  READY: "READY",
  STOPPED: "STOPPED",
  ERROR: "ERROR",
};

module.exports = { TaskStatus, WorkerStatus };
