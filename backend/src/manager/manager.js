const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const {
  addRequest,
  getRequestStatus,
  getWorkersInfo,
  getQueueInfo,
  updateWorkerProgress,
  restoreTasksFromDB,
} = require("./queueManager");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const SSE_UPDATE_INTERVAL = process.env.SSE_UPDATE_INTERVAL || 1000;

const mongoose = require("mongoose");
const Task = require("./models/Task");
const { TaskStatus, WorkerStatus } = require("../common/status");

const amqp = require("amqplib");
let rabbitChannel;

mongoose
  .connect("mongodb://mongodb:27017/crackhash", { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log("Connected to MongoDB");

    await connectWithRetry();
    console.log("Connected to RabbitMQ");

    await setupRabbitMQChannels();
    console.log("RabbitMQ channels set up");

    await restoreTasksFromDB();
    console.log("Tasks restored from DB");

    app.listen(PORT, () => console.log(`Manager listening on ${PORT}`));
  })
  .catch((err) => {
    console.error("Startup error:", err);
    process.exit(1);
  });

const connectWithRetry = async () => {
  const RABBITMQ_URL = "amqp://rabbitmq";
  const MAX_RETRIES = 10;
  const RETRY_DELAY = 5000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `Attempting to connect to RabbitMQ (attempt ${attempt}/${MAX_RETRIES})...`
      );

      const connection = await Promise.race([
        amqp.connect(RABBITMQ_URL),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Connection timeout")), 10000)
        ),
      ]);

      rabbitChannel = await connection.createChannel();
      await setupRabbitMQChannels();
      console.log("Successfully connected to RabbitMQ");
      return;
    } catch (error) {
      console.error(
        `RabbitMQ connection failed (attempt ${attempt}):`,
        error.message
      );

      if (attempt === MAX_RETRIES) {
        console.error("Failed to connect to RabbitMQ after maximum retries");
        process.exit(1);
      }

      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }
};

const setupRabbitMQChannels = async () => {
  console.log("→ setupRabbitMQChannels(): asserting exchanges & queues");
  try {
    await rabbitChannel.assertExchange("tasks_exchange", "direct", {
      durable: true,
    });
    await rabbitChannel.assertQueue("tasks_queue", { durable: true });
    await rabbitChannel.bindQueue("tasks_queue", "tasks_exchange", "task");

    await rabbitChannel.assertExchange("results_exchange", "direct", {
      durable: true,
    });
    await rabbitChannel.assertQueue("results_queue", { durable: true });
    await rabbitChannel.bindQueue(
      "results_queue",
      "results_exchange",
      "result"
    );

    rabbitChannel.consume(
      "results_queue",
      async (msg) => {
        console.log("→ [Consumer] получили сообщение из results_queue");
        if (msg !== null) {
          try {
            const { requestId, partNumber, results, progress } = JSON.parse(
              msg.content.toString()
            );

            const task = await Task.findOne({ taskId: requestId });
            if (!task) {
              console.warn(`Task ${requestId} not found in DB`);
              return rabbitChannel.ack(msg);
            }

            if (progress !== undefined) {
              task.workerProgress[partNumber] = progress;
              task.workerStatuses[partNumber] =
                progress === 100
                  ? WorkerStatus.READY
                  : WorkerStatus.IN_PROGRESS;
            }

            if (results) {
              task.workerResults[partNumber] = results;
            }

            if (progress !== undefined) {
              updateWorkerProgress(requestId, partNumber, progress);
            }

            if (task.workerProgress.every((p) => p === 100)) {
              task.status = task.workerResults.some((r) => r.length > 0)
                ? TaskStatus.READY
                : TaskStatus.NOT_FOUND;
              task.result = [].concat(...task.workerResults);
            }

            await task.save();
            rabbitChannel.ack(msg);
          } catch (err) {
            console.error("Error processing result message:", err);
            rabbitChannel.nack(msg);
          }
        }
      },
      { noAck: false }
    );
  } catch (err) {
    console.error("Error setting up RabbitMQ channels:", err);
    throw err;
  }
};

connectWithRetry()
  .then(async () => {
    console.log("RabbitMQ initialization complete");
    await setupRabbitMQChannels();
  })
  .catch(/* … */);


app.post("/api/hash/crack", async (req, res) => {
  const { hash, maxLength } = req.body;

  try {
    const requestId = addRequest(hash, maxLength);
    const task = new Task({
      taskId: requestId,
      hash,
      maxLength,
      status: TaskStatus.IN_QUEUE,
      workerStatuses: Array(process.env.WORKER_COUNT || 3).fill("IN_PROGRESS"),
      workerResults: [],
      result: [],
    });

    await task.save();
    res.json({ requestId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/hash/status", async (req, res) => {
  const { requestId } = req.query;

  try {
    const task = await Task.findOne({ taskId: requestId });
    if (!task) {
      return res.status(404).json({ error: "Request not found" });
    }

    res.json({
      requestId: task.taskId,
      status: task.status,
      result: task.result,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
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
    try {
      const workersInfo = getWorkersInfo(requestId);
      if (workersInfo) {
        res.write(`data: ${JSON.stringify(workersInfo)}\n\n`);
      }
    } catch (err) {
      console.error("SSE error:", err);
    }
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
