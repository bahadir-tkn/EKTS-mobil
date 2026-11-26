/**
 * Toolbar pictures in the manner of the original 16×16 toolbar images:
 * plain shapes, few colors, dark outlines.
 */
import React from 'react';

const Svg = ({ children }: { children: React.ReactNode }) => (
  <svg width="20" height="20" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
    {children}
  </svg>
);

export const IconNew = () => (
  <Svg>
    <path d="M3.5 1.5h6l3 3v10h-9z" fill="#fff" stroke="#404040" />
    <path d="M9.5 1.5v3h3" fill="#d8d8d8" stroke="#404040" />
  </Svg>
);

export const IconOpen = () => (
  <Svg>
    <path d="M1.5 4.5h4l1 1h6v8h-11z" fill="#e8c24a" stroke="#7a5c00" />
    <path d="M3.5 7.5h11l-2 6h-11z" fill="#f6db7c" stroke="#7a5c00" />
  </Svg>
);

export const IconSave = () => (
  <Svg>
    <path d="M1.5 1.5h12l1 1v12h-13z" fill="#2f5fa8" stroke="#1b335c" />
    <rect x="4" y="2" width="8" height="5" fill="#fff" />
    <rect x="4" y="10" width="8" height="4" fill="#c9c9c9" />
    <rect x="9" y="11" width="2" height="2" fill="#2f5fa8" />
  </Svg>
);

export const IconDelete = ({ disabled }: { disabled?: boolean }) => (
  <Svg>
    <path d="M3 3l10 10M13 3L3 13" stroke={disabled ? '#a0a0a0' : '#606060'} strokeWidth="2.2" shapeRendering="geometricPrecision" />
  </Svg>
);

export const IconPrint = () => (
  <Svg>
    <rect x="4.5" y="1.5" width="7" height="5" fill="#fff" stroke="#404040" />
    <rect x="1.5" y="6.5" width="13" height="6" fill="#c8c8c8" stroke="#404040" />
    <rect x="4.5" y="10.5" width="7" height="4" fill="#fff" stroke="#404040" />
    <rect x="12" y="8" width="1" height="1" fill="#2a8a2a" />
  </Svg>
);

export const IconLibrary = () => (
  <Svg>
    <rect x="1.5" y="1.5" width="6" height="6" fill="#d42a2a" stroke="#5a1010" />
    <rect x="8.5" y="1.5" width="6" height="6" fill="#2a8a2a" stroke="#0f3f0f" />
    <rect x="1.5" y="8.5" width="6" height="6" fill="#2f5fa8" stroke="#1b335c" />
    <rect x="8.5" y="8.5" width="6" height="6" fill="#e8c24a" stroke="#7a5c00" />
  </Svg>
);

export const IconList = () => (
  <Svg>
    <rect x="2.5" y="1.5" width="11" height="13" fill="#e9f5df" stroke="#3d7a22" />
    <path d="M4.5 4.5h7M4.5 7.5h7M4.5 10.5h7" stroke="#3d7a22" />
  </Svg>
);

export const IconRun = () => (
  <Svg>
    <path d="M4 2l9 6-9 6z" fill="#1fa01f" stroke="#0d5c0d" strokeLinejoin="round" shapeRendering="geometricPrecision" />
  </Svg>
);

export const IconStop = () => (
  <Svg>
    <rect x="3.5" y="3.5" width="9" height="9" fill="#cc2222" stroke="#6a0d0d" />
  </Svg>
);

export const IconFit = () => (
  <Svg>
    <path d="M1.5 5.5v-4h4M10.5 1.5h4v4M14.5 10.5v4h-4M5.5 14.5h-4v-4" fill="none" stroke="#404040" />
    <rect x="5.5" y="5.5" width="5" height="5" fill="#fff" stroke="#404040" />
  </Svg>
);

export const IconZoomIn = () => (
  <Svg>
    <path d="M3 8h10M8 3v10" stroke="#404040" strokeWidth="2" />
  </Svg>
);

export const IconZoomOut = () => (
  <Svg>
    <path d="M3 8h10" stroke="#404040" strokeWidth="2" />
  </Svg>
);

export const IconUndo = () => (
  <Svg>
    <path d="M5 3L1.5 6.5 5 10" fill="none" stroke="#2f5fa8" strokeWidth="1.6" shapeRendering="geometricPrecision" />
    <path d="M2 6.5h7.5a4 4 0 0 1 0 8H6" fill="none" stroke="#2f5fa8" strokeWidth="1.6" shapeRendering="geometricPrecision" />
  </Svg>
);

export const IconRedo = () => (
  <Svg>
    <path d="M11 3l3.5 3.5L11 10" fill="none" stroke="#2f5fa8" strokeWidth="1.6" shapeRendering="geometricPrecision" />
    <path d="M14 6.5H6.5a4 4 0 0 0 0 8H10" fill="none" stroke="#2f5fa8" strokeWidth="1.6" shapeRendering="geometricPrecision" />
  </Svg>
);
