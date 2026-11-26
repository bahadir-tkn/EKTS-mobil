import React from 'react';
import type {
  CircuitComponent,
  ComponentType,
  LampColor,
  MotorStatus,
  TimerRuntimeState,
} from '../../types/circuit';

export interface SymbolRenderProps {
  component: CircuitComponent;
  isDark: boolean;
  isSimulating: boolean;
  isSelected: boolean;
  isEnergized: boolean;
  isClosed: boolean;
  isLit: boolean;
  isFault: boolean;
  isPressed?: boolean;
  isLocked?: boolean;
  isLatched?: boolean;
  isBlown?: boolean;
  motorStatus?: MotorStatus;
  timerState?: TimerRuntimeState;
}

const LAMP_COLORS: Record<
  LampColor,
  { litFill: string; litStroke: string; glow: string; label: string }
> = {
  green: {
    litFill: '#22C55E',
    litStroke: '#15803D',
    glow: 'rgba(34, 197, 94, 0.45)',
    label: 'Yeşil',
  },
  red: {
    litFill: '#EF4444',
    litStroke: '#B91C1C',
    glow: 'rgba(239, 68, 68, 0.45)',
    label: 'Kırmızı',
  },
  yellow: {
    litFill: '#FACC15',
    litStroke: '#A16207',
    glow: 'rgba(250, 204, 21, 0.5)',
    label: 'Sarı',
  },
};

function getMotorBadge(status: MotorStatus): {
  text: string;
  running: boolean;
  clockwise: boolean;
  color: string;
  lightFill: string;
  darkFill: string;
  badgeBgLight: string;
  badgeBgDark: string;
  badgeTextLight: string;
  badgeTextDark: string;
} | null {
  switch (status) {
    case 'forward':
      return {
        text: 'İLERİ ↻',
        running: true,
        clockwise: true,
        color: '#16A34A',
        lightFill: '#F0FDF4',
        darkFill: '#052E16',
        badgeBgLight: '#DCFCE7',
        badgeBgDark: '#064E3B',
        badgeTextLight: '#15803D',
        badgeTextDark: '#86EFAC',
      };
    case 'reverse':
      return {
        text: 'GERİ ↺',
        running: true,
        clockwise: false,
        color: '#2563EB',
        lightFill: '#EFF6FF',
        darkFill: '#172554',
        badgeBgLight: '#DBEAFE',
        badgeBgDark: '#1E3A8A',
        badgeTextLight: '#1D4ED8',
        badgeTextDark: '#93C5FD',
      };
    case 'star_forward':
      return {
        text: 'YILDIZ (Y) ↻',
        running: true,
        clockwise: true,
        color: '#0D9488',
        lightFill: '#F0FDFA',
        darkFill: '#042F2E',
        badgeBgLight: '#CCFBF1',
        badgeBgDark: '#115E59',
        badgeTextLight: '#0F766E',
        badgeTextDark: '#5EEAD4',
      };
    case 'star_reverse':
      return {
        text: 'YILDIZ (Y) ↺',
        running: true,
        clockwise: false,
        color: '#0284C7',
        lightFill: '#F0F9FF',
        darkFill: '#082F49',
        badgeBgLight: '#E0F2FE',
        badgeBgDark: '#075985',
        badgeTextLight: '#0369A1',
        badgeTextDark: '#7DD3FC',
      };
    case 'delta_forward':
      return {
        text: 'ÜÇGEN (Δ) ↻',
        running: true,
        clockwise: true,
        color: '#16A34A',
        lightFill: '#F0FDF4',
        darkFill: '#052E16',
        badgeBgLight: '#DCFCE7',
        badgeBgDark: '#064E3B',
        badgeTextLight: '#15803D',
        badgeTextDark: '#86EFAC',
      };
    case 'delta_reverse':
      return {
        text: 'ÜÇGEN (Δ) ↺',
        running: true,
        clockwise: false,
        color: '#2563EB',
        lightFill: '#EFF6FF',
        darkFill: '#172554',
        badgeBgLight: '#DBEAFE',
        badgeBgDark: '#1E3A8A',
        badgeTextLight: '#1D4ED8',
        badgeTextDark: '#93C5FD',
      };
    case 'phase_missing':
      return {
        text: '⚠ EKSİK FAZ',
        running: false,
        clockwise: true,
        color: '#D97706',
        lightFill: '#FFFBEB',
        darkFill: '#451A03',
        badgeBgLight: '#FEF3C7',
        badgeBgDark: '#78350F',
        badgeTextLight: '#B45309',
        badgeTextDark: '#FDE68A',
      };
    default:
      return null;
  }
}

