import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../../util/reactIntl';

import { NamedLink } from '../../../../components';

import css from './AISearchButton.module.css';

/**
 * Floating "Try AI search" button in the bottom right corner. Opens the AI search page.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @returns {JSX.Element} link to AISearchPage
 */
const AISearchButton = props => {
  const { rootClassName, className } = props;
  const classes = classNames(rootClassName || css.root, className);

  return (
    <NamedLink name="AISearchPage" className={classes}>
      <span className={css.icon} aria-hidden="true">
        ✨
      </span>
      <FormattedMessage id="AISearchButton.label" />
    </NamedLink>
  );
};

export default AISearchButton;
