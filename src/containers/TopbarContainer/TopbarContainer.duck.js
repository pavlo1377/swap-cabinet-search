// ================ Thunks ================ //

const KEYWORD_SUGGESTIONS_LIMIT = 5;

/**
 * Fetch listing title suggestions for the Topbar keyword search autocomplete.
 * The results are not stored in Redux: the autocomplete input keeps them in local state.
 *
 * @param {string} keywords search text typed by the user
 * @returns {Promise<Array<{ id: string, title: string }>>} matching listings
 */
export const fetchKeywordSuggestions = keywords => (dispatch, getState, sdk) => {
  return sdk.listings
    .query({
      keywords,
      perPage: KEYWORD_SUGGESTIONS_LIMIT,
      'fields.listing': ['title'],
    })
    .then(response =>
      response.data.data.map(listing => ({
        id: listing.id.uuid,
        title: listing.attributes.title,
      }))
    );
};
