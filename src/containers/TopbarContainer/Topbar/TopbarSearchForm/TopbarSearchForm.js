import React, { useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { Form as FinalForm, Field } from 'react-final-form';
import classNames from 'classnames';

import { useRouteConfiguration } from '../../../../context/routeConfigurationContext';
import { useIntl } from '../../../../util/reactIntl';
import { isMainSearchTypeKeywords } from '../../../../util/search';
import { createResourceLocatorString } from '../../../../util/routes';
import { getRecentVisits } from '../../../../util/recentVisits';

import { Form, KeywordAutocompleteInput, LocationAutocompleteInput } from '../../../../components';

import { autocorrectKeywords, fetchKeywordSuggestions } from '../../TopbarContainer.duck';

import IconSearchDesktop from './IconSearchDesktop';
import css from './TopbarSearchForm.module.css';

const identity = v => v;

const KeywordSearchField = props => {
  const {
    keywordSearchWrapperClasses,
    iconClass,
    intl,
    isMobile = false,
    inputRef,
    onSuggestionSelect,
    appConfig,
  } = props;
  const dispatch = useDispatch();
  const history = useHistory();
  const routeConfiguration = useRouteConfiguration();
  // Listing titles matching the typed text (like the geocoder does for LocationAutocompleteInput).
  // Typos are corrected if nothing matches the typed text.
  const getKeywordSuggestions = query => dispatch(fetchKeywordSuggestions(query, appConfig));

  // Open the listing page of a recently viewed listing (shown while the input is empty)
  const onRecentVisitSelect = visit => {
    const pathParams = { id: visit.id, slug: visit.slug };
    history.push(createResourceLocatorString('ListingPage', routeConfiguration, pathParams, {}));
    // blur search input to hide software keyboard
    inputRef?.current?.blur();
  };

  return (
    <div className={keywordSearchWrapperClasses}>
      <button
        className={css.searchSubmit}
        aria-label={intl.formatMessage({ id: 'TopbarDesktop.screenreader.search' })}
      >
        <div className={iconClass}>
          <IconSearchDesktop />
        </div>
      </button>
      <Field
        name="keywords"
        render={({ input, meta }) => {
          return (
            <KeywordAutocompleteInput
              id={isMobile ? 'keyword-search-mobile' : 'keyword-search'}
              inputClassName={isMobile ? css.mobileInput : css.desktopInput}
              predictionsClassName={isMobile ? css.mobilePredictions : css.desktopPredictions}
              placeholder={intl.formatMessage({ id: 'TopbarSearchForm.placeholder' })}
              inputRef={inputRef}
              input={input}
              getSuggestions={getKeywordSuggestions}
              onSelect={onSuggestionSelect}
              getRecentItems={getRecentVisits}
              onRecentSelect={onRecentVisitSelect}
            />
          );
        }}
      />
    </div>
  );
};
const SubmitButton = props => {
  const intl = useIntl();
  return (
    <button
      className={css.searchSubmit}
      aria-label={intl.formatMessage({ id: 'TopbarDesktop.screenreader.search' })}
      type="submit"
      {...props}
    >
      <IconSearchDesktop />
    </button>
  );
};

const LocationSearchField = props => {
  const { desktopInputRootClass, intl, isMobile = false, inputRef, onLocationChange } = props;
  return (
    <Field
      name="location"
      format={identity}
      render={({ input, meta }) => {
        const { onChange, ...restInput } = input;

        // Merge the standard onChange function with custom behaviur. A better solution would
        // be to use the FormSpy component from Final Form and pass onChange to the
        // onChange prop but that breaks due to insufficient subscription handling.
        // See: https://github.com/final-form/react-final-form/issues/159
        const searchOnChange = value => {
          onChange(value);
          onLocationChange(value);
        };

        return (
          <LocationAutocompleteInput
            id={isMobile ? 'location-search-mobile' : 'location-search'}
            className={isMobile ? css.mobileInputRoot : desktopInputRootClass}
            iconClassName={isMobile ? css.mobileIcon : css.desktopIcon}
            inputClassName={isMobile ? css.mobileInput : css.desktopInput}
            predictionsClassName={isMobile ? css.mobilePredictions : css.desktopPredictions}
            predictionsAttributionClassName={isMobile ? css.mobilePredictionsAttribution : null}
            placeholder={intl.formatMessage({ id: 'TopbarSearchForm.placeholder' })}
            closeOnBlur={!isMobile}
            inputRef={inputRef}
            input={{ ...restInput, onChange: searchOnChange }}
            meta={meta}
            submitButton={SubmitButton}
            ariaLabel={intl.formatMessage({ id: 'TopbarDesktop.screenreader.search' })}
          />
        );
      }}
    />
  );
};

/**
 * The main search form for the Topbar.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {string?} props.desktopInputRoot root class for desktop form input
 * @param {Function} props.onSubmit
 * @param {boolean} props.isMobile
 * @param {Object} props.appConfig
 * @returns {JSX.Element} search form element
 */
const TopbarSearchForm = props => {
  const searchInpuRef = useRef(null);
  const intl = useIntl();
  const dispatch = useDispatch();
  const { appConfig, onSubmit, ...restOfProps } = props;

  const onChange = location => {
    if (!isMainSearchTypeKeywords(appConfig) && location.selectedPlace) {
      // Note that we use `onSubmit` instead of the conventional
      // `handleSubmit` prop for submitting. We want to autosubmit
      // when a place is selected, and don't require any extra
      // validations for the form.
      onSubmit({ location });
      // blur search input to hide software keyboard
      searchInpuRef?.current?.blur();
    }
  };

  const onKeywordSubmit = values => {
    if (isMainSearchTypeKeywords(appConfig)) {
      // blur search input to hide software keyboard
      searchInpuRef?.current?.blur();
      // Search with the corrected keywords if the typed ones have typos ("sheor" => "shoes")
      return dispatch(autocorrectKeywords(values.keywords, appConfig)).then(keywords => {
        onSubmit({ keywords });
      });
    }
  };

  // Autosubmit when a listing is picked from the keyword suggestions.
  // Passing the listing id limits the search results to that single listing.
  const onKeywordSuggestionSelect = suggestion => {
    onSubmit({ keywords: suggestion.title, ids: suggestion.id });
    // blur search input to hide software keyboard
    searchInpuRef?.current?.blur();
  };

  const onLocationSubmit = values => {
    // Allow submit button click for an empty location search form
    if (!isMainSearchTypeKeywords(appConfig)) {
      onSubmit({ location: values.location });
    }
  };

  const isKeywordsSearch = isMainSearchTypeKeywords(appConfig);
  const submit = isKeywordsSearch ? onKeywordSubmit : onLocationSubmit;
  return (
    <FinalForm
      {...restOfProps}
      onSubmit={submit}
      render={formRenderProps => {
        const {
          rootClassName,
          className,
          desktopInputRoot,
          isMobile = false,
          handleSubmit,
        } = formRenderProps;
        const classes = classNames(rootClassName, className);
        const desktopInputRootClass = desktopInputRoot || css.desktopInputRoot;

        const keywordSearchWrapperClasses = classNames(
          css.keywordSearchWrapper,
          isMobile ? css.mobileInputRoot : desktopInputRootClass
        );

        return (
          <Form className={classes} onSubmit={handleSubmit} enforcePagePreloadFor="SearchPage">
            {isKeywordsSearch ? (
              <KeywordSearchField
                keywordSearchWrapperClasses={keywordSearchWrapperClasses}
                iconClass={classNames(isMobile ? css.mobileIcon : css.desktopIcon || css.icon)}
                intl={intl}
                isMobile={isMobile}
                inputRef={searchInpuRef}
                onSuggestionSelect={onKeywordSuggestionSelect}
                appConfig={appConfig}
              />
            ) : (
              <LocationSearchField
                desktopInputRootClass={desktopInputRootClass}
                intl={intl}
                isMobile={isMobile}
                inputRef={searchInpuRef}
                onLocationChange={onChange}
              />
            )}
          </Form>
        );
      }}
    />
  );
};

export default TopbarSearchForm;
