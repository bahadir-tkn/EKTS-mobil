export type Potential = 'L1' | 'L2' | 'L3' | 'N';

export type WirePotentialState = Potential | 'none' | 'short_circuit';

export type Rotation = 0 | 90 | 180 | 270;

export type PinDirection = 'up' | 'down' | 'left' | 'right';

export type LampColor = 'green' | 'red' | 'yellow';

export type ComponentCategory =
  | 'power'
  | 'buttons'
  | 'contactors'
  | 'timers'
  | 'loads'
  | 'protection';

export type ComponentType =
  | 'power_l1'
  | 'power_l2'
  | 'power_l3'
  | 'power_n'
  | 'power_3ph'
  | 'btn_start'
  | 'btn_stop'
  | 'btn_dual'
  | 'switch_toggle'
  | 'btn_estop'
  | 'limit_no'
  | 'limit_nc'
  | 'coil_contactor'
  | 'contact_no'
  | 'contact_nc'
  | 'contact_power_3p'
  | 'coil_timer_on'
  | 'contact_timer_no'
  | 'contact_timer_nc'
  | 'coil_timer_off'
  | 'contact_timer_off_no'
  | 'contact_timer_off_nc'
  | 'motor_3ph'
  | 'motor_3ph_6pin'
  | 'lamp'
  | 'fuse'
  | 'thermal_nc';

export interface PinDefinition {
  id: string;
  label: string;
  dx: number;
  dy: number;
  dir: PinDirection;
}

export interface ComponentDefinition {
  type: ComponentType;
  name: string;
  shortName: string;
  category: ComponentCategory;
  defaultLabelPrefix: string;
  /** Whether user can edit label (power rails usually keep fixed display, others editable) */
  editableLabel: boolean;
  /** Default delay in seconds for timers */
  defaultDelaySeconds?: number;
  /** Default lamp color */
  defaultLampColor?: LampColor;
  /** Bounding box half-extents for selection and hit testing */
  halfWidth: number;
  halfHeight: number;
  pins: PinDefinition[];
}

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  rotation: Rotation;
  label: string;
  delaySeconds?: number;
  lampColor?: LampColor;
}

export interface WireEndpoint {
  componentId: string;
  pinId: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Wire {
  id: string;
  from: WireEndpoint;
  to: WireEndpoint;
  /** Optional explicit orthogonal waypoints for clean textbook layouts */
  waypoints?: Point[];
}

export interface CircuitDocument {
  id: string;
  name: string;
  description?: string;
  components: CircuitComponent[];
  wires: Wire[];
}

export interface UserInteractionState {
  /** Component IDs of momentary buttons currently held down */
  pressedButtons: Record<string, boolean>;
  /** Component IDs of momentary buttons locked in held state (EKTS right-click / mobile lock) */
  lockedButtons?: Record<string, boolean>;
  /** Component IDs of latching switches / E-stop / limit switches currently engaged */
  latchedSwitches: Record<string, boolean>;
  /** Component IDs of fuses or thermal overload relays tripped during testing */
  blownFuses: Record<string, boolean>;
}

export type MotorStatus =
  | 'stopped'
  | 'forward'
  | 'reverse'
  | 'star_forward'
  | 'star_reverse'
  | 'delta_forward'
  | 'delta_reverse'
  | 'phase_missing';

export interface TimerRuntimeState {
  mode: 'on_delay' | 'off_delay';
  energized: boolean;
  /** True while timer contacts are in their switched (active) state */
  active: boolean;
  /** True while countdown is actively ticking */
  counting: boolean;
  elapsed: number;
  remaining: number;
  delaySeconds: number;
  timedOut: boolean;
}

export interface ShortCircuitFault {
  potentials: [Potential, Potential];
  message: string;
  faultWireIds: string[];
  faultComponentIds: string[];
  faultPinKeys: string[];
}

export interface SimulationState {
  /** Potentials present at each pin key ("componentId:pinId") */
  pinPotentials: Record<string, Potential[]>;
  /** Energization state of each wire by wire ID */
  wireStates: Record<string, WirePotentialState>;
  /** Normalized coil labels (e.g. "K1") currently energized */
  energizedCoilLabels: string[];
  /** Individual coil component IDs currently energized */
  energizedCoilIds: string[];
  /** Normalized on-delay timer labels (e.g. "T1") whose delay has elapsed */
  timedOutTimerLabels: string[];
  /** Normalized off-delay timer labels (e.g. "T2") whose contacts are currently switched active */
  activeOffDelayTimerLabels: string[];
  /** Runtime countdown state per timer coil component ID */
  timerStates: Record<string, TimerRuntimeState>;
  /** Component IDs of contacts/switches/fuses that are currently electrically closed */
  closedSwitchIds: string[];
  /** Lit signal lamp component IDs */
  litLampIds: string[];
  /** 3-phase motor statuses by component ID */
  motorStates: Record<string, MotorStatus>;
  /** Non-null if a short circuit halted the simulation */
  shortCircuit: ShortCircuitFault | null;
}

export interface SavedCircuitSlot {
  id: string;
  name: string;
  savedAt: string;
  circuit: CircuitDocument;
}
