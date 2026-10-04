import { setProjectAnnotations } from '@storybook/react-vite';
import preview from './preview.js';

// Real-input tests render composed stories, which need the same decorators and styles as Storybook.
setProjectAnnotations([preview]);
