const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { crackHash } = require("./hashCracker");
const amqp = require("amqplib");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const MANAGER_URL = process.env.MANAGER_URL || "http://manager:3000";
const PORT = process.env.PORT || 4000;
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq";
const RETRY_DELAY = 5000; 

let rabbitChannel;

const connectToRabbitMQ = async () => {
  const MAX_RETRIES = 10;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Connecting to RabbitMQ (attempt ${attempt}/${MAX_RETRIES})...`);
      
      const connection = await amqp.connect(RABBITMQ_URL);
      rabbitChannel = await connection.createChannel();
      
      await rabbitChannel.assertExchange('results_exchange', 'direct', { durable: true });
      
      console.log(' Connected to RabbitMQ');
      return;
    } catch (error) {
      console.error(`RabbitMQ connection failed (attempt ${attempt}):`, error.message);
      
      if (attempt === MAX_RETRIES) {
        throw new Error('Failed to connect to RabbitMQ after maximum retries');
      }
      
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
};

const sendResultViaRabbitMQ = async (message) => {
  try {
    if (!rabbitChannel) {
      await connectToRabbitMQ();
    }
    
    await rabbitChannel.publish(
      'results_exchange',
      'result',
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
    
    console.log('Result sent to RabbitMQ');
  } catch (error) {
    console.error('Failed to send result via RabbitMQ:', error);
    throw error;
  }
};


app.post("/internal/api/worker/hash/crack/task", async (req, res) => {
  const { requestId, hash, maxLength, partNumber, partCount } = req.body;

  if (!hash || !maxLength || partNumber === undefined || partCount === undefined) {
    return res.status(400).json({ error: "Invalid task data" });
  }

  const sendProgressUpdate = async (progressUpdate) => {
    try {
      await axios.post(`${MANAGER_URL}/internal/api/manager/update-progress`, {
        requestId,
        partNumber,
        progress: progressUpdate.progress,
      });
    } catch (error) {
      console.error('Failed to send progress to manager, trying RabbitMQ...');
      try {
        await sendResultViaRabbitMQ({
          requestId,
          partNumber,
          progress: progressUpdate.progress,
          results: []
        });
      } catch (mqError) {
        console.error('Failed to send progress via RabbitMQ:', mqError);
      }
    }
  };

  try {
    const result = await crackHash(
      hash,
      maxLength,
      partNumber,
      partCount,
      sendProgressUpdate 
    );
    
    const resultMessage = {
      requestId,
      partNumber,
      results: result.results,
      progress: 100
    };

    try {
      await axios.post(`${MANAGER_URL}/internal/api/manager/update-progress`, resultMessage);
    } catch (error) {
      await sendResultViaRabbitMQ(resultMessage);
    }

    return res.json(result);
  } catch (error) {
    console.error('Task processing failed:', error);
    return res.status(500).json({ error: 'Task processing failed' });
  }
});
  
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    worker: `worker-${PORT}`,
    timestamp: new Date().toISOString()
  });
});

const startServer = async () => {
  try {
    await connectToRabbitMQ();
    
    app.listen(PORT, () => {
      console.log(`Worker running on port ${PORT}`);
      console.log(`Healthcheck available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start worker:', error);
    process.exit(1);
  }
};

startServer();


;(async () => {
  console.log("→ TEST: начинаем ручную проверку отправки в менеджер/очередь");
  try {
    await axios.post("http://localhost:3000/internal/api/manager/update-progress", {
      requestId: "TEST123",
      partNumber: 0,
      progress: 42,
      results: ["foo","bar"]
    }, { timeout: 2000 });
    console.log("→ TEST: менеджер ответил успешно (не использовали RabbitMQ)");
  } catch (err) {
    console.log("→ TEST: не удалось достучаться до менеджера, ловим ошибку:", err.message);
    console.log("→ TEST: вызываем sendResultViaRabbitMQ…");
    await sendResultViaRabbitMQ({
      requestId: "TEST123",
      partNumber: 0,
      progress: 42,
      results: ["foo","bar"]
    });
    console.log("→ TEST: сообщение отправлено в RabbitMQ");
  }
});