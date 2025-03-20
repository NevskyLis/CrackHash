const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { crackHash } = require("./hashCracker");

const app = express();
app.use(bodyParser.json());
app.use(cors());

const PORT = process.env.PORT || 3001;

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

app.listen(PORT, () => {
  console.log(`Worker running on port ${PORT}`);
});
