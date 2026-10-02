import { buildVocabulary, correctSpelling } from '../../util/spelling';

// ================ Thunks ================ //

const KEYWORD_SUGGESTIONS_LIMIT = 5;
// Max page size of the Marketplace API
const VOCABULARY_LISTINGS_LIMIT = 100;

// The vocabulary for spelling correction is the same for every user,
// so it is fetched once and shared by the later searches.
let vocabularyPromise = null;

// Category names (and their subcategory names) from the hosted config
const categoryNames = categories =>
  (categories || []).flatMap(c => [c.name, ...categoryNames(c.subcategories)]);

// Labels and options of the listing fields with fixed options (e.g. color: "Black")
const listingFieldOptionTexts = listingFields =>
  (listingFields || []).flatMap(field =>
    (field.enumOptions || []).flatMap(o => [o.label, `${o.option}`])
  );

// Listing titles and public data texts (e.g. brand: "Adidas")
const listingTexts = listing => {
  const { title, publicData } = listing.attributes;
  const publicDataTexts = Object.values(publicData || {}).filter(v => typeof v === 'string');
  return [title, ...publicDataTexts];
};

/**
 * Words that exist in the marketplace: listing titles, category names, and listing field options.
 * If fetching the listings fails, the next search tries again.
 *
 * @param {Object} sdk
 * @param {Object} config
 * @returns {Promise<Map<string, number>>} vocabulary
 */
const getVocabulary = (sdk, config) => {
  if (!vocabularyPromise) {
    const configTexts = [
      ...categoryNames(config?.categoryConfiguration?.categories),
      ...listingFieldOptionTexts(config?.listing?.listingFields),
    ];

    vocabularyPromise = sdk.listings
      .query({ perPage: VOCABULARY_LISTINGS_LIMIT, 'fields.listing': ['title', 'publicData'] })
      .then(response =>
        buildVocabulary([...configTexts, ...response.data.data.flatMap(listingTexts)])
      )
      .catch(e => {
        vocabularyPromise = null;
        throw e;
      });
  }
  return vocabularyPromise;
};

/**
 * Correct the spelling of the given keywords against the marketplace vocabulary.
 * Failing to fetch the vocabulary just means that nothing is corrected.
 *
 * @param {string} keywords
 * @param {Object} sdk
 * @param {Object} config
 * @returns {Promise<string|null>} corrected keywords, or null if nothing was corrected
 */
const correctKeywords = (keywords, sdk, config) =>
  getVocabulary(sdk, config)
    .then(vocabulary => correctSpelling(keywords, vocabulary))
    .catch(e => {
      console.error(e);
      return null;
    });

const queryTitles = (sdk, keywords, perPage) =>
  sdk.listings.query({ keywords, perPage, 'fields.listing': ['title'] }).then(response =>
    response.data.data.map(listing => ({
      id: listing.id.uuid,
      title: listing.attributes.title,
    }))
  );

/**
 * Fetch listing title suggestions for the Topbar keyword search autocomplete.
 * The results are not stored in Redux: the autocomplete input keeps them in local state.
 *
 * If nothing matches the typed text, the spelling is corrected ("sheor" => "shoes") and
 * the suggestions for the corrected text are returned instead.
 *
 * @param {string} keywords search text typed by the user
 * @param {Object} config app config, used for the spelling correction vocabulary
 * @returns {Promise<{ suggestions: Array<{ id: string, title: string }>, correctedKeywords: string|null }>}
 * matching listings, and the corrected search text if the spelling was corrected
 */
export const fetchKeywordSuggestions = (keywords, config) => (dispatch, getState, sdk) => {
  return queryTitles(sdk, keywords, KEYWORD_SUGGESTIONS_LIMIT).then(suggestions => {
    if (suggestions.length > 0) {
      return { suggestions, correctedKeywords: null };
    }
    return correctKeywords(keywords, sdk, config).then(correctedKeywords =>
      correctedKeywords
        ? queryTitles(sdk, correctedKeywords, KEYWORD_SUGGESTIONS_LIMIT).then(
            correctedSuggestions => ({ suggestions: correctedSuggestions, correctedKeywords })
          )
        : { suggestions: [], correctedKeywords: null }
    );
  });
};

/**
 * Autocorrect the keywords of a submitted Topbar search. The keywords are corrected only
 * if they don't match any listing, so that correctly spelled but rare words are kept.
 *
 * @param {string} keywords search text submitted by the user
 * @param {Object} config app config, used for the spelling correction vocabulary
 * @returns {Promise<string>} the corrected keywords, or the original keywords
 */
export const autocorrectKeywords = (keywords, config) => (dispatch, getState, sdk) => {
  if (!keywords || !keywords.trim()) {
    return Promise.resolve(keywords);
  }
  return queryTitles(sdk, keywords, 1)
    .then(results => (results.length > 0 ? null : correctKeywords(keywords, sdk, config)))
    .then(correctedKeywords => correctedKeywords || keywords)
    .catch(e => {
      // Never block the search because of the spelling correction
      console.error(e);
      return keywords;
    });
};
