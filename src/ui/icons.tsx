/**
 * Inline SVG icons replacing @remixicon/react (React-only). Each icon accepts
 * a `class` string and uses `currentColor` so Tailwind/classes can drive color.
 */
import type { JSX } from "solid-js";

type IconProps = { class?: string };

const base = (path: JSX.Element, extra?: string): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    class={extra}
  >
    {path}
  </svg>
);

export const RiPlantLine = (p: IconProps) =>
  base(
    <path d="M6 12c0-5 4-9 10-9 0 5.5-4.5 10-10 10H6zm0 0h2v9H6v-9zm14-9v2c-5 0-9 4-9 9h-2C9 8 13 4 20 3z" />,
    p.class,
  );

export const RiDropLine = (p: IconProps) =>
  base(
    <path d="M12 21a7 7 0 0 1-7-7c0-2 1-4 3-7l4-5 4 5c2 3 3 5 3 7a7 7 0 0 1-7 7zm0-2a5 5 0 0 0 5-5c0-1.2-.7-2.8-2.3-5l-2.7-3.3-2.7 3.3C7.7 11.2 7 12.8 7 14a5 5 0 0 0 5 5z" />,
    p.class,
  );

export const RiBookOpenLine = (p: IconProps) =>
  base(
    <path d="M21 21H3V3h6a3 3 0 0 1 3 3 3 3 0 0 1 3-3h6v18zm-8-3h7V5h-4a1 1 0 0 0-1 1v12zm-2 0V6a1 1 0 0 0-1-1H5v13h6z" />,
    p.class,
  );

export const RiScissorsLine = (p: IconProps) =>
  base(
    <path d="M14.2 10.8 20 5l-1.4-1.4L12 10.2 5.4 3.6 4 5l5.8 5.8a4 4 0 1 0 1.2 1.2L13 13.8l-2.2 2.2a4 4 0 1 0 1.2 1.2L20 9.4 18.6 8l-4.4 2.8zM6 16a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm12 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />,
    p.class,
  );

export const RiSeedlingLine = (p: IconProps) =>
  base(
    <path d="M12 22v-5a6 6 0 0 1 6-6h3v1a6 6 0 0 1-6 6h-1v4h-2zm-7-10H4a6 6 0 0 1 6-6h1a6 6 0 0 1 6 6h-4a3 3 0 0 0-3 3v3a3 3 0 0 1-3-3v-3H5z" />,
    p.class,
  );

export const RiToolsLine = (p: IconProps) =>
  base(
    <path d="M5.3 8.3a5 5 0 0 1 5.7-7l-2.3 2.3 2.1 2.1L13.1 3.4a5 5 0 0 1-7 5.7L2.4 12.9l1.4 1.4 1.5-1.5 1.4 1.4-1.5 1.5 1.4 1.4 1.5-1.5 1.4 1.4-1.5 1.5 1.4 1.4L13.1 14a5 5 0 0 1 7-5.7l-2.3 2.3-2.1-2.1 2.3-2.3a5 5 0 0 1-5.7 7L5.3 8.3z" />,
    p.class,
  );

export const RiHammerLine = (p: IconProps) =>
  base(
    <path d="m18.4 2.6 3 3-1.4 1.4-1-1-5.3 5.3 1.4 1.4-1.4 1.4-1.4-1.4-7.8 7.8a2 2 0 1 1-2.8-2.8l7.8-7.8L8.1 8.5l1.4-1.4 1.4 1.4L16.3 3l-1-1 1.4-1.4 1.7 2z" />,
    p.class,
  );

export const RiRecycleLine = (p: IconProps) =>
  base(
    <path d="M17 16v2h-2l3 4 3-4h-2V14h-4l2 2h.007l-.007.007V16zM5.5 3h5l3 4h-3.5L8.5 9 5 6l.5-3zm13 0-1.5 3L14 9h-3.5l3-4h5zM3 13h4v4H3l3 4 3-4H6v-4l-3-4v4z" />,
    p.class,
  );

export const RiSparkling2Line = (p: IconProps) =>
  base(
    <path d="m9 11 1-2 1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2zm-3 10 .7 1.3 1.3.7-1.3.7-.7 1.3-.7-1.3-1.3-.7 1.3-.7.7-1.3z" />,
    p.class,
  );

