import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Form as FinalForm, Field } from 'react-final-form';

// Contexts and utils
import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { makeGetListingsByIdSelector } from '../../ducks/marketplaceData.duck';

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
 * AI search page: the shopper describes what they want in their own words, Claude picks the
 * matching listings and they are shown here. No filters and no map, just Claude's picks.
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

  const handleSubmit = values => {
    const text = values.text?.trim();
    if (text) {
      dispatch(searchWithAI({ text, config }));
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
                  <Field
                    name="text"
                    render={({ input }) => (
                      <input
                        {...input}
                        className={css.input}
                        type="text"
                        maxLength={TEXT_MAX_LENGTH}
                        autoComplete="off"
                        aria-label={intl.formatMessage({ id: 'AISearchPage.heading' })}
                        placeholder={intl.formatMessage({ id: 'AISearchPage.placeholder' })}
                      />
                    )}
                  />
                  <PrimaryButton
                    className={css.submit}
                    type="submit"
                    inProgress={searchInProgress}
                    disabled={!values.text?.trim() || searchInProgress}
                  >
                    <FormattedMessage id="AISearchPage.submit" />
                  </PrimaryButton>
                </Form>
              )}
            />
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
