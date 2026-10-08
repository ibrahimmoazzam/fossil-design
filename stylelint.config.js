import { fossil } from '@fossil-design/stylelint-config';

/**
 * Fossil lints its own stylesheets with the config it publishes, so consumers get a tested path.
 * The files it skips are in .stylelintignore.
 * @type {import('stylelint').Config}
 */
const config = fossil();

export default config;
