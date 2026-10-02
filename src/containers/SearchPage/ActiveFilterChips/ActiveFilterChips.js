import React from 'react';

import { FormattedMessage } from '../../../util/reactIntl';
import { formatCurrencyMajorUnit } from '../../../util/currency';
import { SCHEMA_TYPE_ENUM, SCHEMA_TYPE_MULTI_ENUM, SCHEMA_TYPE_LONG } from '../../../util/types';
import { constructQueryParamName, parseSelectFilterOptions } from '../../../util/search';

import ColorSwatch, { COLOR_FIELD_KEY, getColorSwatch } from '../ColorSwatch/ColorSwatch';

import css from './ActiveFilterChips.module.css';

// Built-in filters use their key as the URL param name, e.g. ?price=10,50
const BUILT_IN_PARAM_FILTERS = ['price', 'dates', 'seats', 'keywords'];

// Selected category names from the URL, e.g. ['Women', 'Shoes']
const getCategoryNames = (categories, paramNames, selectedFilters) => {
  const names = [];
  let options = categories;
  paramNames.forEach(paramName => {
    const found = options.find(c => c.id === `${selectedFilters[paramName]}`);
    if (found) {
      names.push(found.name);
    }
    options = found?.subcategories || [];
  });
  return names;
};

/**
 * Turns one filter config into chips for the values selected in the URL.
 * Each chip is { key, label, removeParams }, where removeParams is the URL change that removes it.
 */
const getChipsForFilter = (filterConfig, selectedFilters, intl, categories, currency) => {
  const { key, scope, schemaType } = filterConfig;

  // Category: one chip with the full path (e.g. "Women › Shoes"). Removing it clears all levels.
  if (schemaType === 'category') {
    const paramNames = (filterConfig.nestedParams || []).map(p =>
      constructQueryParamName(p, scope)
    );
    const names = getCategoryNames(categories, paramNames, selectedFilters);
    const removeParams = Object.fromEntries(paramNames.map(p => [p, null]));
    return names.length > 0 ? [{ key, label: names.join(' › '), removeParams }] : [];
  }

  const paramName = BUILT_IN_PARAM_FILTERS.includes(schemaType)
    ? key
    : constructQueryParamName(key, scope);
  const value = selectedFilters[paramName];
  if (value == null || schemaType === 'keywords') {
    // Keywords are already visible in the topbar search
    return [];
  }

  const valueString = `${value}`;
  const removeParams = { [paramName]: null };
  const [min, max] = valueString.split(',');

  switch (schemaType) {
    case 'price': {
      const format = amount => formatCurrencyMajorUnit(intl, currency, Number(amount));
      return [{ key, label: `${format(min)} – ${format(max)}`, removeParams }];
    }
    case 'dates':
      return [{ key, label: `${min} – ${max}`, removeParams }];
    case 'seats': {
      const label = intl.formatMessage({ id: 'FilterComponent.seatsLabel' });
      return [{ key, label: `${label}: ${valueString}`, removeParams }];
    }
    case 'listingType': {
      const option = filterConfig.options?.find(o => o.option === valueString);
      return [{ key, label: option?.label || valueString, removeParams }];
    }
    case SCHEMA_TYPE_LONG:
      return [{ key, label: `${filterConfig.filterConfig?.label}: ${min} – ${max}`, removeParams }];
    case SCHEMA_TYPE_ENUM:
    case SCHEMA_TYPE_MULTI_ENUM: {
      // Several values can be selected, e.g. "has_any:black,white". One chip per value.
      // Removing a chip keeps the other values and the "has_any:" / "has_all:" prefix.
      const values = parseSelectFilterOptions(valueString);
      const prefix = valueString.startsWith('has_') ? valueString.split(':')[0] + ':' : '';
      return values.map(v => {
        const option = filterConfig.enumOptions?.find(o => `${o.option}` === v);
        const others = values.filter(other => other !== v);
        return {
          key: `${key}.${v}`,
          label: option?.label || v,
          swatch: key === COLOR_FIELD_KEY ? getColorSwatch(v, option?.label) : null,
          removeParams: { [paramName]: others.length > 0 ? prefix + others.join(',') : null },
        };
      });
    }
    default:
      return [];
  }
};

/**
 * Shows the active search filters as removable chips, plus a "Clear all" chip.
 * Removing a chip updates the URL, which triggers a new search like any other filter change.
 *
 * @component
 * @param {Object} props
 * @param {Array<Object>} props.filterConfigs - Available filter configs (listing fields + default filters)
 * @param {Object} props.selectedFilters - Valid filter params from the URL
 * @param {Array<Object>} props.listingCategories - Category tree from config
 * @param {string} props.marketplaceCurrency - Currency code, e.g. 'EUR'
 * @param {Function} props.onChange - Called with the URL params to change, e.g. { pub_color: null }
 * @param {Object} props.intl - react-intl API
 * @returns {JSX.Element|null}
 */
const ActiveFilterChips = props => {
  const {
    filterConfigs,
    selectedFilters,
    listingCategories,
    marketplaceCurrency,
    onChange,
    intl,
  } = props;

  const chips = filterConfigs.flatMap(filterConfig =>
    getChipsForFilter(filterConfig, selectedFilters, intl, listingCategories, marketplaceCurrency)
  );
  if (chips.length === 0) {
    return null;
  }

  // "Clear all" sets every param that has a chip to null. Keywords and sort stay as they are.
  const clearAllParams = chips.reduce((params, chip) => {
    Object.keys(chip.removeParams).forEach(paramName => {
      params[paramName] = null;
    });
    return params;
  }, {});

  return (
    <div className={css.root}>
      {chips.map(chip => (
        <button
          key={chip.key}
          type="button"
          className={css.chip}
          onClick={() => onChange(chip.removeParams)}
          aria-label={intl.formatMessage(
            { id: 'ActiveFilterChips.removeFilter' },
            { label: chip.label }
          )}
        >
          {chip.swatch ? <ColorSwatch color={chip.swatch} /> : null}
          {chip.label}
          <span className={css.removeIcon} aria-hidden="true">
            ×
          </span>
        </button>
      ))}
      <button type="button" className={css.clearAll} onClick={() => onChange(clearAllParams)}>
        <FormattedMessage id="ActiveFilterChips.clearAll" />
      </button>
    </div>
  );
};

export default ActiveFilterChips;