export function ComponentSymbol({
  component,
  isDark,
  isSimulating,
  isSelected,
  isEnergized,
  isClosed,
  isLit,
  isFault,
  isPressed = false,
  isLocked = false,
  isLatched = false,
  isBlown = false,
  motorStatus = 'stopped',
  timerState,
}: SymbolRenderProps) {
  const ink = isFault ? '#DC2626' : isDark ? '#E2E8F0' : '#1E293B';
  const mutedInk = isDark ? '#94A3B8' : '#64748B';
  const surfaceBg = isDark ? '#0F172A' : '#FFFFFF';
  const activeStroke = isFault ? '#DC2626' : isDark ? '#F87171' : '#DC2626';
  const held = isPressed || isLocked;

  const labelTransform =
    component.rotation !== 0 ? `rotate(${-component.rotation})` : undefined;

  const renderBody = () => {
    switch (component.type) {
      case 'power_l1':
      case 'power_l2':
      case 'power_l3':
      case 'power_n': {
        const meta = {
          power_l1: { main: 'L1', sub: 'R', fill: '#DC2626', lightBg: '#FEF2F2', darkBg: '#450A0A', pinY: 20 },
          power_l2: { main: 'L2', sub: 'S', fill: '#EA580C', lightBg: '#FFF7ED', darkBg: '#431407', pinY: 20 },
          power_l3: { main: 'L3', sub: 'T', fill: '#D97706', lightBg: '#FFFBEB', darkBg: '#451A03', pinY: 20 },
          power_n: { main: 'N', sub: 'Mp', fill: '#2563EB', lightBg: '#EFF6FF', darkBg: '#172554', pinY: -20 },
        }[component.type];

        return (
          <g>
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={meta.pinY}
              stroke={isFault ? '#DC2626' : meta.fill}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <rect
              x={-18}
              y={-13}
              width={36}
              height={26}
              rx={6}
              fill={isDark ? meta.darkBg : meta.lightBg}
              stroke={isFault ? '#DC2626' : meta.fill}
              strokeWidth={2}
            />
            <g transform={labelTransform}>
              <text
                x={0}
                y={1}
                textAnchor="middle"
                fill={isDark ? '#F8FAFC' : meta.fill}
                className="font-mono-tech select-none"
                fontSize={10.5}
                fontWeight={700}
              >
                {meta.main}
              </text>
              <text
                x={0}
                y={10}
                textAnchor="middle"
                fill={isDark ? '#CBD5E1' : meta.fill}
                opacity={0.85}
                className="font-mono-tech select-none"
                fontSize={7.5}
                fontWeight={600}
              >
                {meta.sub}
              </text>
            </g>
          </g>
        );
      }

      case 'power_3ph': {
        const rails = [
          { x: -40, main: 'L1', sub: 'R', fill: '#DC2626', lightBg: '#FEF2F2', darkBg: '#450A0A' },
          { x: 0, main: 'L2', sub: 'S', fill: '#EA580C', lightBg: '#FFF7ED', darkBg: '#431407' },
          { x: 40, main: 'L3', sub: 'T', fill: '#D97706', lightBg: '#FFFBEB', darkBg: '#451A03' },
        ];
        return (
          <g>
            <rect
              x={-58}
              y={-15}
              width={116}
              height={30}
              rx={7}
              fill={surfaceBg}
              stroke={isDark ? '#334155' : '#CBD5E1'}
              strokeWidth={1.5}
            />
            {rails.map((r) => (
              <g key={r.main} transform={`translate(${r.x}, 0)`}>
                <line
                  x1={0}
                  y1={11}
                  x2={0}
                  y2={20}
                  stroke={isFault ? '#DC2626' : r.fill}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                <rect
                  x={-16}
                  y={-11}
                  width={32}
                  height={22}
                  rx={5}
                  fill={isDark ? r.darkBg : r.lightBg}
                  stroke={isFault ? '#DC2626' : r.fill}
                  strokeWidth={1.6}
                />
                <g transform={labelTransform}>
                  <text
                    x={0}
                    y={1}
                    textAnchor="middle"
                    fill={isDark ? '#F8FAFC' : r.fill}
                    className="font-mono-tech select-none"
                    fontSize={9.5}
                    fontWeight={700}
                  >
                    {r.main}
                  </text>
                  <text
                    x={0}
                    y={9}
                    textAnchor="middle"
                    fill={isDark ? '#CBD5E1' : r.fill}
                    opacity={0.85}
                    className="font-mono-tech select-none"
                    fontSize={7}
                    fontWeight={600}
                  >
                    {r.sub}
                  </text>
                </g>
              </g>
            ))}
          </g>
        );
      }

      case 'fuse': {
        const stroke = isFault ? '#DC2626' : isBlown ? '#94A3B8' : ink;
        return (
          <g>
            <line x1={0} y1={-40} x2={0} y2={-18} stroke={stroke} strokeWidth={2.2} />
            <line x1={0} y1={18} x2={0} y2={40} stroke={stroke} strokeWidth={2.2} />
            <rect
              x={-8}
              y={-18}
              width={16}
              height={36}
              rx={2}
              fill={surfaceBg}
              stroke={stroke}
              strokeWidth={2}
            />
            {isBlown ? (
              <g>
                <line x1={0} y1={-18} x2={0} y2={-5} stroke="#DC2626" strokeWidth={2} />
                <line x1={0} y1={5} x2={0} y2={18} stroke="#DC2626" strokeWidth={2} />
                <line x1={-5} y1={-4} x2={5} y2={4} stroke="#DC2626" strokeWidth={1.8} />
              </g>
            ) : (
              <line x1={0} y1={-18} x2={0} y2={18} stroke={stroke} strokeWidth={2} />
            )}
            <text x={11} y={-24} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              1
            </text>
            <text x={11} y={32} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              2
            </text>
            <g transform="translate(18, 4)">
              <text
                transform={labelTransform}
                fill={ink}
                fontSize={12}
                fontWeight={600}
                className="font-mono-tech select-none"
              >
                {component.label}
              </text>
            </g>
          </g>
        );
      }

      case 'thermal_nc': {
        const closedNow = isSimulating ? !isBlown : true;
        const bladeStroke = isBlown ? '#DC2626' : ink;
        return (
          <g>
            <line x1={0} y1={-40} x2={0} y2={-16} stroke={ink} strokeWidth={2.2} />
            <line x1={0} y1={-16} x2={9} y2={-16} stroke={ink} strokeWidth={2.2} />
            <line x1={0} y1={16} x2={0} y2={40} stroke={ink} strokeWidth={2.2} />
            <circle cx={0} cy={16} r={2.5} fill={ink} />

            {/* Moving NC blade */}
            <line
              x1={0}
              y1={16}
              x2={closedNow ? 6 : 16}
              y2={-18}
              stroke={bladeStroke}
              strokeWidth={2.5}
              strokeLinecap="round"
            />

            {/* IEC Thermal Overload bimetallic square-wave actuator */}
            <line
              x1={-12}
              y1={0}
              x2={closedNow ? 2 : 7}
              y2={0}
              stroke={mutedInk}
              strokeWidth={1.5}
              strokeDasharray="3 2"
            />
            <polyline
              points="-24,-10 -18,-10 -18,-4 -12,-4 -12,4 -18,4 -18,10 -24,10"
              fill="none"
              stroke={isBlown ? '#DC2626' : '#D97706'}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <text x={11} y={-22} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              95
            </text>
            <text x={11} y={30} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              96
            </text>
            <g transform="translate(16, 4)">
              <text
                transform={labelTransform}
                fill={isBlown ? '#DC2626' : ink}
                fontSize={11.5}
                fontWeight={700}
                className="font-mono-tech select-none"
              >
                {component.label}
              </text>
            </g>
          </g>
        );
      }

      case 'btn_start': {
        const closedNow = isSimulating ? isClosed : false;
        const bladeStroke = closedNow ? activeStroke : ink;
        const actuatorX = closedNow ? -15 : -20;
        return (
          <g>
            <line x1={0} y1={-40} x2={0} y2={-16} stroke={ink} strokeWidth={2.2} />
            <line x1={0} y1={16} x2={0} y2={40} stroke={ink} strokeWidth={2.2} />
            <circle cx={0} cy={-16} r={2.5} fill={ink} />
            <circle cx={0} cy={16} r={2.5} fill={ink} />

            <line
              x1={0}
              y1={16}
              x2={closedNow ? 0 : -12}
              y2={-15}
              stroke={bladeStroke}
              strokeWidth={2.5}
              strokeLinecap="round"
            />

            <line
              x1={actuatorX}
              y1={0}
              x2={closedNow ? -1 : -7}
              y2={0}
              stroke={mutedInk}
              strokeWidth={1.6}
              strokeDasharray="3 2"
            />
            <path
              d={`M ${actuatorX - 6} -10 L ${actuatorX} -10 L ${actuatorX} 10 L ${actuatorX - 6} 10`}
              fill="none"
              stroke={held ? '#16A34A' : '#15803D'}
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {isLocked && isSimulating && (
              <circle cx={actuatorX - 6} cy={-14} r={3.5} fill="#16A34A" />
            )}

            <text x={8} y={-22} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              13
            </text>
            <text x={8} y={30} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              14
            </text>

            <g transform="translate(14, 4)">
              <text
                transform={labelTransform}
                fill={held ? '#16A34A' : ink}
                fontSize={12}
                fontWeight={700}
                className="font-mono-tech select-none"
              >
                {component.label}
              </text>
            </g>
          </g>
        );
      }

      case 'btn_stop': {
        const closedNow = isSimulating ? isClosed : true;
        const bladeStroke = isSimulating && !closedNow ? '#DC2626' : ink;
        const actuatorX = held ? -15 : -20;
        return (
          <g>
            <line x1={0} y1={-40} x2={0} y2={-16} stroke={ink} strokeWidth={2.2} />
            <line x1={0} y1={-16} x2={9} y2={-16} stroke={ink} strokeWidth={2.2} />
            <line x1={0} y1={16} x2={0} y2={40} stroke={ink} strokeWidth={2.2} />
            <circle cx={0} cy={16} r={2.5} fill={ink} />

            <line
              x1={0}
              y1={16}
              x2={closedNow ? 6 : 16}
              y2={-18}
              stroke={bladeStroke}
              strokeWidth={2.5}
              strokeLinecap="round"
            />

            <line
              x1={actuatorX}
              y1={0}
              x2={closedNow ? 2 : 7}
              y2={0}
              stroke={mutedInk}
              strokeWidth={1.6}
              strokeDasharray="3 2"
            />
            <path
              d={`M ${actuatorX - 6} -10 L ${actuatorX} -10 L ${actuatorX} 10 L ${actuatorX - 6} 10`}
              fill="none"
              stroke="#DC2626"
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {isLocked && isSimulating && (
              <circle cx={actuatorX - 6} cy={-14} r={3.5} fill="#DC2626" />
            )}

            <text x={11} y={-22} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              11
            </text>
            <text x={11} y={30} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              12
            </text>

            <g transform="translate(16, 4)">
              <text
                transform={labelTransform}
                fill={held ? '#DC2626' : ink}
                fontSize={12}
                fontWeight={700}
                className="font-mono-tech select-none"
              >
                {component.label}
              </text>
            </g>
          </g>
        );
      }

      case 'btn_dual': {
        // Classic EKTS Çift Yollu Buton: Left NC (11-12) + Right NO (23-24) mechanically linked
        const pressedNow = isSimulating ? held : false;
        const actuatorX = pressedNow ? -33 : -38;
        return (
          <g>
            {/* Mechanical link across both poles */}
            <line
              x1={actuatorX}
              y1={0}
              x2={pressedNow ? 19 : 13}
              y2={0}
              stroke={mutedInk}
              strokeWidth={1.6}
              strokeDasharray="3 2"
            />
            <path
              d={`M ${actuatorX - 6} -10 L ${actuatorX} -10 L ${actuatorX} 10 L ${actuatorX - 6} 10`}
              fill="none"
              stroke={pressedNow ? '#2563EB' : '#1D4ED8'}
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {isLocked && isSimulating && (
              <circle cx={actuatorX - 6} cy={-14} r={3.5} fill="#2563EB" />
            )}

            {/* Left Pole: NC (11-12) */}
            <g transform="translate(-20, 0)">
              <line x1={0} y1={-40} x2={0} y2={-16} stroke={ink} strokeWidth={2.2} />
              <line x1={0} y1={-16} x2={8} y2={-16} stroke={ink} strokeWidth={2.2} />
              <line x1={0} y1={16} x2={0} y2={40} stroke={ink} strokeWidth={2.2} />
              <circle cx={0} cy={16} r={2.3} fill={ink} />
              <line
                x1={0}
                y1={16}
                x2={pressedNow ? 13 : 5}
                y2={-18}
                stroke={pressedNow ? '#D97706' : ink}
                strokeWidth={2.4}
                strokeLinecap="round"
              />
              <text x={-14} y={-22} fill={mutedInk} fontSize={8.5} className="font-mono-tech select-none">
                11
              </text>
              <text x={-14} y={30} fill={mutedInk} fontSize={8.5} className="font-mono-tech select-none">
                12
              </text>
            </g>

            {/* Right Pole: NO (23-24) */}
            <g transform="translate(20, 0)">
              <line x1={0} y1={-40} x2={0} y2={-16} stroke={ink} strokeWidth={2.2} />
              <line x1={0} y1={16} x2={0} y2={40} stroke={ink} strokeWidth={2.2} />
              <circle cx={0} cy={-16} r={2.3} fill={ink} />
              <circle cx={0} cy={16} r={2.3} fill={ink} />
              <line
                x1={0}
                y1={16}
                x2={pressedNow ? 0 : -11}
                y2={-15}
                stroke={pressedNow ? activeStroke : ink}
                strokeWidth={2.4}
                strokeLinecap="round"
              />
              <text x={7} y={-22} fill={mutedInk} fontSize={8.5} className="font-mono-tech select-none">
                23
              </text>
              <text x={7} y={30} fill={mutedInk} fontSize={8.5} className="font-mono-tech select-none">
                24
              </text>
            </g>

            <g transform="translate(32, 4)">
              <text
                transform={labelTransform}
                fill={pressedNow ? '#2563EB' : ink}
                fontSize={12}
                fontWeight={700}
                className="font-mono-tech select-none"
              >
                {component.label}
              </text>
            </g>
          </g>
        );
      }

      case 'switch_toggle': {
        const closedNow = isSimulating ? isClosed : false;
        const bladeStroke = closedNow ? activeStroke : ink;
        return (
          <g>
            <line x1={0} y1={-40} x2={0} y2={-16} stroke={ink} strokeWidth={2.2} />
            <line x1={0} y1={16} x2={0} y2={40} stroke={ink} strokeWidth={2.2} />
            <circle cx={0} cy={-16} r={2.5} fill={ink} />
            <circle cx={0} cy={16} r={2.5} fill={ink} />

            <line
              x1={0}
              y1={16}
              x2={closedNow ? 0 : -13}
              y2={-15}
              stroke={bladeStroke}
              strokeWidth={2.5}
              strokeLinecap="round"
            />

            <line
              x1={-22}
              y1={0}
              x2={closedNow ? -1 : -7}
              y2={0}
              stroke={mutedInk}
              strokeWidth={1.6}
              strokeDasharray="3 2"
            />
            <polyline
              points="-16,-5 -12,0 -16,5"
              fill="none"
              stroke={isLatched ? '#1D4ED8' : ink}
              strokeWidth={1.8}
            />
            <line
              x1={-22}
              y1={-9}
              x2={-22}
              y2={9}
              stroke={isLatched ? '#1D4ED8' : ink}
              strokeWidth={2.5}
              strokeLinecap="round"
            />

            <text x={8} y={-22} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              13
            </text>
            <text x={8} y={30} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              14
            </text>
            <g transform="translate(14, 4)">
              <text
                transform={labelTransform}
                fill={isLatched ? '#1D4ED8' : ink}
                fontSize={12}
                fontWeight={700}
                className="font-mono-tech select-none"
              >
                {component.label}
              </text>
            </g>
          </g>
        );
      }

      case 'btn_estop': {
        const closedNow = isSimulating ? isClosed : true;
        const actuatorX = isLatched ? -16 : -21;
        return (
          <g>
            <line x1={0} y1={-40} x2={0} y2={-16} stroke={ink} strokeWidth={2.2} />
            <line x1={0} y1={-16} x2={9} y2={-16} stroke={ink} strokeWidth={2.2} />
            <line x1={0} y1={16} x2={0} y2={40} stroke={ink} strokeWidth={2.2} />
            <circle cx={0} cy={16} r={2.5} fill={ink} />

            <line
              x1={0}
              y1={16}
              x2={closedNow ? 6 : 16}
              y2={-18}
              stroke={isLatched ? '#DC2626' : ink}
              strokeWidth={2.5}
              strokeLinecap="round"
            />

            <line
              x1={actuatorX}
              y1={0}
              x2={closedNow ? 2 : 7}
              y2={0}
              stroke={mutedInk}
              strokeWidth={1.6}
              strokeDasharray="3 2"
            />
            <polyline
              points={`${actuatorX + 6},-4 ${actuatorX + 10},0 ${actuatorX + 6},4`}
              fill="none"
              stroke="#DC2626"
              strokeWidth={1.6}
            />
            <path
              d={`M ${actuatorX} -11 A 11 11 0 0 0 ${actuatorX} 11 Z`}
              fill={isLatched ? '#DC2626' : '#EF4444'}
              stroke="#991B1B"
              strokeWidth={1.6}
            />

            <text x={11} y={-22} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              11
            </text>
            <text x={11} y={30} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              12
            </text>
            <g transform="translate(16, 4)">
              <text
                transform={labelTransform}
                fill={isLatched ? '#DC2626' : ink}
                fontSize={12}
                fontWeight={700}
                className="font-mono-tech select-none"
              >
                {component.label}
              </text>
            </g>
          </g>
        );
      }

      case 'limit_no': {
        const closedNow = isSimulating ? isClosed : false;
        const stroke = closedNow ? activeStroke : ink;
        return (
          <g>
            <line x1={0} y1={-40} x2={0} y2={-16} stroke={ink} strokeWidth={2.2} />
            <line x1={0} y1={16} x2={0} y2={40} stroke={ink} strokeWidth={2.2} />
            <circle cx={0} cy={-16} r={2.3} fill={ink} />
            <circle cx={0} cy={16} r={2.3} fill={ink} />
            <line
              x1={0}
              y1={16}
              x2={closedNow ? 0 : -12}
              y2={-15}
              stroke={stroke}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            {/* IEC Limit Switch roller actuator */}
            <line
              x1={-20}
              y1={0}
              x2={closedNow ? -1 : -7}
              y2={0}
              stroke={mutedInk}
              strokeWidth={1.5}
              strokeDasharray="3 2"
            />
            <circle
              cx={-22}
              cy={0}
              r={4.5}
              fill={isLatched ? '#1D4ED8' : surfaceBg}
              stroke={isLatched ? '#1D4ED8' : ink}
              strokeWidth={2}
            />
            <text x={8} y={-22} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              13
            </text>
            <text x={8} y={30} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              14
            </text>
            <g transform="translate(14, 4)">
              <text
                transform={labelTransform}
                fill={isLatched ? '#1D4ED8' : ink}
                fontSize={11.5}
                fontWeight={700}
                className="font-mono-tech select-none"
              >
                {component.label}
              </text>
            </g>
          </g>
        );
      }

      case 'limit_nc': {
        const closedNow = isSimulating ? isClosed : true;
        const stroke = isSimulating && !closedNow ? '#D97706' : ink;
        return (
          <g>
            <line x1={0} y1={-40} x2={0} y2={-16} stroke={ink} strokeWidth={2.2} />
            <line x1={0} y1={-16} x2={9} y2={-16} stroke={ink} strokeWidth={2.2} />
            <line x1={0} y1={16} x2={0} y2={40} stroke={ink} strokeWidth={2.2} />
            <circle cx={0} cy={16} r={2.3} fill={ink} />
            <line
              x1={0}
              y1={16}
              x2={closedNow ? 6 : 16}
              y2={-18}
              stroke={stroke}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <line
              x1={-18}
              y1={0}
              x2={closedNow ? 2 : 7}
              y2={0}
              stroke={mutedInk}
              strokeWidth={1.5}
              strokeDasharray="3 2"
            />
            <circle
              cx={-20}
              cy={0}
              r={4.5}
              fill={isLatched ? '#DC2626' : surfaceBg}
              stroke={isLatched ? '#DC2626' : ink}
              strokeWidth={2}
            />
            <text x={11} y={-22} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              11
            </text>
            <text x={11} y={30} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              12
            </text>
            <g transform="translate(16, 4)">
              <text
                transform={labelTransform}
                fill={isLatched ? '#DC2626' : ink}
                fontSize={11.5}
                fontWeight={700}
                className="font-mono-tech select-none"
              >
                {component.label}
              </text>
            </g>
          </g>
        );
      }

      case 'coil_contactor': {
        const boxFill = isEnergized
          ? isDark
            ? '#7F1D1D'
            : '#FEE2E2'
          : surfaceBg;
        const boxStroke = isEnergized ? activeStroke : ink;
        return (
          <g>
            <line x1={0} y1={-40} x2={0} y2={-16} stroke={boxStroke} strokeWidth={2.2} />
            <line x1={0} y1={16} x2={0} y2={40} stroke={isEnergized ? '#2563EB' : ink} strokeWidth={2.2} />
            <rect
              x={-24}
              y={-16}
              width={48}
              height={32}
              rx={3}
              fill={boxFill}
              stroke={boxStroke}
              strokeWidth={2.2}
            />
            <g transform={labelTransform}>
              <text
                x={0}
                y={4}
                textAnchor="middle"
                fill={isEnergized ? (isDark ? '#FCA5A5' : '#B91C1C') : ink}
                fontSize={13}
                fontWeight={700}
                className="font-mono-tech select-none"
              >
                {component.label}
              </text>
            </g>
            <text x={8} y={-22} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              A1
            </text>
            <text x={8} y={31} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              A2
            </text>
          </g>
        );
      }

      case 'contact_no': {
        const closedNow = isSimulating ? isClosed : false;
        const stroke = closedNow ? activeStroke : ink;
        return (
          <g>
            <line x1={0} y1={-40} x2={0} y2={-16} stroke={ink} strokeWidth={2.2} />
            <line x1={0} y1={16} x2={0} y2={40} stroke={ink} strokeWidth={2.2} />
            <circle cx={0} cy={-16} r={2.3} fill={ink} />
            <circle cx={0} cy={16} r={2.3} fill={ink} />
            <line
              x1={0}
              y1={16}
              x2={closedNow ? 0 : -12}
              y2={-15}
              stroke={stroke}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <text x={8} y={-22} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              13
            </text>
            <text x={8} y={30} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              14
            </text>
            <g transform="translate(13, 4)">
              <text
                transform={labelTransform}
                fill={closedNow ? activeStroke : ink}
                fontSize={12}
                fontWeight={700}
                className="font-mono-tech select-none"
              >
                {component.label}
              </text>
            </g>
          </g>
        );
      }

      case 'contact_nc': {
        const closedNow = isSimulating ? isClosed : true;
        const stroke = isSimulating && !closedNow ? '#D97706' : ink;
        return (
          <g>
            <line x1={0} y1={-40} x2={0} y2={-16} stroke={ink} strokeWidth={2.2} />
            <line x1={0} y1={-16} x2={9} y2={-16} stroke={ink} strokeWidth={2.2} />
            <line x1={0} y1={16} x2={0} y2={40} stroke={ink} strokeWidth={2.2} />
            <circle cx={0} cy={16} r={2.3} fill={ink} />
            <line
              x1={0}
              y1={16}
              x2={closedNow ? 6 : 16}
              y2={-18}
              stroke={stroke}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <text x={11} y={-22} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              11
            </text>
            <text x={11} y={30} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              12
            </text>
            <g transform="translate(15, 4)">
              <text
                transform={labelTransform}
                fill={ink}
                fontSize={12}
                fontWeight={700}
                className="font-mono-tech select-none"
              >
                {component.label}
              </text>
            </g>
          </g>
        );
      }

      case 'contact_power_3p': {
        const closedNow = isSimulating ? isClosed : false;
        const poles = [
          { x: -40, top: '1', bot: '2' },
          { x: 0, top: '3', bot: '4' },
          { x: 40, top: '5', bot: '6' },
        ];
        return (
          <g>
            <line
              x1={-46}
              y1={0}
              x2={40}
              y2={0}
              stroke={mutedInk}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            {poles.map((p) => (
              <g key={p.top} transform={`translate(${p.x}, 0)`}>
                <line x1={0} y1={-40} x2={0} y2={-16} stroke={ink} strokeWidth={2.2} />
                <line x1={0} y1={16} x2={0} y2={40} stroke={ink} strokeWidth={2.2} />
                <circle cx={0} cy={-16} r={2.3} fill={ink} />
                <circle cx={0} cy={16} r={2.3} fill={ink} />
                <line
                  x1={0}
                  y1={16}
                  x2={closedNow ? 0 : -11}
                  y2={-15}
                  stroke={closedNow ? activeStroke : ink}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                />
                <text x={6} y={-22} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
                  {p.top}
                </text>
                <text x={6} y={30} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
                  {p.bot}
                </text>
              </g>
            ))}
            <g transform="translate(-54, 4)">
              <text
                textAnchor="end"
                transform={labelTransform}
                fill={closedNow ? activeStroke : ink}
                fontSize={12}
                fontWeight={700}
                className="font-mono-tech select-none"
              >
                {component.label}
              </text>
            </g>
          </g>
        );
      }

      case 'coil_timer_on':
      case 'coil_timer_off': {
        const isOffDelay = component.type === 'coil_timer_off';
        const delay = component.delaySeconds ?? 3;
        const isCounting = Boolean(isSimulating && timerState?.counting);
        const isActive = Boolean(isSimulating && timerState?.active);
        const boxFill = isActive && !isCounting
          ? isDark
            ? '#064E3B'
            : '#DCFCE7'
          : isCounting
            ? isDark
              ? '#78350F'
              : '#FEF3C7'
            : surfaceBg;
        const boxStroke = isActive && !isCounting ? '#16A34A' : isCounting ? '#D97706' : ink;
        const timeText =
          isSimulating && timerState
            ? `${timerState.remaining.toFixed(1)}s`
            : `${delay.toFixed(0)}s`;

        return (
          <g>
            <line x1={0} y1={-40} x2={0} y2={-16} stroke={boxStroke} strokeWidth={2.2} />
            <line x1={0} y1={16} x2={0} y2={40} stroke={isEnergized ? '#2563EB' : ink} strokeWidth={2.2} />
            <rect
              x={-28}
              y={-16}
              width={56}
              height={32}
              rx={3}
              fill={boxFill}
              stroke={boxStroke}
              strokeWidth={2.2}
            />

            {/* IEC On-Delay = X compartment; IEC Off-Delay = Solid filled left compartment */}
            <line x1={-12} y1={-16} x2={-12} y2={16} stroke={boxStroke} strokeWidth={1.8} />
            {isOffDelay ? (
              <rect
                x={-28}
                y={-16}
                width={16}
                height={32}
                rx={2}
                fill={boxStroke}
              />
            ) : (
              <g>
                <line x1={-28} y1={-16} x2={-12} y2={16} stroke={boxStroke} strokeWidth={1.5} />
                <line x1={-12} y1={-16} x2={-28} y2={16} stroke={boxStroke} strokeWidth={1.5} />
              </g>
            )}

            <g transform="translate(8, 0)">
              <text
                x={0}
                y={4}
                textAnchor="middle"
                transform={labelTransform}
                fill={
                  isActive && !isCounting
                    ? isDark
                      ? '#86EFAC'
                      : '#15803D'
                    : isCounting
                      ? isDark
                        ? '#FDE68A'
                        : '#B45309'
                      : ink
                }
                fontSize={12}
                fontWeight={700}
                className="font-mono-tech select-none"
              >
                {component.label}
              </text>
            </g>

            {/* Live countdown display right next to timer symbol */}
            <g transform="translate(34, 0)">
              <g transform={labelTransform}>
                <rect
                  x={0}
                  y={-11}
                  width={40}
                  height={22}
                  rx={4}
                  fill={
                    isActive && !isCounting
                      ? isDark
                        ? '#065F46'
                        : '#DCFCE7'
                      : isCounting
                        ? isDark
                          ? '#92400E'
                          : '#FEF3C7'
                        : isDark
                          ? '#1E293B'
                          : '#F1F5F9'
                  }
                  stroke={isActive && !isCounting ? '#16A34A' : isCounting ? '#D97706' : isDark ? '#334155' : '#CBD5E1'}
                  strokeWidth={1.2}
                />
                <text
                  x={20}
                  y={4}
                  textAnchor="middle"
                  fill={
                    isActive && !isCounting
                      ? isDark
                        ? '#86EFAC'
                        : '#15803D'
                      : isCounting
                        ? isDark
                          ? '#FDE68A'
                          : '#92400E'
                        : mutedInk
                  }
                  fontSize={10}
                  fontWeight={700}
                  className="font-mono-tech select-none"
                >
                  {timeText}
                </text>
              </g>
            </g>

            <text x={8} y={-22} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              A1
            </text>
            <text x={8} y={31} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              A2
            </text>
          </g>
        );
      }

      case 'contact_timer_no':
      case 'contact_timer_off_no': {
        const isOffDelay = component.type === 'contact_timer_off_no';
        const closedNow = isSimulating ? isClosed : false;
        const stroke = closedNow ? activeStroke : ink;
        return (
          <g>
            <line x1={0} y1={-40} x2={0} y2={-16} stroke={ink} strokeWidth={2.2} />
            <line x1={0} y1={16} x2={0} y2={40} stroke={ink} strokeWidth={2.2} />
            <circle cx={0} cy={-16} r={2.3} fill={ink} />
            <circle cx={0} cy={16} r={2.3} fill={ink} />
            <line
              x1={0}
              y1={16}
              x2={closedNow ? 0 : -12}
              y2={-15}
              stroke={stroke}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <line x1={-19} y1={0} x2={closedNow ? -2 : -7} y2={0} stroke={mutedInk} strokeWidth={1.5} />
            {/* On-Delay umbrella opens right; Off-Delay umbrella opens left */}
            <path
              d={isOffDelay ? 'M -23 -9 A 9 9 0 0 1 -23 9' : 'M -17 -9 A 9 9 0 0 0 -17 9'}
              fill="none"
              stroke={closedNow ? activeStroke : ink}
              strokeWidth={2}
            />
            <text x={8} y={-22} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              {isOffDelay ? '57' : '17'}
            </text>
            <text x={8} y={30} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              {isOffDelay ? '58' : '18'}
            </text>
            <g transform="translate(13, 4)">
              <text
                transform={labelTransform}
                fill={closedNow ? activeStroke : ink}
                fontSize={12}
                fontWeight={700}
                className="font-mono-tech select-none"
              >
                {component.label}
              </text>
            </g>
          </g>
        );
      }

      case 'contact_timer_nc':
      case 'contact_timer_off_nc': {
        const isOffDelay = component.type === 'contact_timer_off_nc';
        const closedNow = isSimulating ? isClosed : true;
        const stroke = isSimulating && !closedNow ? '#D97706' : ink;
        return (
          <g>
            <line x1={0} y1={-40} x2={0} y2={-16} stroke={ink} strokeWidth={2.2} />
            <line x1={0} y1={-16} x2={9} y2={-16} stroke={ink} strokeWidth={2.2} />
            <line x1={0} y1={16} x2={0} y2={40} stroke={ink} strokeWidth={2.2} />
            <circle cx={0} cy={16} r={2.3} fill={ink} />
            <line
              x1={0}
              y1={16}
              x2={closedNow ? 6 : 16}
              y2={-18}
              stroke={stroke}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <line x1={-16} y1={0} x2={closedNow ? 2 : 7} y2={0} stroke={mutedInk} strokeWidth={1.5} />
            <path
              d={isOffDelay ? 'M -20 -9 A 9 9 0 0 1 -20 9' : 'M -14 -9 A 9 9 0 0 0 -14 9'}
              fill="none"
              stroke={ink}
              strokeWidth={2}
            />
            <text x={11} y={-22} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              {isOffDelay ? '65' : '15'}
            </text>
            <text x={11} y={30} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              {isOffDelay ? '66' : '16'}
            </text>
            <g transform="translate(16, 4)">
              <text
                transform={labelTransform}
                fill={ink}
                fontSize={12}
                fontWeight={700}
                className="font-mono-tech select-none"
              >
                {component.label}
              </text>
            </g>
          </g>
        );
      }

      case 'lamp': {
        const colorKey: LampColor = component.lampColor ?? 'green';
        const palette = LAMP_COLORS[colorKey];
        const circleFill = isLit ? palette.litFill : surfaceBg;
        const circleStroke = isLit ? palette.litStroke : ink;
        return (
          <g>
            <line x1={0} y1={-40} x2={0} y2={-16} stroke={ink} strokeWidth={2.2} />
            <line x1={0} y1={16} x2={0} y2={40} stroke={ink} strokeWidth={2.2} />
            {isLit && <circle cx={0} cy={0} r={24} fill={palette.glow} />}
            <circle
              cx={0}
              cy={0}
              r={16}
              fill={circleFill}
              stroke={circleStroke}
              strokeWidth={2.2}
            />
            <line x1={-11} y1={-11} x2={11} y2={11} stroke={isLit ? '#FFFFFF' : ink} strokeWidth={2} />
            <line x1={11} y1={-11} x2={-11} y2={11} stroke={isLit ? '#FFFFFF' : ink} strokeWidth={2} />
            <text x={8} y={-22} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              X1
            </text>
            <text x={8} y={31} fill={mutedInk} fontSize={9} className="font-mono-tech select-none">
              X2
            </text>
            <g transform="translate(22, 4)">
              <text
                transform={labelTransform}
                fill={ink}
                fontSize={12}
                fontWeight={700}
                className="font-mono-tech select-none"
              >
                {component.label}
              </text>
            </g>
          </g>
        );
      }

      case 'motor_3ph':
      case 'motor_3ph_6pin': {
        const is6Pin = component.type === 'motor_3ph_6pin';
        const badge = isSimulating ? getMotorBadge(motorStatus) : null;
        const ringColor = badge ? badge.color : ink;
        const motorFill = badge
          ? isDark
            ? badge.darkFill
            : badge.lightFill
          : surfaceBg;
        const cy = is6Pin ? 0 : 4;
        const radius = is6Pin ? 28 : 32;

        return (
          <g>
            {/* Top U/V/W or U1/V1/W1 leads */}
            <line x1={-40} y1={-40} x2={-20} y2={cy - 18} stroke={ink} strokeWidth={2.2} />
            <line x1={0} y1={-40} x2={0} y2={cy - radius} stroke={ink} strokeWidth={2.2} />
            <line x1={40} y1={-40} x2={20} y2={cy - 18} stroke={ink} strokeWidth={2.2} />

            <text x={-48} y={-28} fill={mutedInk} fontSize={8.5} fontWeight={600} className="font-mono-tech select-none">
              {is6Pin ? 'U1' : 'U'}
            </text>
            <text x={5} y={-31} fill={mutedInk} fontSize={8.5} fontWeight={600} className="font-mono-tech select-none">
              {is6Pin ? 'V1' : 'V'}
            </text>
            <text x={44} y={-28} fill={mutedInk} fontSize={8.5} fontWeight={600} className="font-mono-tech select-none">
              {is6Pin ? 'W1' : 'W'}
            </text>

            {/* Bottom W2/U2/V2 leads for 6-pin Star/Delta motor */}
            {is6Pin && (
              <g>
                <line x1={-40} y1={40} x2={-20} y2={cy + 18} stroke={ink} strokeWidth={2.2} />
                <line x1={0} y1={40} x2={0} y2={cy + radius} stroke={ink} strokeWidth={2.2} />
                <line x1={40} y1={40} x2={20} y2={cy + 18} stroke={ink} strokeWidth={2.2} />

                <text x={-48} y={35} fill={mutedInk} fontSize={8.5} fontWeight={600} className="font-mono-tech select-none">
                  W2
                </text>
                <text x={5} y={37} fill={mutedInk} fontSize={8.5} fontWeight={600} className="font-mono-tech select-none">
                  U2
                </text>
                <text x={44} y={35} fill={mutedInk} fontSize={8.5} fontWeight={600} className="font-mono-tech select-none">
                  V2
                </text>
              </g>
            )}

            {/* Stator Circle */}
            <circle
              cx={0}
              cy={cy}
              r={radius}
              fill={motorFill}
              stroke={ringColor}
              strokeWidth={2.6}
            />

            {/* Strictly centered animated rotor ring */}
            {badge?.running && (
              <g transform={`translate(0, ${cy})`}>
                <g className={badge.clockwise ? 'animate-rotor-cw' : 'animate-rotor-ccw'}>
                  <circle
                    cx={0}
                    cy={0}
                    r={radius - 6}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth={2}
                    strokeDasharray="7 5"
                    opacity={0.85}
                  />
                  <circle cx={0} cy={-(radius - 6)} r={2.8} fill={ringColor} />
                  <circle cx={radius - 6} cy={0} r={2.8} fill={ringColor} />
                  <circle cx={0} cy={radius - 6} r={2.8} fill={ringColor} />
                  <circle cx={-(radius - 6)} cy={0} r={2.8} fill={ringColor} />
                </g>
              </g>
            )}

            {/* Center M 3~ text (upright on rotation) */}
            <g transform={`translate(0, ${cy})`}>
              <g transform={labelTransform}>
                <text
                  x={0}
                  y={1}
                  textAnchor="middle"
                  fill={ringColor}
                  fontSize={is6Pin ? 14 : 16}
                  fontWeight={700}
                  className="font-mono-tech select-none"
                >
                  M
                </text>
                <text
                  x={0}
                  y={13}
                  textAnchor="middle"
                  fill={mutedInk}
                  fontSize={9.5}
                  fontWeight={600}
                  className="font-mono-tech select-none"
                >
                  3~
                </text>
              </g>
            </g>

            {/* Motor label */}
            <g transform={`translate(${is6Pin ? -44 : -44}, ${is6Pin && badge ? cy - 11 : cy + 4})`}>
              <text
                textAnchor="end"
                transform={labelTransform}
                fill={ink}
                fontSize={12}
                fontWeight={700}
                className="font-mono-tech select-none"
              >
                {component.label}
              </text>
            </g>

            {/* Live state badge */}
            {badge && (
              <g transform={`translate(${is6Pin ? -92 : 0}, ${is6Pin ? 8 : 50})`}>
                <rect
                  x={-46}
                  y={-10}
                  width={92}
                  height={20}
                  rx={4}
                  fill={isDark ? badge.badgeBgDark : badge.badgeBgLight}
                  stroke={badge.color}
                  strokeWidth={1.2}
                />
                <text
                  x={0}
                  y={4}
                  textAnchor="middle"
                  fill={isDark ? badge.badgeTextDark : badge.badgeTextLight}
                  fontSize={9.5}
                  fontWeight={700}
                  className="font-mono-tech select-none"
                >
                  {badge.text}
                </text>
              </g>
            )}
          </g>
        );
      }
    }
  };

  const isWide =
    component.type === 'contact_power_3p' ||
    component.type === 'motor_3ph' ||
    component.type === 'motor_3ph_6pin' ||
    component.type === 'power_3ph';

  return (
    <g>
      {isSelected && (
        <rect
          x={isWide ? -60 : component.type === 'btn_dual' ? -44 : -34}
          y={component.type === 'power_3ph' ? -22 : -44}
          width={isWide ? 120 : component.type === 'btn_dual' ? 88 : 68}
          height={component.type === 'power_3ph' ? 44 : 88}
          rx={8}
          fill={isDark ? 'rgba(59, 130, 246, 0.14)' : 'rgba(29, 78, 216, 0.08)'}
          stroke="#2563EB"
          strokeWidth={1.6}
          strokeDasharray="4 3"
        />
      )}
      {renderBody()}
    </g>
  );
}

