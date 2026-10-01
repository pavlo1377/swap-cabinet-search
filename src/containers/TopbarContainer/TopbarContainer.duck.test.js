const listing = (id, title, publicData = {}) => ({
  id: { uuid: id },
  attributes: { title, publicData },
});

const listings = [
  listing('1', 'Red running shoes', { brand: 'Adidas' }),
  listing('2', 'Blue denim jacket'),
];

const config = {
  categoryConfiguration: { categories: [{ id: 'kids', name: 'Kids', subcategories: [] }] },
  listing: {
    listingFields: [{ key: 'color', enumOptions: [{ option: 'black', label: 'Black' }] }],
  },
};

// Fake SDK: keyword search matches listings whose title or public data contains every word
const createSdk = () => ({
  listings: {
    query: jest.fn(({ keywords, perPage }) => {
      const words = (keywords || '')
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w);
      const matches = listings.filter(l => {
        const text = [l.attributes.title, ...Object.values(l.attributes.publicData)]
          .join(' ')
          .toLowerCase();
        return words.every(w => text.includes(w));
      });
      return Promise.resolve({ data: { data: matches.slice(0, perPage) } });
    }),
  },
});

// The vocabulary is cached in the duck module, so each test gets a fresh module
const loadDuck = () => {
  let duck;
  jest.isolateModules(() => {
    duck = require('./TopbarContainer.duck');
  });
  return duck;
};

describe('TopbarContainer.duck', () => {
  describe('fetchKeywordSuggestions', () => {
    it('returns matching titles without correction', () => {
      const { fetchKeywordSuggestions } = loadDuck();
      const sdk = createSdk();
      return fetchKeywordSuggestions('shoes', config)(null, null, sdk).then(result => {
        expect(result).toEqual({
          suggestions: [{ id: '1', title: 'Red running shoes' }],
          correctedKeywords: null,
        });
        // No vocabulary fetch when the typed text matches
        expect(sdk.listings.query).toHaveBeenCalledTimes(1);
      });
    });

    it('corrects typos when nothing matches', () => {
      const { fetchKeywordSuggestions } = loadDuck();
      return fetchKeywordSuggestions('sheos', config)(null, null, createSdk()).then(result => {
        expect(result).toEqual({
          suggestions: [{ id: '1', title: 'Red running shoes' }],
          correctedKeywords: 'shoes',
        });
      });
    });

    it('uses public data texts in the vocabulary', () => {
      const { fetchKeywordSuggestions } = loadDuck();
      return fetchKeywordSuggestions('addidas', config)(null, null, createSdk()).then(result => {
        expect(result.correctedKeywords).toEqual('adidas');
        expect(result.suggestions).toEqual([{ id: '1', title: 'Red running shoes' }]);
      });
    });

    it('returns no suggestions when there is nothing close', () => {
      const { fetchKeywordSuggestions } = loadDuck();
      return fetchKeywordSuggestions('umbrella', config)(null, null, createSdk()).then(result => {
        expect(result).toEqual({ suggestions: [], correctedKeywords: null });
      });
    });
  });

  describe('autocorrectKeywords', () => {
    it('keeps keywords that match listings', () => {
      const { autocorrectKeywords } = loadDuck();
      return autocorrectKeywords('jacket', config)(null, null, createSdk()).then(keywords => {
        expect(keywords).toEqual('jacket');
      });
    });

    it('corrects keywords with typos', () => {
      const { autocorrectKeywords } = loadDuck();
      return autocorrectKeywords('blue jakcet', config)(null, null, createSdk()).then(keywords => {
        expect(keywords).toEqual('blue jacket');
      });
    });

    it('uses category names and listing field options in the vocabulary', () => {
      const { autocorrectKeywords } = loadDuck();
      return autocorrectKeywords('kisd blakc', config)(null, null, createSdk()).then(keywords => {
        expect(keywords).toEqual('kids black');
      });
    });

    it('returns the original keywords if the SDK call fails', () => {
      const { autocorrectKeywords } = loadDuck();
      const sdk = { listings: { query: () => Promise.reject(new Error('Network error')) } };
      jest.spyOn(console, 'error').mockImplementation(() => {});
      return autocorrectKeywords('sheos', config)(null, null, sdk).then(keywords => {
        expect(keywords).toEqual('sheos');
        console.error.mockRestore();
      });
    });

    it('returns empty keywords as is', () => {
      const { autocorrectKeywords } = loadDuck();
      const sdk = createSdk();
      return autocorrectKeywords('', config)(null, null, sdk).then(keywords => {
        expect(keywords).toEqual('');
        expect(sdk.listings.query).not.toHaveBeenCalled();
      });
    });
  });
});
