/**
 * Spelling correction helpers for the keyword search ("sheor" => "shoes").
 *
 * Typed words are compared against a vocabulary of words that exist in the marketplace
 * (listing titles, category names, listing field options). A word that is not in the
 * vocabulary is replaced with the closest vocabulary word, if one is close enough.
 */

import { toQwerty } from './keyboardLayout';

// Words shorter than this are not added to the vocabulary nor corrected
const MIN_WORD_LENGTH = 3;

/**
 * Split text into lowercase words. Letters and digits from any language are kept.
 *
 * @param {string} text
 * @returns {Array<string>} words
 */
export const tokenize = text =>
  typeof text === 'string' ? text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [] : [];

/**
 * Edit distance between two words: the number of single letter insertions, deletions,
 * substitutions and swaps of two adjacent letters needed to turn one word into the other.
 * (Optimal string alignment distance. Swapped letters are a common typo, so they count as one edit.)
 *
 * @param {string} a
 * @param {string} b
 * @returns {number} edit distance
 */
export const editDistance = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) {
    d[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
};

// Short words allow fewer edits, so that e.g. "cat" doesn't turn into "hat"
const maxEditsFor = word => (word.length < MIN_WORD_LENGTH ? 0 : word.length <= 4 ? 1 : 2);

/**
 * Build a vocabulary from the given texts.
 *
 * @param {Array<string>} texts e.g. listing titles and category names
 * @returns {Map<string, number>} word => number of occurrences
 */
export const buildVocabulary = texts =>
  texts.reduce((vocabulary, text) => {
    tokenize(text)
      .filter(word => word.length >= MIN_WORD_LENGTH)
      .forEach(word => vocabulary.set(word, (vocabulary.get(word) || 0) + 1));
    return vocabulary;
  }, new Map());

// The vocabulary word with the fewest edits from the given word, or null if none is close enough.
// Ties are resolved in favor of the more common word.
const findClosestWord = (word, vocabulary) => {
  const maxEdits = maxEditsFor(word);
  let best = null;
  vocabulary.forEach((count, candidate) => {
    // Words with a too different length can't be close enough
    if (Math.abs(candidate.length - word.length) > maxEdits) {
      return;
    }
    const distance = editDistance(word, candidate);
    const isBetter =
      !best || distance < best.distance || (distance === best.distance && count > best.count);
    if (distance <= maxEdits && isBetter) {
      best = { word: candidate, distance, count };
    }
  });
  return best ? best.word : null;
};

/**
 * Find the closest vocabulary word for the given word:
 * 1. a word that is in the vocabulary is kept as it is
 * 2. a word typed in another keyboard layout is turned into QWERTY ("ырщуы" => "shoes")
 * 3. a typo is corrected ("sheor" => "shoes"), also after the layout change ("ырщуыы" => "shoes")
 *
 * @param {string} word lowercase word
 * @param {Map<string, number>} vocabulary
 * @returns {string} the closest vocabulary word, or the word itself if nothing is close enough
 */
export const closestWord = (word, vocabulary) => {
  if (maxEditsFor(word) === 0 || vocabulary.has(word)) {
    return word;
  }

  // The same keys in QWERTY, learned from the user's key presses (see keyboardLayout.js)
  const qwertyWord = toQwerty(word);
  if (vocabulary.has(qwertyWord)) {
    return qwertyWord;
  }

  return findClosestWord(word, vocabulary) || findClosestWord(qwertyWord, vocabulary) || word;
};

/**
 * Correct the spelling of the given search text word by word.
 *
 * @param {string} text search text typed by the user
 * @param {Map<string, number>} vocabulary
 * @returns {string|null} corrected text, or null if nothing was corrected
 */
export const correctSpelling = (text, vocabulary) => {
  const words = tokenize(text);
  if (words.length === 0 || !vocabulary || vocabulary.size === 0) {
    return null;
  }
  const correctedWords = words.map(word => closestWord(word, vocabulary));
  const isCorrected = correctedWords.some((word, i) => word !== words[i]);
  return isCorrected ? correctedWords.join(' ') : null;
};
