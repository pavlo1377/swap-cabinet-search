import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';

import { NamedLink } from '../../components';

import css from './AISearchButton.module.css';

/**
 * "Try AI search" button that opens the AI search page.
 * The same button is used as a floating button in the bottom right corner (Topbar)
 * and inline, e.g. on the search page when nothing was found.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {boolean?} props.isFloating fixed in the bottom right corner of the screen (default false)
 * @returns {JSX.Element} link to AISearchPage
 */
const AISearchButton = props => {
  const { rootClassName, className, isFloating = false } = props;
  const classes = classNames(rootClassName || css.root, className, {
    [css.floating]: isFloating,
  });

  return (
    <NamedLink name="AISearchPage" className={classes}>
      <FormattedMessage id="AISearchButton.label" />
    </NamedLink>
  );
};

export default AISearchButton;
