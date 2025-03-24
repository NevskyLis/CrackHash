const { Worker } = require("worker_threads");
const path = require("path");

function crackHash(hash, maxLength, partNumber, partCount, onProgress) {
  return new Promise((resolve) => {
    const worker = new Worker(path.resolve(__dirname, "workerThread.js"), {
      workerData: { hash, maxLength, partNumber, partCount },
    });

    let finalResult = { progress: 0, results: [] };

    worker.on("message", (message) => {
      finalResult = message; 
      if (onProgress) {
        onProgress(message);
      }
      if (message.progress === 100) {
        resolve(finalResult);
      }
    });

    worker.on("error", (err) => {
      console.error("Worker error:", err);
      resolve({ progress: 0, results: [] });
    });

    worker.on("exit", (code) => {
      if (code !== 0) console.error(`Worker stopped with exit code ${code}`);
    });
  });
}

module.exports = { crackHash };
