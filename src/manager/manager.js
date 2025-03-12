const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const {
  addRequest,
  getRequestStatus,
  getWorkersInfo,
} = require("./queueManager");

const app = express();
app.use(bodyParser.json());
app.use(cors());

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

app.get("/api/workers/info", (req, res) => {
  const { requestId } = req.query;

  if (!requestId) {
    return res.status(400).json({ error: "requestId is required" });
  }

  const workersInfo = getWorkersInfo(requestId);

  if (!workersInfo) {
    return res.status(404).json({ error: "Request not found" });
  }

  res.json(workersInfo);
});

app.listen(3000, () => {
  console.log("Manager running on port 3000");
});
