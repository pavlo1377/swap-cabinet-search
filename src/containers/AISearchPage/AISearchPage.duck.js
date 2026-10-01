import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { aiSearch } from '../../util/api';
import { storableError } from '../../util/errors';
import { createImageVariantConfig } from '../../util/sdkLoader';

import { addMarketplaceEntities } from '../../ducks/marketplaceData.duck';

// ================ Async Thunks ================ //

/**
 * AI search:
 * 1. our server asks Claude which listings match the text (POST /api/ai-search)
 * 2. those listings are loaded from Sharetribe, with an image for the listing card
 * 3. the ids are kept in Claude's order (best match first)
 */
export const searchWithAI = createAsyncThunk(
  'AISearchPage/searchWithAI',
  async ({ text, config }, { dispatch, rejectWithValue, extra: sdk }) => {
    try {
      // 1. Claude picks the listings
      const { listingIds } = await aiSearch({ text });
      if (listingIds.length === 0) {
        return [];
      }

      // 2. Load them (same card image setup as SearchPage)
      const {
        aspectWidth = 1,
        aspectHeight = 1,
        variantPrefix = 'listing-card',
      } = config.layout.listingImage;
      const aspectRatio = aspectHeight / aspectWidth;
      const response = await sdk.listings.query({
        ids: listingIds,
        include: ['author', 'images'],
        'fields.image': [`variants.${variantPrefix}`, `variants.${variantPrefix}-2x`],
        ...createImageVariantConfig(`${variantPrefix}`, 400, aspectRatio),
        ...createImageVariantConfig(`${variantPrefix}-2x`, 800, aspectRatio),
        'limit.images': 1,
      });
      dispatch(addMarketplaceEntities(response, { listingFields: config.listing.listingFields }));

      // 3. Sharetribe returns them in its own order, so sort them back into Claude's order
      const loadedIds = response.data.data.map(listing => listing.id);
      const position = id => listingIds.indexOf(id.uuid);
      return loadedIds.sort((a, b) => position(a) - position(b));
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

// ================ Slice ================ //

const aiSearchPageSlice = createSlice({
  name: 'AISearchPage',
  initialState: {
    resultIds: [],
    hasSearched: false,
    searchInProgress: false,
    searchError: null,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(searchWithAI.pending, state => {
        state.searchInProgress = true;
        state.searchError = null;
      })
      .addCase(searchWithAI.fulfilled, (state, action) => {
        state.resultIds = action.payload;
        state.hasSearched = true;
        state.searchInProgress = false;
      })
      .addCase(searchWithAI.rejected, (state, action) => {
        state.resultIds = [];
        state.hasSearched = true;
        state.searchInProgress = false;
        state.searchError = action.payload;
      });
  },
});

export default aiSearchPageSlice.reducer;
