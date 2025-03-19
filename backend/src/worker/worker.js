const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const { crackHash } = require("./hashCracker");

const app = express();
app.use(bodyParser.json());
app.use(cors());

const port = process.env.PORT || 3001;

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

  const results = crackHash(hash, maxLength, partNumber, partCount);

  console.log("Task result:", results);

  res.json({ requestId, words: results });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

app.listen(port, () => {
  console.log(`Worker running on port ${port}`);
});
