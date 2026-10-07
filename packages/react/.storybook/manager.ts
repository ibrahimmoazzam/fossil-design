import { addons } from 'storybook/manager-api';
import { fossilTheme, systemMode } from './theme.ts';

addons.setConfig({ theme: fossilTheme(systemMode()) });
