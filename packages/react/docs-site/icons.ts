import accountTree from '@material-symbols/svg-400/rounded/account_tree.svg?raw';
import arrowForward from '@material-symbols/svg-400/rounded/arrow_forward.svg?raw';
import experiment from '@material-symbols/svg-400/rounded/experiment.svg?raw';
import info from '@material-symbols/svg-400/rounded/info.svg?raw';
import menuBook from '@material-symbols/svg-400/rounded/menu_book.svg?raw';
import palette from '@material-symbols/svg-400/rounded/palette.svg?raw';
import rocketLaunch from '@material-symbols/svg-400/rounded/rocket_launch.svg?raw';
import warning from '@material-symbols/svg-400/rounded/warning.svg?raw';
import widgets from '@material-symbols/svg-400/rounded/widgets.svg?raw';
import { createIcon } from '../src/components/Icon/createIcon.tsx';

// The site's own icons stay out of the package's icon set, which holds only what components use.
function fromSymbol(name: string, svg: string) {
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1] ?? '0 -960 960 960';
  const paths = [...svg.matchAll(/<path d="([^"]+)"/g)].map(([, d]) => d ?? '');
  return createIcon(name, viewBox, paths);
}

export const ArchitectureIcon = fromSymbol('ArchitectureIcon', accountTree);
export const ArrowForwardIcon = fromSymbol('ArrowForwardIcon', arrowForward);
export const ComponentsIcon = fromSymbol('ComponentsIcon', widgets);
export const DriftEvalIcon = fromSymbol('DriftEvalIcon', experiment);
export const FoundationsIcon = fromSymbol('FoundationsIcon', palette);
export const GettingStartedIcon = fromSymbol(
  'GettingStartedIcon',
  rocketLaunch,
);
export const InfoIcon = fromSymbol('InfoIcon', info);
export const ResearchIcon = fromSymbol('ResearchIcon', menuBook);
export const WarningIcon = fromSymbol('WarningIcon', warning);
