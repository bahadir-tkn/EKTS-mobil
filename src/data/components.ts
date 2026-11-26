import type {
  CircuitComponent,
  ComponentCategory,
  ComponentDefinition,
  ComponentType,
  PinDirection,
  Point,
  Rotation,
} from '../types/circuit';

export const GRID_SIZE = 20;

export interface CategoryMeta {
  id: ComponentCategory;
  label: string;
}

export const COMPONENT_CATEGORIES: CategoryMeta[] = [
  { id: 'power', label: 'Güç' },
  { id: 'buttons', label: 'Butonlar' },
  { id: 'contactors', label: 'Kontaktör' },
  { id: 'timers', label: 'Zamanlayıcı' },
  { id: 'loads', label: 'Yükler' },
  { id: 'protection', label: 'Koruma' },
];

export const COMPONENT_DEFINITIONS: Record<ComponentType, ComponentDefinition> = {
  power_l1: {
    type: 'power_l1',
    name: 'Faz R (L1)',
    shortName: 'R / L1',
    category: 'power',
    defaultLabelPrefix: 'L1',
    editableLabel: false,
    halfWidth: 22,
    halfHeight: 20,
    pins: [{ id: 'out', label: 'L1', dx: 0, dy: 20, dir: 'down' }],
  },
  power_l2: {
    type: 'power_l2',
    name: 'Faz S (L2)',
    shortName: 'S / L2',
    category: 'power',
    defaultLabelPrefix: 'L2',
    editableLabel: false,
    halfWidth: 22,
    halfHeight: 20,
    pins: [{ id: 'out', label: 'L2', dx: 0, dy: 20, dir: 'down' }],
  },
  power_l3: {
    type: 'power_l3',
    name: 'Faz T (L3)',
    shortName: 'T / L3',
    category: 'power',
    defaultLabelPrefix: 'L3',
    editableLabel: false,
    halfWidth: 22,
    halfHeight: 20,
    pins: [{ id: 'out', label: 'L3', dx: 0, dy: 20, dir: 'down' }],
  },
  power_n: {
    type: 'power_n',
    name: 'Nötr (N / Mp)',
    shortName: 'N / Mp',
    category: 'power',
    defaultLabelPrefix: 'N',
    editableLabel: false,
    halfWidth: 22,
    halfHeight: 20,
    pins: [{ id: 'out', label: 'N', dx: 0, dy: -20, dir: 'up' }],
  },
  power_3ph: {
    type: 'power_3ph',
    name: '3 Faz Hat (R-S-T)',
    shortName: '3 Faz',
    category: 'power',
    defaultLabelPrefix: 'RST',
    editableLabel: false,
    halfWidth: 56,
    halfHeight: 20,
    pins: [
      { id: 'L1', label: 'L1', dx: -40, dy: 20, dir: 'down' },
      { id: 'L2', label: 'L2', dx: 0, dy: 20, dir: 'down' },
      { id: 'L3', label: 'L3', dx: 40, dy: 20, dir: 'down' },
    ],
  },

  btn_start: {
    type: 'btn_start',
    name: 'Start Butonu (NO)',
    shortName: 'Start NO',
    category: 'buttons',
    defaultLabelPrefix: 'S',
    editableLabel: true,
    halfWidth: 28,
    halfHeight: 40,
    pins: [
      { id: '13', label: '13', dx: 0, dy: -40, dir: 'up' },
      { id: '14', label: '14', dx: 0, dy: 40, dir: 'down' },
    ],
  },
  btn_stop: {
    type: 'btn_stop',
    name: 'Stop Butonu (NC)',
    shortName: 'Stop NC',
    category: 'buttons',
    defaultLabelPrefix: 'S',
    editableLabel: true,
    halfWidth: 28,
    halfHeight: 40,
    pins: [
      { id: '11', label: '11', dx: 0, dy: -40, dir: 'up' },
      { id: '12', label: '12', dx: 0, dy: 40, dir: 'down' },
    ],
  },
  btn_dual: {
    type: 'btn_dual',
    name: 'Çift Yollu Buton (NC+NO)',
    shortName: 'Çift Yollu',
    category: 'buttons',
    defaultLabelPrefix: 'S',
    editableLabel: true,
    halfWidth: 42,
    halfHeight: 40,
    pins: [
      { id: '11', label: '11', dx: -20, dy: -40, dir: 'up' },
      { id: '12', label: '12', dx: -20, dy: 40, dir: 'down' },
      { id: '23', label: '23', dx: 20, dy: -40, dir: 'up' },
      { id: '24', label: '24', dx: 20, dy: 40, dir: 'down' },
    ],
  },
  switch_toggle: {
    type: 'switch_toggle',
    name: 'Kalıcı Anahtar (NO)',
    shortName: 'Anahtar',
    category: 'buttons',
    defaultLabelPrefix: 'SW',
    editableLabel: true,
    halfWidth: 28,
    halfHeight: 40,
    pins: [
      { id: '13', label: '13', dx: 0, dy: -40, dir: 'up' },
      { id: '14', label: '14', dx: 0, dy: 40, dir: 'down' },
    ],
  },
  btn_estop: {
    type: 'btn_estop',
    name: 'Acil Stop (Kilitli NC)',
    shortName: 'Acil Stop',
    category: 'buttons',
    defaultLabelPrefix: 'ES',
    editableLabel: true,
    halfWidth: 30,
    halfHeight: 40,
    pins: [
      { id: '11', label: '11', dx: 0, dy: -40, dir: 'up' },
      { id: '12', label: '12', dx: 0, dy: 40, dir: 'down' },
    ],
  },
  limit_no: {
    type: 'limit_no',
    name: 'Sınır Anahtarı (NO)',
    shortName: 'Sınır NO',
    category: 'buttons',
    defaultLabelPrefix: 'SA',
    editableLabel: true,
    halfWidth: 28,
    halfHeight: 40,
    pins: [
      { id: '13', label: '13', dx: 0, dy: -40, dir: 'up' },
      { id: '14', label: '14', dx: 0, dy: 40, dir: 'down' },
    ],
  },
  limit_nc: {
    type: 'limit_nc',
    name: 'Sınır Anahtarı (NC)',
    shortName: 'Sınır NC',
    category: 'buttons',
    defaultLabelPrefix: 'SA',
    editableLabel: true,
    halfWidth: 28,
    halfHeight: 40,
    pins: [
      { id: '11', label: '11', dx: 0, dy: -40, dir: 'up' },
      { id: '12', label: '12', dx: 0, dy: 40, dir: 'down' },
    ],
  },

  coil_contactor: {
    type: 'coil_contactor',
    name: 'Kontaktör Bobini',
    shortName: 'Bobin',
    category: 'contactors',
    defaultLabelPrefix: 'K',
    editableLabel: true,
    halfWidth: 28,
    halfHeight: 40,
    pins: [
      { id: 'A1', label: 'A1', dx: 0, dy: -40, dir: 'up' },
      { id: 'A2', label: 'A2', dx: 0, dy: 40, dir: 'down' },
    ],
  },
  contact_no: {
    type: 'contact_no',
    name: 'Açık Kontak (NO)',
    shortName: 'Kontak NO',
    category: 'contactors',
    defaultLabelPrefix: 'K',
    editableLabel: true,
    halfWidth: 24,
    halfHeight: 40,
    pins: [
      { id: '13', label: '13', dx: 0, dy: -40, dir: 'up' },
      { id: '14', label: '14', dx: 0, dy: 40, dir: 'down' },
    ],
  },
  contact_nc: {
    type: 'contact_nc',
    name: 'Kapalı Kontak (NC)',
    shortName: 'Kontak NC',
    category: 'contactors',
    defaultLabelPrefix: 'K',
    editableLabel: true,
    halfWidth: 24,
    halfHeight: 40,
    pins: [
      { id: '11', label: '11', dx: 0, dy: -40, dir: 'up' },
      { id: '12', label: '12', dx: 0, dy: 40, dir: 'down' },
    ],
  },
  contact_power_3p: {
    type: 'contact_power_3p',
    name: "3'lü Güç Kontağı",
    shortName: '3P Güç',
    category: 'contactors',
    defaultLabelPrefix: 'K',
    editableLabel: true,
    halfWidth: 56,
    halfHeight: 40,
    pins: [
      { id: '1', label: '1', dx: -40, dy: -40, dir: 'up' },
      { id: '3', label: '3', dx: 0, dy: -40, dir: 'up' },
      { id: '5', label: '5', dx: 40, dy: -40, dir: 'up' },
      { id: '2', label: '2', dx: -40, dy: 40, dir: 'down' },
      { id: '4', label: '4', dx: 0, dy: 40, dir: 'down' },
      { id: '6', label: '6', dx: 40, dy: 40, dir: 'down' },
    ],
  },

  coil_timer_on: {
    type: 'coil_timer_on',
    name: 'Düz Zaman Rölesi',
    shortName: 'Düz ZR',
    category: 'timers',
    defaultLabelPrefix: 'T',
    editableLabel: true,
    defaultDelaySeconds: 3,
    halfWidth: 32,
    halfHeight: 40,
    pins: [
      { id: 'A1', label: 'A1', dx: 0, dy: -40, dir: 'up' },
      { id: 'A2', label: 'A2', dx: 0, dy: 40, dir: 'down' },
    ],
  },
  contact_timer_no: {
    type: 'contact_timer_no',
    name: 'Düz ZR Açık (NO)',
    shortName: 'Düz ZR NO',
    category: 'timers',
    defaultLabelPrefix: 'T',
    editableLabel: true,
    halfWidth: 28,
    halfHeight: 40,
    pins: [
      { id: '17', label: '17', dx: 0, dy: -40, dir: 'up' },
      { id: '18', label: '18', dx: 0, dy: 40, dir: 'down' },
    ],
  },
  contact_timer_nc: {
    type: 'contact_timer_nc',
    name: 'Düz ZR Kapalı (NC)',
    shortName: 'Düz ZR NC',
    category: 'timers',
    defaultLabelPrefix: 'T',
    editableLabel: true,
    halfWidth: 28,
    halfHeight: 40,
    pins: [
      { id: '15', label: '15', dx: 0, dy: -40, dir: 'up' },
      { id: '16', label: '16', dx: 0, dy: 40, dir: 'down' },
    ],
  },
  coil_timer_off: {
    type: 'coil_timer_off',
    name: 'Ters Zaman Rölesi',
    shortName: 'Ters ZR',
    category: 'timers',
    defaultLabelPrefix: 'TZ',
    editableLabel: true,
    defaultDelaySeconds: 3,
    halfWidth: 32,
    halfHeight: 40,
    pins: [
      { id: 'A1', label: 'A1', dx: 0, dy: -40, dir: 'up' },
      { id: 'A2', label: 'A2', dx: 0, dy: 40, dir: 'down' },
    ],
  },
  contact_timer_off_no: {
    type: 'contact_timer_off_no',
    name: 'Ters ZR Açık (NO)',
    shortName: 'Ters ZR NO',
    category: 'timers',
    defaultLabelPrefix: 'TZ',
    editableLabel: true,
    halfWidth: 28,
    halfHeight: 40,
    pins: [
      { id: '57', label: '57', dx: 0, dy: -40, dir: 'up' },
      { id: '58', label: '58', dx: 0, dy: 40, dir: 'down' },
    ],
  },
  contact_timer_off_nc: {
    type: 'contact_timer_off_nc',
    name: 'Ters ZR Kapalı (NC)',
    shortName: 'Ters ZR NC',
    category: 'timers',
    defaultLabelPrefix: 'TZ',
    editableLabel: true,
    halfWidth: 28,
    halfHeight: 40,
    pins: [
      { id: '65', label: '65', dx: 0, dy: -40, dir: 'up' },
      { id: '66', label: '66', dx: 0, dy: 40, dir: 'down' },
    ],
  },

  motor_3ph: {
    type: 'motor_3ph',
    name: '3 Faz Motor (3 Uç)',
    shortName: '3~ Motor',
    category: 'loads',
    defaultLabelPrefix: 'M',
    editableLabel: true,
    halfWidth: 52,
    halfHeight: 44,
    pins: [
      { id: 'U', label: 'U', dx: -40, dy: -40, dir: 'up' },
      { id: 'V', label: 'V', dx: 0, dy: -40, dir: 'up' },
      { id: 'W', label: 'W', dx: 40, dy: -40, dir: 'up' },
    ],
  },
  motor_3ph_6pin: {
    type: 'motor_3ph_6pin',
    name: '3 Faz Motor (Y/Δ 6 Uç)',
    shortName: 'Y/Δ Motor',
    category: 'loads',
    defaultLabelPrefix: 'M',
    editableLabel: true,
    halfWidth: 54,
    halfHeight: 44,
    pins: [
      { id: 'U1', label: 'U1', dx: -40, dy: -40, dir: 'up' },
      { id: 'V1', label: 'V1', dx: 0, dy: -40, dir: 'up' },
      { id: 'W1', label: 'W1', dx: 40, dy: -40, dir: 'up' },
      { id: 'W2', label: 'W2', dx: -40, dy: 40, dir: 'down' },
      { id: 'U2', label: 'U2', dx: 0, dy: 40, dir: 'down' },
      { id: 'V2', label: 'V2', dx: 40, dy: 40, dir: 'down' },
    ],
  },
  lamp: {
    type: 'lamp',
    name: 'Sinyal Lambası',
    shortName: 'Lamba',
    category: 'loads',
    defaultLabelPrefix: 'H',
    editableLabel: true,
    defaultLampColor: 'green',
    halfWidth: 24,
    halfHeight: 40,
    pins: [
      { id: 'X1', label: 'X1', dx: 0, dy: -40, dir: 'up' },
      { id: 'X2', label: 'X2', dx: 0, dy: 40, dir: 'down' },
    ],
  },

  fuse: {
    type: 'fuse',
    name: 'Sigorta',
    shortName: 'Sigorta',
    category: 'protection',
    defaultLabelPrefix: 'F',
    editableLabel: true,
    halfWidth: 20,
    halfHeight: 40,
    pins: [
      { id: '1', label: '1', dx: 0, dy: -40, dir: 'up' },
      { id: '2', label: '2', dx: 0, dy: 40, dir: 'down' },
    ],
  },
  thermal_nc: {
    type: 'thermal_nc',
    name: 'Aşırı Akım Rölesi (Termik)',
    shortName: 'Termik NC',
    category: 'protection',
    defaultLabelPrefix: 'AAR',
    editableLabel: true,
    halfWidth: 28,
    halfHeight: 40,
    pins: [
      { id: '95', label: '95', dx: 0, dy: -40, dir: 'up' },
      { id: '96', label: '96', dx: 0, dy: 40, dir: 'down' },
    ],
  },
};