export const RiMapPinLine = (p: IconProps) =>
  base(
    <path d="M12 20.9 7.1 16A7 7 0 1 1 17 16l-5 4.9zm3.5-6.4a5 5 0 1 0-7.1 0L12 18.1l3.5-3.6zM12 13a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />,
    p.class,
  );

export const RiZoomInLine = (p: IconProps) =>
  base(
    <path d="m18.03 16.617 4.283 4.282-1.414 1.414-4.282-4.283A8.96 8.96 0 0 1 11 20a9 9 0 1 1 9-9 8.96 8.96 0 0 1-1.97 5.617zM10 12h3v2H9v-4H7v-2h3V6h2v3h3v2h-3v3z" />,
    p.class,
  );

export const RiZoomOutLine = (p: IconProps) =>
  base(
    <path d="m18.03 16.617 4.283 4.282-1.414 1.414-4.282-4.283A8.96 8.96 0 0 1 11 20a9 9 0 1 1 9-9 8.96 8.96 0 0 1-1.97 5.617zM7 10v2h8v-2H7z" />,
    p.class,
  );

export const RiTargetLine = (p: IconProps) =>
  base(
    <path d="M20.94 11A9 9 0 0 0 13 3.06V1h-2v2.06A9 9 0 0 0 3.06 11H1v2h2.06A9 9 0 0 0 11 20.94V23h2v-2.06A9 9 0 0 0 20.94 13H23v-2h-2.06zM12 19a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm0-3a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
    p.class,
  );

export const RiCloseLine = (p: IconProps) =>
  base(
    <path d="M12 10.586 16.95 5.636l1.414 1.414L13.414 12l4.95 4.95-1.414 1.414L12 13.414l-4.95 4.95-1.414-1.414L10.586 12 5.636 7.05 7.05 5.636 12 10.586z" />,
    p.class,
  );

export const RiCheckLine = (p: IconProps) =>
  base(
    <path d="M10 15.172 19.192 5.98l1.415 1.414L10 18 3.636 11.636l1.414-1.414L10 15.172z" />,
    p.class,
  );

export const RiQuestionLine = (p: IconProps) =>
  base(
    <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-1-5h2v2h-2v-2zm2-1.645V14h-2v-1.5a1 1 0 0 1 1-1 1.5 1.5 0 1 0-1.471-1.794l-1.962-.393A3.5 3.5 0 1 1 13 13.355z" />,
    p.class,
  );

export const RiMapLine = (p: IconProps) =>
  base(
    <path d="M9 3.6 3 4.8v14.4l6-1.2v-14.4zm8.5 14.6L15 17.4V3.8l7-1.4v14.4l-4.5 1.4zM13 17.4l-2 .4V4.2L13 3.8v13.6z" />,
    p.class,
  );

export const RiLock2Line = (p: IconProps) =>
  base(
    <path d="M19 10h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1h1V9a7 7 0 1 1 14 0v1zm-2 0V9A5 5 0 0 0 7 9v1h10zM5 12v8h14v-8H5zm5 3h4v2h-4v-2z" />,
    p.class,
  );

export const RiTrophyLine = (p: IconProps) =>
  base(
    <path d="M13 21v-2h5v-2H6v2h5v2H2v-2h2v-3a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v3h2v2h-9zM5 3h14v8a7 7 0 1 1-14 0V3zm2 2v6a5 5 0 1 0 10 0V5H7zm-5 0h2v4H2V5zm18 0h2v4h-2V5z" />,
    p.class,
  );

export const RiBuilding2Line = (p: IconProps) =>
  base(
    <path d="M21 20h2v2H1v-2h2V3a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v17h4V9h-2V7h3a1 1 0 0 1 1 1v12zM5 4v16h9V4H5zm2 8h5v2H7v-2zm0-4h5v2H7V8z" />,
    p.class,
  );

export const RiMenuLine = (p: IconProps) =>
  base(<path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z" />, p.class);

export const RiFlagLine = (p: IconProps) =>
  base(
    <path d="M5 3h16l-2 6 2 6H7v7H5V3zm2 10h11.3l-1.3-4 1.3-4H7v8z" />,
    p.class,
  );

export const RiCompass3Line = (p: IconProps) =>
  base(
    <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.5-11.5-2 5-5 2 2-5 5-2z" />,
    p.class,
  );
