import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';

// Reuse the location autocomplete dropdown styles so both searches look the same
import css from '../LocationAutocompleteInput/LocationAutocompleteInput.module.css';
import keywordCss from './KeywordAutocompleteInput.module.css';

const DEBOUNCE_WAIT_TIME = 300;
const MIN_QUERY_LENGTH = 2;

const KEY_CODE_ARROW_UP = 38;
const KEY_CODE_ARROW_DOWN = 40;
const KEY_CODE_ENTER = 13;
const KEY_CODE_ESC = 27;

/**
 * Keyword auto completion input component.
 *
 * Works like LocationAutocompleteInput, but the predictions come from the given
 * getSuggestions function (e.g. listing titles) instead of a geocoding service.
 * The input value is a plain string, so it can be used with Final Form's <Field>.
 * If getSuggestions corrected the spelling of the typed text, the corrected text is shown
 * above the suggestions.
 *
 * @component
 * @param {Object} props
 * @param {string} props.id input id, also used to derive the listbox id
 * @param {string?} props.inputClassName
 * @param {string?} props.predictionsClassName overwrite components own css.predictionsRoot
 * @param {string?} props.placeholder
 * @param {Object} props.input Final Form input props
 * @param {string} props.input.value
 * @param {Function} props.input.onChange
 * @param {Function} props.input.onFocus
 * @param {Function} props.input.onBlur
 * @param {Object?} props.inputRef ref forwarded to the input element
 * @param {Function} props.getSuggestions query => Promise<{ suggestions: Array<{ id: string, title: string }>, correctedKeywords: string|null }>
 * @param {Function} props.onSelect called with the selected suggestion ({ id, title })
 * @returns {JSX.Element} keyword input with suggestions
 */
const KeywordAutocompleteInput = props => {
  const {
    id,
    inputClassName,
    predictionsClassName,
    placeholder = '',
    input,
    inputRef,
    getSuggestions,
    onSelect,
  } = props;
  const [suggestions, setSuggestions] = useState([]);
  const [correctedKeywords, setCorrectedKeywords] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef(null);
  const latestQueryRef = useRef('');

  useEffect(() => {
    return () => window.clearTimeout(timeoutRef.current);
  }, []);

  const listboxId = `${id}-suggestions`;
  const showSuggestions = isOpen && suggestions.length > 0;
  const predictionsClasses = classNames(
    predictionsClassName || css.predictionsRoot,
    css.predictionsRootMapbox
  );

  const fetchSuggestions = query => {
    getSuggestions(query)
      .then(results => {
        // Ignore responses to earlier queries that arrive after the user has kept typing
        if (latestQueryRef.current === query) {
          setSuggestions(results.suggestions);
          setCorrectedKeywords(results.correctedKeywords);
          setHighlightedIndex(-1);
        }
      })
      .catch(e => {
        console.error(e);
        if (latestQueryRef.current === query) {
          setSuggestions([]);
          setCorrectedKeywords(null);
        }
      });
  };

  const handleChange = e => {
    const value = e.target.value;
    input.onChange(value);
    setIsOpen(true);

    const query = value.trim();
    latestQueryRef.current = query;
    window.clearTimeout(timeoutRef.current);

    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setCorrectedKeywords(null);
      setHighlightedIndex(-1);
      return;
    }
    timeoutRef.current = window.setTimeout(() => fetchSuggestions(query), DEBOUNCE_WAIT_TIME);
  };

  const selectSuggestion = suggestion => {
    input.onChange(suggestion.title);
    setSuggestions([]);
    setCorrectedKeywords(null);
    setHighlightedIndex(-1);
    setIsOpen(false);
    onSelect(suggestion);
  };

  const handleKeyDown = e => {
    if (e.keyCode === KEY_CODE_ARROW_DOWN && showSuggestions) {
      e.preventDefault();
      setHighlightedIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.keyCode === KEY_CODE_ARROW_UP && showSuggestions) {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, 0));
    } else if (e.keyCode === KEY_CODE_ENTER && showSuggestions && highlightedIndex >= 0) {
      // Pick the highlighted suggestion instead of submitting the typed text
      e.preventDefault();
      selectSuggestion(suggestions[highlightedIndex]);
    } else if (e.keyCode === KEY_CODE_ENTER) {
      // Typed text is submitted by the form
      setIsOpen(false);
    } else if (e.keyCode === KEY_CODE_ESC) {
      setIsOpen(false);
    }
  };

  const handleBlur = e => {
    setIsOpen(false);
    input.onBlur(e);
  };

  const handleFocus = e => {
    setIsOpen(true);
    input.onFocus(e);
  };

  const activeDescendantMaybe =
    showSuggestions && highlightedIndex >= 0
      ? { 'aria-activedescendant': `${listboxId}-${highlightedIndex}` }
      : {};

  return (
    <>
      <input
        {...input}
        className={inputClassName}
        id={id}
        data-testid={id}
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={true}
        autoCorrect="on"
        autoCapitalize="none"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showSuggestions}
        aria-controls={listboxId}
        {...activeDescendantMaybe}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
      />
      {showSuggestions ? (
        <div className={predictionsClasses}>
          {correctedKeywords ? (
            <p className={keywordCss.correctedKeywords} aria-live="polite">
              <FormattedMessage
                id="KeywordAutocompleteInput.showingResultsFor"
                values={{ keywords: <strong>{correctedKeywords}</strong> }}
              />
            </p>
          ) : null}
          <ul className={css.predictions} id={listboxId} role="listbox">
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.id}
                id={`${listboxId}-${index}`}
                className={classNames(css.listItemWhiteText, {
                  [css.highlighted]: index === highlightedIndex,
                })}
                role="option"
                aria-selected={index === highlightedIndex}
                // Prevent input blur, so that the click can select the suggestion
                onMouseDown={e => e.preventDefault()}
                onClick={() => selectSuggestion(suggestion)}
              >
                {suggestion.title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
};

export default KeywordAutocompleteInput;
