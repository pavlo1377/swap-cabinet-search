import React from 'react';

import css from './ColorSwatch.module.css';

// The listing field that holds the item color (Console → Listing fields → Color → Listing field ID)
export const COLOR_FIELD_KEY = 'color';

// Swatch for each color, by option value or option name (lowercase). Unknown colors get no swatch.
export const COLOR_SWATCHES = {
  black: '#1a1a1a',
  white: '#ffffff',
  grey: '#9e9e9e',
  red: '#d93025',
  orange: '#f28b30',
  yellow: '#f6cd45',
  green: '#3c9a5f',
  blue: '#2f6fd6',
  purple: '#8e44ad',
  pink: '#f08bb4',
  brown: '#7b5136',
  gold: 'linear-gradient(135deg, #f7e08a, #c9a227)',
  silver: 'linear-gradient(135deg, #f2f2f2, #a7a7a7)',
  bronze: 'linear-gradient(135deg, #e0a96d, #8c5a2b)',
  multicolor: 'conic-gradient(#d93025, #f6cd45, #3c9a5f, #2f6fd6, #8e44ad, #d93025)',
};

// Looks up by option value first (e.g. 'black'), then by the name shown to users (e.g. 'Black')
export const getColorSwatch = (optionValue, optionName) =>
  COLOR_SWATCHES[`${optionValue}`.toLowerCase()] || COLOR_SWATCHES[`${optionName}`.toLowerCase()];

/**
 * A small round color dot shown next to a color name.
 *
 * @component
 * @param {Object} props
 * @param {string} props.color - CSS background value, e.g. '#1a1a1a' or a gradient
 * @returns {JSX.Element}
 */
const ColorSwatch = props => {
  return <span className={css.swatch} style={{ background: props.color }} aria-hidden="true" />;
};

/**
 * Adds a color dot in front of each option label, e.g. "● Black".
 *
 * @param {Array<Object>} options - Enum options: [{ option, label }]
 * @returns {Array<Object>} The same options with the label as a React element
 */
export const addColorSwatches = options =>
  options.map(o => {
    const color = getColorSwatch(o.option, o.label);
    return color
      ? {
          ...o,
          label: (
            <span className={css.labelWithSwatch}>
              <ColorSwatch color={color} />
              {o.label}
            </span>
          ),
        }
      : o;
  });

export default ColorSwatch;
