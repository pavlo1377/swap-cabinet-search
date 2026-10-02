import React from 'react';
import { FormattedMessage } from '../../../util/reactIntl';
import { NamedLink } from '../../../components';

import css from './NoSearchResultsMaybe.module.css';

const NoSearchResultsMaybe = props => {
  const { listingsAreLoaded, totalItems, location, resetAll, showCreateListingsLink } = props;
  const hasNoResult = listingsAreLoaded && totalItems === 0;
  const hasSearchParams = location.search?.length > 0;

  const createListingLinkMaybe = showCreateListingsLink ? (
    <NamedLink className={css.createListingLink} name="NewListingPage">
      <FormattedMessage id="SearchPage.createListing" />
    </NamedLink>
  ) : null;

  return hasNoResult ? (
    <div className={css.noSearchResults}>
      <FormattedMessage id="SearchPage.noResults" />
      <br />
      {/* Nothing found with filters: suggest describing it in own words to the AI search */}
      <NamedLink className={css.aiSearchLink} name="AISearchPage">
        <span aria-hidden="true">✨</span>
        <FormattedMessage id="NoSearchResultsMaybe.tryAISearch" />
      </NamedLink>
      <br />
      {hasSearchParams ? (
        <button className={css.resetAllFiltersButton} onClick={e => resetAll(e)}>
          <FormattedMessage id={'SearchPage.resetAllFilters'} />
        </button>
      ) : null}
      <p>{createListingLinkMaybe}</p>
    </div>
  ) : null;
};

export default NoSearchResultsMaybe;
