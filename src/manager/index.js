const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());
app.use(cors());

const requests = new Map();
const queue = [];
const WORKER_URLS = [
  "http://worker1:3001",
  "http://worker2:3002",
  "http://worker3:3003",
];
const MAX_ACTIVE_REQUESTS = 5;

function processQueue() {
  while (queue.length > 0 && requests.size < MAX_ACTIVE_REQUESTS) {
    const requestId = queue.shift();
    const request = requests.get(requestId);

    if (request && request.status === "IN_QUEUE") {
      request.status = "IN_PROGRESS";
      request.results = [];
      request.completedWorkers = 0;
      request.totalWorkers = WORKER_URLS.length;

      const partCount = WORKER_URLS.length;
      WORKER_URLS.forEach((workerUrl, partNumber) => {
        axios
          .post(`${workerUrl}/internal/api/worker/hash/crack/task`, {
            requestId,
            hash: request.hash,
            maxLength: request.maxLength,
            alphabet: "abcdefghijklmnopqrstuvwxyz0123456789",
            partNumber,
            partCount,
          })
          .then((response) => {
            const request = requests.get(requestId);
            request.results.push(...response.data.words);
            request.completedWorkers++;

            if (response.data.words.length > 0) {
              request.status = "READY";
              request.data = request.results;
            }

            if (request.completedWorkers === request.totalWorkers) {
              if (request.status !== "READY") {
                request.status =
                  request.results.length > 0 ? "PARTIAL" : "ERROR";
              }
            }
          })
          .catch((error) => {
            const request = requests.get(requestId);
            request.completedWorkers++;

            if (request.completedWorkers === request.totalWorkers) {
              if (request.results.length > 0) {
                request.status = "PARTIAL";
              } else {
                request.status = "ERROR";
              }
            }
          });
      });
    }
  }
}

// POST /api/hash/crack
app.post("/api/hash/crack", (req, res) => {
  const { hash, maxLength } = req.body;
  const requestId = uuidv4();

  requests.set(requestId, {
    status: "IN_QUEUE",
    hash,
    maxLength,
    data: null,
    results: [],
    completedWorkers: 0,
    totalWorkers: WORKER_URLS.length,
  });

  queue.push(requestId);

  processQueue();

  res.json({ requestId });
});

// GET /api/hash/status
app.get("/api/hash/status", (req, res) => {
  const { requestId } = req.query;
  const request = requests.get(requestId);
  if (!request) {
    return res.status(404).json({ error: "Request not found" });
  }
  res.json(request);
});

app.listen(3000, () => {
  console.log("Manager running on port 3000");
});
