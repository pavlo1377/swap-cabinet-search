/**
 * Keyboard layout helpers for the keyword search ("ырщуы" => "shoes").
 *
 * When the keyboard is in another layout (e.g. Ukrainian instead of English), the typed letters
 * are wrong, but the pressed keys are right. Browsers tell both on every key press:
 *   event.key  - the typed character, e.g. "ы"
 *   event.code - the physical key, e.g. "KeyS". It is the same in every layout.
 * So while the user types, we learn which character each key gives in their layout, and can turn
 * a typed word back into the QWERTY letters of the same keys. Works for any layout, no tables.
 *
 * Note: mobile keyboards often don't report event.code, and pasted text has no key presses.
 * Then nothing is learned and words are not converted.
 */

// Typed character => QWERTY letter of the same key, e.g. 'ы' => 's'. Learned while the user types.
const learnedKeys = new Map();

/**
 * Remember which QWERTY letter the pressed key has. Call it on keydown in a search input.
 *
 * @param {KeyboardEvent} event
 */
export const rememberKeystroke = event => {
  const { key, code } = event || {};
  const isLetterKey = typeof code === 'string' && /^Key[A-Z]$/.test(code);
  const isCharacter = typeof key === 'string' && key.length === 1;
  if (!isLetterKey || !isCharacter) {
    return;
  }

  const qwertyLetter = code.slice(3).toLowerCase(); // 'KeyS' => 's'
  const typed = key.toLowerCase();
  if (typed !== qwertyLetter) {
    learnedKeys.set(typed, qwertyLetter);
  }
};

/**
 * Turn a word typed in another layout into the QWERTY letters of the same keys.
 * Characters that were not learned stay as they are.
 *
 * @param {string} word lowercase word, e.g. 'ырщуы'
 * @returns {string} e.g. 'shoes'
 */
export const toQwerty = word =>
  Array.from(word)
    .map(char => learnedKeys.get(char) || char)
    .join('');

/**
 * Forget the learned keys. Used by tests.
 */
export const forgetKeystrokes = () => learnedKeys.clear();
