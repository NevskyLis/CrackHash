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

function crackHash(hash, maxLength, partNumber, partCount, shouldStop) {
  const alphabetArray = ALPHABET.split("");
  let totalCombinations = 0;
  for (let length = 1; length <= maxLength; length++) {
    totalCombinations += Math.pow(alphabetArray.length, length);
  }
  const combinationsPerPart = Math.ceil(totalCombinations / partCount);
  const start = partNumber * combinationsPerPart;
  const end = Math.min(start + combinationsPerPart, totalCombinations);

  let result = null;

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
    if (shouldStop && shouldStop()) break;

    const wordHash = crypto.createHash("md5").update(word).digest("hex");
    if (wordHash === hash) {
      result = word;
      break;
    }
  }

  return result ? [result] : [];
}

module.exports = { crackHash, generateCombinations };