export const ALL_COMPONENT_DEFS: ComponentDefinition[] = Object.values(COMPONENT_DEFINITIONS);

export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export function rotatePoint(dx: number, dy: number, rotation: Rotation): Point {
  switch (rotation) {
    case 90:
      return { x: -dy, y: dx };
    case 180:
      return { x: -dx, y: -dy };
    case 270:
      return { x: dy, y: -dx };
    default:
      return { x: dx, y: dy };
  }
}

export function rotateDirection(dir: PinDirection, rotation: Rotation): PinDirection {
  const order: PinDirection[] = ['up', 'right', 'down', 'left'];
  const idx = order.indexOf(dir);
  const steps = Math.round(rotation / 90) % 4;
  return order[(idx + steps) % 4];
}

export function getAbsolutePinPosition(
  component: CircuitComponent,
  pinId: string
): { x: number; y: number; dir: PinDirection } | null {
  const def = COMPONENT_DEFINITIONS[component.type];
  if (!def) return null;
  const pin = def.pins.find((p) => p.id === pinId);
  if (!pin) return null;
  const rotated = rotatePoint(pin.dx, pin.dy, component.rotation);
  return {
    x: component.x + rotated.x,
    y: component.y + rotated.y,
    dir: rotateDirection(pin.dir, component.rotation),
  };
}

