import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';
import { constructQueryParamName } from '../../../util/search';

import css from './ListingTypeTabs.module.css';

/**
 * Listing type switch above the search results: "All", "Sell products", "In search of", ...
 * The options come from the listing type filter config, so they follow the listing types in Console.
 * Picking a tab updates the URL like any other filter change.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Add more style rules in addition to components own css.root
 * @param {Object} props.filterConfig - Listing type filter config ({ key, scope, options })
 * @param {Object} props.selectedFilters - Valid filter params from the URL
 * @param {Function} props.onChange - Called with the URL params to change, e.g. { pub_listingType: 'sell' }
 * @param {Object} props.intl - react-intl API
 * @returns {JSX.Element}
 */
const ListingTypeTabs = props => {
  const { className, filterConfig, selectedFilters, onChange, intl } = props;
  const { key, scope, options = [] } = filterConfig;

  const paramName = constructQueryParamName(key, scope);
  const selectedOption = selectedFilters[paramName] || null;

  // "All" removes the listing type param
  const tabs = [
    { option: null, label: <FormattedMessage id="ListingTypeTabs.all" /> },
    ...options,
  ];

  return (
    <div
      className={classNames(css.root, className)}
      role="group"
      aria-label={intl.formatMessage({ id: 'FilterComponent.listingTypeLabel' })}
    >
      {tabs.map(tab => {
        const isSelected = tab.option === selectedOption;
        return (
          <button
            key={tab.option || 'all'}
            type="button"
            className={classNames(css.tab, { [css.selected]: isSelected })}
            aria-pressed={isSelected}
            onClick={() => onChange({ [paramName]: tab.option })}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default ListingTypeTabs;
