const baseConfig = require('./.prettierrc-base.js');

/**
 * @typedef {import('prettier-plugin-multiline-arrays').MultilineArrayOptions} MultilineOptions
 *
 * @typedef {import('prettier').Options} PrettierOptions
 * @type {PrettierOptions & MultilineOptions}
 */
const prettierConfig = {
    ...baseConfig,
    tabWidth: 2,
};

module.exports = prettierConfig;
