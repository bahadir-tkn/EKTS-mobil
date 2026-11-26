/**
 * frmScreen: the picture shown while the program starts and from
 * Yardım > Hakkında. A tap anywhere closes it, as a click did.
 */
import React from 'react';
import splash from './splash.jpg';

export function Splash({ onClose, note }: { onClose: () => void; note: string }) {
  return (
    <div className="splash-backdrop" onPointerUp={onClose} role="dialog" aria-label="EKTS">
      <div className="splash">
        <svg viewBox="0 0 400 248" width="100%" style={{ display: 'block' }}>
          <rect x={0} y={0} width={400} height={248} fill="rgb(204,204,204)" />
          <image href={splash} x={0} y={0} width={400} height={232} />
          <rect x={0.5} y={0.5} width={399} height={247} fill="none" stroke="#000" />
          <text x={56} y={208} dominantBaseline="hanging" fontFamily="Arial, Helvetica, sans-serif" fontWeight="bold" fontSize={16} fill="rgb(12,68,129)">
            Electric Control Techniques Simulator
          </text>
          <text x={8} y={234} dominantBaseline="hanging" fontFamily="Tahoma, Arial, sans-serif" fontSize={11} fill="#000">
            version: 1.0.3.0
          </text>
          <text x={360} y={234} dominantBaseline="hanging" fontFamily="Tahoma, Arial, sans-serif" fontSize={11} fill="#000">
            2005
          </text>
        </svg>
        <div className="splash-note">{note}</div>
      </div>
    </div>
  );
}
