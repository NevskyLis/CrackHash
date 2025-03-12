const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const { crackHash } = require("./hashCracker");

const app = express();
app.use(bodyParser.json());
app.use(cors());

const port = process.env.PORT || 3001;

let stopFlag = false;

app.post("/internal/api/worker/hash/crack/stop", (req, res) => {
  const { requestId } = req.body;
  stopFlag = true;
  console.log(`Stop request received for requestId: ${requestId}`);
  res.json({ status: "STOPPED", requestId });
});

app.post("/internal/api/worker/hash/crack/task", (req, res) => {
  const { requestId, hash, maxLength, partNumber, partCount } = req.body;

  console.log("Received task:", {
    requestId,
    hash,
    maxLength,
    partNumber,
    partCount,
  });

  if (
    !hash ||
    !maxLength ||
    partNumber === undefined ||
    partCount === undefined
  ) {
    return res.status(400).json({ error: "Invalid task data" });
  }

  const result = crackHash(
    hash,
    maxLength,
    partNumber,
    partCount,
    () => stopFlag
  );

  console.log("Task result:", result);

  stopFlag = false;

  res.json({ requestId, words: result });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

app.listen(port, () => {
  console.log(`Worker running on port ${port}`);
});
