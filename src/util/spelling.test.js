import { buildVocabulary, closestWord, correctSpelling, editDistance, tokenize } from './spelling';

describe('spelling', () => {
  describe('tokenize', () => {
    it('splits text into lowercase words', () => {
      expect(tokenize('Red Nike-Shoes, size 42!')).toEqual(['red', 'nike', 'shoes', 'size', '42']);
    });

    it('keeps non-English letters', () => {
      expect(tokenize('Größe Ä')).toEqual(['größe', 'ä']);
    });

    it('returns an empty array for non-strings', () => {
      expect(tokenize(null)).toEqual([]);
      expect(tokenize(undefined)).toEqual([]);
    });
  });

  describe('editDistance', () => {
    it('counts insertions, deletions and substitutions', () => {
      expect(editDistance('shoes', 'shoes')).toEqual(0);
      expect(editDistance('shoe', 'shoes')).toEqual(1);
      expect(editDistance('shoes', 'shoe')).toEqual(1);
      expect(editDistance('shoes', 'shoas')).toEqual(1);
      expect(editDistance('', 'abc')).toEqual(3);
    });

    it('counts a swap of two adjacent letters as one edit', () => {
      expect(editDistance('shose', 'shoes')).toEqual(1);
      expect(editDistance('sheor', 'shoes')).toEqual(2);
    });
  });

  describe('buildVocabulary', () => {
    it('counts words and skips too short ones', () => {
      const vocabulary = buildVocabulary(['Red shoes', 'Blue shoes', 'A hat']);
      expect(vocabulary.get('shoes')).toEqual(2);
      expect(vocabulary.get('red')).toEqual(1);
      expect(vocabulary.has('a')).toBe(false);
    });
  });

  describe('closestWord', () => {
    const vocabulary = buildVocabulary(['shoes', 'shoes', 'shoe', 'jacket', 'cat']);

    it('keeps words that are in the vocabulary', () => {
      expect(closestWord('shoe', vocabulary)).toEqual('shoe');
    });

    it('prefers the more common word on a tie', () => {
      expect(closestWord('sheor', vocabulary)).toEqual('shoes');
    });

    it('corrects typos', () => {
      expect(closestWord('jaket', vocabulary)).toEqual('jacket');
      expect(closestWord('jakcet', vocabulary)).toEqual('jacket');
    });

    it('allows only one edit for short words', () => {
      expect(closestWord('cta', vocabulary)).toEqual('cat');
      expect(closestWord('dog', vocabulary)).toEqual('dog');
    });

    it('does not correct words without a close match', () => {
      expect(closestWord('umbrella', vocabulary)).toEqual('umbrella');
    });
  });

  describe('correctSpelling', () => {
    const vocabulary = buildVocabulary(['Red shoes', 'Blue jacket', 'Adidas sneakers']);

    it('corrects each word', () => {
      expect(correctSpelling('Rde sheor', vocabulary)).toEqual('red shoes');
      expect(correctSpelling('addidas', vocabulary)).toEqual('adidas');
    });

    it('returns null when nothing was corrected', () => {
      expect(correctSpelling('red shoes', vocabulary)).toBeNull();
      expect(correctSpelling('umbrella', vocabulary)).toBeNull();
      expect(correctSpelling('', vocabulary)).toBeNull();
      expect(correctSpelling('sheor', new Map())).toBeNull();
    });
  });
});