/**
 * Compact static IEC symbol preview for the Bottom Sheet component library.
 */
export function ComponentIconPreview({
  type,
  isDark,
}: {
  type: ComponentType;
  isDark: boolean;
}) {
  const previewComp: CircuitComponent = {
    id: `preview-${type}`,
    type,
    x: 0,
    y: 0,
    rotation: 0,
    label:
      type === 'coil_contactor'
        ? 'K'
        : type === 'coil_timer_on'
          ? 'T'
          : type === 'coil_timer_off'
            ? 'TZ'
            : '',
    delaySeconds: 3,
    lampColor: 'green',
  };

  const viewBox =
    type === 'contact_power_3p' || type === 'motor_3ph' || type === 'motor_3ph_6pin'
      ? '-64 -48 128 96'
      : type === 'power_3ph'
        ? '-64 -26 128 52'
        : type === 'btn_dual'
          ? '-48 -46 96 92'
          : type === 'power_l1' || type === 'power_l2' || type === 'power_l3' || type === 'power_n'
            ? '-26 -24 52 48'
            : '-36 -46 72 92';

  return (
    <svg
      viewBox={viewBox}
      className="w-11 h-11 overflow-visible pointer-events-none"
      aria-hidden="true"
    >
      <ComponentSymbol
        component={previewComp}
        isDark={isDark}
        isSimulating={false}
        isSelected={false}
        isEnergized={false}
        isClosed={false}
        isLit={false}
        isFault={false}
      />
    </svg>
  );
}
