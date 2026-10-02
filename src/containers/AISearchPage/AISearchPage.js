import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Form as FinalForm, Field } from 'react-final-form';

// Contexts and utils
import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { makeGetListingsByIdSelector } from '../../ducks/marketplaceData.duck';
import { resizeImageFile } from '../../util/imageFile';

// Shared components
import {
  Form,
  Heading,
  LayoutSingleColumn,
  ListingCard,
  Page,
  PrimaryButton,
} from '../../components';

// Containers
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import { searchWithAI } from './AISearchPage.duck';
import css from './AISearchPage.module.css';

const TEXT_MAX_LENGTH = 500;
// Visible lines of the search text area
const TEXTAREA_ROWS = 3;

// Card image sizes for the grid (same as the SearchPage grid)
const CARD_RENDER_SIZES = [
  '(max-width: 549px) 100vw',
  '(max-width: 767px) 50vw',
  '(max-width: 1439px) 26vw',
  '(max-width: 1920px) 18vw',
  '14vw',
].join(', ');

/**
 * The search results: a message while searching, on error or without results,
 * otherwise the listing cards in Claude's order.
 */
const Results = props => {
  const { listings, hasSearched, searchInProgress, searchError } = props;

  if (searchInProgress) {
    return (
      <p className={css.message}>
        <FormattedMessage id="AISearchPage.searching" />
      </p>
    );
  }
  if (searchError) {
    return (
      <p className={css.error} role="alert">
        <FormattedMessage id="AISearchPage.error" />
      </p>
    );
  }
  if (hasSearched && listings.length === 0) {
    return (
      <p className={css.message}>
        <FormattedMessage id="AISearchPage.noResults" />
      </p>
    );
  }
  if (listings.length === 0) {
    return null;
  }

  return (
    <section>
      <p className={css.resultsCount}>
        <FormattedMessage id="AISearchPage.resultsCount" values={{ count: listings.length }} />
      </p>
      <ul className={css.listingCards}>
        {listings.map(l => (
          <li key={l.id.uuid} className={css.resultItem}>
            <ListingCard className={css.listingCard} listing={l} renderSizes={CARD_RENDER_SIZES} />
          </li>
        ))}
      </ul>
    </section>
  );
};

/**
 * AI search page: the shopper describes what they want in their own words and/or adds a photo
 * of a similar item, Claude picks the matching listings and they are shown here.
 * No filters and no map, just Claude's picks.
 *
 * @returns {JSX.Element} AI search page
 */
const AISearchPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const dispatch = useDispatch();

  const getListingsById = useMemo(makeGetListingsByIdSelector, []);
  const { resultIds, hasSearched, searchInProgress, searchError } = useSelector(
    state => state.AISearchPage
  );
  const listings = useSelector(state => getListingsById(state, resultIds));
  const scrollingDisabled = useSelector(isScrollingDisabled);

  // Optional photo of the wanted item: { mediaType, data, previewUrl }
  const [photo, setPhoto] = useState(null);
  const [photoError, setPhotoError] = useState(false);

  const handlePhotoChange = e => {
    const file = e.target.files?.[0];
    // Reset the input, so the same file can be picked again after removing it
    e.target.value = '';
    if (!file) {
      return;
    }
    setPhotoError(false);
    resizeImageFile(file)
      .then(setPhoto)
      .catch(() => {
        setPhoto(null);
        setPhotoError(true);
      });
  };

  // With a photo, the text is only for extra wishes, e.g. "but in black"
  const placeholderId = photo ? 'AISearchPage.placeholderWithPhoto' : 'AISearchPage.placeholder';

  const handleSubmit = values => {
    const text = values.text?.trim();
    if (text || photo) {
      // The server only needs the photo data, not the preview
      const image = photo ? { mediaType: photo.mediaType, data: photo.data } : undefined;
      dispatch(searchWithAI({ text, image, config }));
    }
  };

  return (
    <Page
      title={intl.formatMessage({ id: 'AISearchPage.title' })}
      scrollingDisabled={scrollingDisabled}
    >
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.root}>
          <header className={css.hero}>
            <Heading as="h1" rootClassName={css.heading}>
              <FormattedMessage id="AISearchPage.heading" />
            </Heading>
            <p className={css.description}>
              <FormattedMessage id="AISearchPage.description" />
            </p>

            <FinalForm
              onSubmit={handleSubmit}
              render={({ handleSubmit, values }) => (
                <Form className={css.form} onSubmit={handleSubmit}>
                  {/* Search box: the attached photo (if any) on the left, then the text area */}
                  <div className={css.searchBox}>
                    {photo ? (
                      <div className={css.photoPreview}>
                        <img
                          className={css.photoImage}
                          src={photo.previewUrl}
                          alt={intl.formatMessage({ id: 'AISearchPage.photoAlt' })}
                        />
                        <button
                          type="button"
                          className={css.removePhoto}
                          onClick={() => setPhoto(null)}
                          aria-label={intl.formatMessage({ id: 'AISearchPage.removePhoto' })}
                          title={intl.formatMessage({ id: 'AISearchPage.removePhoto' })}
                        >
                          <span aria-hidden="true">×</span>
                        </button>
                      </div>
                    ) : null}
                    <Field
                      name="text"
                      render={({ input }) => (
                        <textarea
                          {...input}
                          className={css.textarea}
                          rows={TEXTAREA_ROWS}
                          maxLength={TEXT_MAX_LENGTH}
                          aria-label={intl.formatMessage({ id: 'AISearchPage.heading' })}
                          placeholder={intl.formatMessage({ id: placeholderId })}
                          onKeyDown={e => {
                            // Enter searches, Shift+Enter adds a new line.
                            // isComposing: Enter that confirms an IME input (e.g. Japanese) doesn't search.
                            const isSubmitKey =
                              e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing;
                            if (isSubmitKey) {
                              e.preventDefault();
                              if (!searchInProgress) {
                                handleSubmit();
                              }
                            }
                          }}
                        />
                      )}
                    />
                  </div>

                  <div className={css.actions}>
                    {/* The label is the visible button, the file input itself is hidden */}
                    <label className={css.photoButton}>
                      <input
                        className={css.photoInput}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                      />
                      <FormattedMessage
                        id={photo ? 'AISearchPage.changePhoto' : 'AISearchPage.addPhoto'}
                      />
                    </label>
                    <PrimaryButton
                      className={css.submit}
                      type="submit"
                      inProgress={searchInProgress}
                      disabled={(!values.text?.trim() && !photo) || searchInProgress}
                    >
                      <FormattedMessage id="AISearchPage.submit" />
                    </PrimaryButton>
                  </div>
                </Form>
              )}
            />

            {photoError ? (
              <p className={css.error} role="alert">
                <FormattedMessage id="AISearchPage.photoError" />
              </p>
            ) : null}
          </header>

          <Results
            listings={listings}
            hasSearched={hasSearched}
            searchInProgress={searchInProgress}
            searchError={searchError}
          />
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

export default AISearchPage;
