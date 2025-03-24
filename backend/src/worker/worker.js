const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { crackHash } = require("./hashCracker");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const MANAGER_URL = process.env.MANAGER_URL || "http://manager:3000";
const PORT = process.env.PORT;

app.post("/internal/api/worker/hash/crack/task", async (req, res) => {
  const { requestId, hash, maxLength, partNumber, partCount } = req.body;

  if (
    !hash ||
    !maxLength ||
    partNumber === undefined ||
    partCount === undefined
  ) {
    return res.status(400).json({ error: "Invalid task data" });
  }

  const result = await crackHash(
    hash,
    maxLength,
    partNumber,
    partCount,
    async (progressUpdate) => {
      await axios.post(`${MANAGER_URL}/internal/api/manager/update-progress`, {
        requestId,
        partNumber,
        progress: progressUpdate.progress,
      });
    }
  );

  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Worker running on port ${PORT}`);
});
