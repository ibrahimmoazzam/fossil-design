import type { ComponentType, SVGProps } from 'react';

/** An SVG as a component: one of Fossil's icons, or an app's own, such as one from SVGR. */
export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/** Wraps an icon's paths in an `<svg>` that sizes to the text and takes its colour. */
export function createIcon(
  name: string,
  viewBox: string,
  paths: readonly string[],
): IconComponent {
  function SvgIcon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={viewBox}
        width="1em"
        height="1em"
        fill="currentColor"
        {...props}
      >
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    );
  }
  SvgIcon.displayName = name;
  return SvgIcon;
}