export function generateNextLabel(
  type: ComponentType,
  existingComponents: CircuitComponent[]
): string {
  const def = COMPONENT_DEFINITIONS[type];
  if (!def.editableLabel) {
    return def.defaultLabelPrefix;
  }

  // Contacts should default to matching an existing coil/timer label if one exists
  if (type === 'contact_no' || type === 'contact_nc' || type === 'contact_power_3p') {
    const firstCoil = existingComponents.find((c) => c.type === 'coil_contactor');
    return firstCoil ? firstCoil.label : 'K1';
  }
  if (type === 'contact_timer_no' || type === 'contact_timer_nc') {
    const firstTimer = existingComponents.find((c) => c.type === 'coil_timer_on');
    return firstTimer ? firstTimer.label : 'T1';
  }
  if (type === 'contact_timer_off_no' || type === 'contact_timer_off_nc') {
    const firstOffTimer = existingComponents.find((c) => c.type === 'coil_timer_off');
    return firstOffTimer ? firstOffTimer.label : 'TZ1';
  }

  const prefix = def.defaultLabelPrefix;
  const used = new Set(existingComponents.map((c) => c.label.trim().toUpperCase()));
  let idx = type === 'btn_stop' ? 0 : 1;
  while (used.has(`${prefix}${idx}`)) {
    idx += 1;
  }
  return `${prefix}${idx}`;
}
