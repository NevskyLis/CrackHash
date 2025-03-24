const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();
const {
  addRequest,
  getRequestStatus,
  getWorkersInfo,
  getQueueInfo,
  updateWorkerProgress,
} = require("./queueManager");

const app = express();
app.use(bodyParser.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const SSE_UPDATE_INTERVAL = process.env.SSE_UPDATE_INTERVAL || 1000;

app.post("/api/hash/crack", (req, res) => {
  const { hash, maxLength } = req.body;
  const requestId = addRequest(hash, maxLength);
  res.json({ requestId });
});

app.get("/api/hash/status", (req, res) => {
  const { requestId } = req.query;
  const request = getRequestStatus(requestId);
  
  if (!request) {
    return res.status(404).json({ error: "Request not found" });
  }

  res.json(request);
});

app.get("/api/workers/info/sse", (req, res) => {
  const { requestId } = req.query;

  if (!requestId) {
    return res.status(400).json({ error: "requestId is required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const interval = setInterval(() => {
    const workersInfo = getWorkersInfo(requestId);
    if (!workersInfo) {
      return;
    }
    res.write(`data: ${JSON.stringify(workersInfo)}\n\n`);
  }, SSE_UPDATE_INTERVAL);

  req.on("close", () => {
    clearInterval(interval);
    res.end();
  });
});

app.get("/api/queue/info/sse", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const interval = setInterval(() => {
    const queueInfo = getQueueInfo();
    if (!queueInfo) {
      return;
    }
    res.write(`data: ${JSON.stringify(queueInfo)}\n\n`);
  }, SSE_UPDATE_INTERVAL);

  req.on("close", () => {
    clearInterval(interval);
    res.end();
  });
});

app.post("/internal/api/manager/update-progress", (req, res) => {
  const { requestId, partNumber, progress } = req.body;

  try {
    updateWorkerProgress(requestId, partNumber, progress);
    res.json({ message: "Progress updated" });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Manager running on port ${PORT}`);
});
