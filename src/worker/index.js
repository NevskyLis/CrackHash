const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(bodyParser.json());
app.use(cors());

/**
 * @param {string[]} alphabet - Массив символов алфавита.
 * @param {number} maxLength - Максимальная длина слова.
 * @param {number} startIndex - Начальный индекс комбинации.
 * @param {number} endIndex - Конечный индекс комбинации.
 * @returns {Generator<string>} - Генератор комбинаций.
 */

function* generateCombinations(alphabet, maxLength, startIndex, endIndex) {
  let currentIndex = 0;

  function* generate(currentWord, depth) {
    if (depth === maxLength) {
      if (currentIndex >= startIndex && currentIndex < endIndex) {
        yield currentWord;
      }
      currentIndex++;
      return;
    }

    for (const char of alphabet) {
      if (currentIndex >= endIndex) break;
      yield* generate(currentWord + char, depth + 1);
    }
  }

  yield* generate("", 0);
}

app.post("/internal/api/worker/hash/crack/task", (req, res) => {
  const { requestId, hash, maxLength, alphabet, partNumber, partCount } =
    req.body;

  const alphabetArray = alphabet.split("");
  console.log("ALPHABET", alphabetArray);

  const totalCombinations = Math.pow(alphabetArray.length, maxLength);
  const combinationsPerPart = Math.ceil(totalCombinations / partCount);
  const start = partNumber * combinationsPerPart;
  const end = Math.min(start + combinationsPerPart, totalCombinations);

  let result = null;

  const combinations = generateCombinations(
    alphabetArray,
    maxLength,
    start,
    end
  );

  for (const word of combinations) {
    const wordHash = crypto.createHash("md5").update(word).digest("hex");
    if (wordHash === hash) {
      result = word;
      break;
    }
  }

  res.json({ requestId, words: result ? [result] : [] });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Worker running on port ${port}`);
});
