const crypto = require("crypto");
const ALPHABET = require("../common/alphabet");

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

function crackHash(hash, maxLength, partNumber, partCount) {
  const alphabetArray = ALPHABET.split("");
  let totalCombinations = 0;
  for (let length = 1; length <= maxLength; length++) {
    totalCombinations += Math.pow(alphabetArray.length, length);
  }
  const combinationsPerPart = Math.ceil(totalCombinations / partCount);
  const start = partNumber * combinationsPerPart;
  const end = Math.min(start + combinationsPerPart, totalCombinations);

  const results = [];

  console.log(
    `Part ${partNumber}: Processing combinations from ${start} to ${end}`
  );

  const combinations = generateCombinations(
    alphabetArray,
    maxLength,
    start,
    end
  );

  for (const word of combinations) {
    const wordHash = crypto.createHash("md5").update(word).digest("hex");
    if (wordHash === hash) {
      results.push(word);
    }
  }

  return results;
}

function calculateTotalCombinations(maxLength, alphabetLength) {
  let total = 0;
  for (let length = 1; length <= maxLength; length++) {
    total += Math.pow(alphabetLength, length);
  }
  return total;
}

function calculateProgress(currentIndex, totalCombinations) {
  return ((currentIndex / totalCombinations) * 100).toFixed(2);
}

module.exports = { crackHash, generateCombinations };
