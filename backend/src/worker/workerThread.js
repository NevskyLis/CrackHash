const { parentPort, workerData } = require("worker_threads");
const crypto = require("crypto");
const ALPHABET = require("../common/alphabet");
require("dotenv").config();

const PROGRESS_PERIOD_COMBINATIONS =
  process.env.PROGRESS_PERIOD_COMBINATIONS || 100000;

function* generateCombinations(alphabet, maxLength, startIndex, endIndex) {
  let currentIndex = 0;

  function* generate(currentWord, depth) {
    if (depth > maxLength) return;
    if (currentWord.length > 0) {
      if (currentIndex >= startIndex && currentIndex < endIndex) {
        yield currentWord;
      }
      currentIndex++;
    }
    if (currentIndex >= endIndex) return;
    for (const char of alphabet) {
      yield* generate(currentWord + char, depth + 1);
    }
  }

  yield* generate("", 0);
}

let totalCombinations = 0;
let checked = 0;

const { hash, maxLength, partNumber, partCount } = workerData;
const results = [];
const alphabetArray = ALPHABET.split("");

for (let length = 1; length <= maxLength; length++) {
  totalCombinations += Math.pow(alphabetArray.length, length);
}

const combinationsPerPart = Math.ceil(totalCombinations / partCount);
const start = partNumber * combinationsPerPart;
const end = Math.min(start + combinationsPerPart, totalCombinations);

console.log(
  `Part ${partNumber}: Processing combinations from ${start} to ${end} hash ${hash}`
);

const combinations = generateCombinations(alphabetArray, maxLength, start, end);

for (const word of combinations) {
  const wordHash = crypto.createHash("md5").update(word).digest("hex");
  if (wordHash === hash) {
    results.push(word);
  }
  checked++;
  if (checked % PROGRESS_PERIOD_COMBINATIONS === 0) {
    parentPort.postMessage({
      progress: (checked / combinationsPerPart) * 100,
      results,
    });
  }
}

parentPort.postMessage({ progress: 100, results });