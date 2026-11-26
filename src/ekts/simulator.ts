/**
 * Circuit simulator: a faithful port of the run-time logic of the desktop EKTS
 * (frmMain.compile1 / c1* methods and the Elements State setters and timers).
 *
 * The original is event driven: element state changes ask for a rescan; a
 * rescan requested while a scan is running is deferred to a 10 ms timer;
 * relay contacts switch at the start of the next scan; time relays tick every
 * second and motors/systems every 100 ms. This class keeps those mechanics,
 * including their order, and runs them on a virtual clock (`advance(ms)`), so
 * the same circuit behaves the same as on the desktop and can be tested
 * deterministically.
 *
 * Names in comments refer to the original methods so the two can be compared.
 */
import type { EscCircuit } from '../esc/escFile';
import { ELEMENT_DEFS, type ElementType, type Energy } from './elements';

// ---------------------------------------------------------------------------
// Runtime model (CPoint, ModifNode, Elements, Line, Dot)
// ---------------------------------------------------------------------------

type OwnerKind = 'element' | 'line' | 'dot';

class CP {
  connected: CP | null = null; // oConCp
  arrCP: CP[] = []; // internal links to the element's other pins
  mn: Net | null = null;
  way: Way | null = null;
  modif = false;
  constructor(
    readonly ownerKind: OwnerKind,
    readonly owner: ElementRT | LineRT | DotRT,
    readonly energy: Energy,
  ) {}
}

class Net {
  // ModifNode
  alCP: CP[] = [];
  alLine: LineRT[] = [];
}

type WayItem = CP | Net | ElementRT;
type Way = WayItem[];

interface Timer {
  enabled: boolean;
  interval: number;
  due: number;
}

class ElementRT {
  state = 0;
  cps: CP[] = [];
  alElements: ElementRT[] = [];
  modifyWayFlag = false;
  int1 = 0;
  int2 = 0;
  angle = 0;
  mCnt = 0;
  alWay: Way[] = [];
  label2Text: string;
  timer: Timer;
  /** p1..p6 flags of the gate/elevator systems (htSysState). */
  flags: Record<string, boolean> = {};
  /** [position, max, min, step, direction] (htSysVars kapi / asansor). */
  vars: number[] = [];
  readonly stateCount: number;
  constructor(
    readonly index: number,
    readonly type: ElementType,
    public label: string,
    label2: string,
  ) {
    const def = ELEMENT_DEFS[type];
    this.stateCount = def.stateCount;
    this.label2Text = label2;
    const interval =
      type === 'UcFazliMotor' ||
      type === 'UcFazliMotor2' ||
      type === 'BirFazMotor' ||
      type === 'BirFazMotor2' ||
      type === 'Kapi1' ||
      type === 'Kapi2' ||
      type === 'Asansor'
        ? 100
        : 1000;
    this.timer = { enabled: false, interval, due: 0 };
    if (type === 'Kapi1' || type === 'Kapi2') {
      this.flags = { p1: false, p2: false, p3: false };
      this.vars = type === 'Kapi1' ? [20, 130, 20, 5, 0] : [0, 90, 0, 5, 0];
    } else if (type === 'Asansor') {
      this.flags = { p1: false, p2: false, p3: false, p4: false, p5: false, p6: false };
      this.vars = [205, 205, 45, 5, 0];
    }
  }
  get isSystem() {
    return this.type === 'Kapi1' || this.type === 'Kapi2' || this.type === 'Asansor';
  }
}

class LineRT {
  state = 0;
  modifyWay = false;
  cps: [CP, CP];
  constructor(readonly index: number) {
    this.cps = [new CP('line', this, null), new CP('line', this, null)];
  }
  next(cp: CP): CP {
    return cp === this.cps[0] ? this.cps[1] : this.cps[0];
  }
}

class DotRT {
  cps: CP[] = [];
  constructor(readonly index: number) {}
}

/** Thrown to unwind after an error stopped the simulation (the original showed a MessageBox and set State = 0). */
class Halt extends Error {}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SimErrorKey =
  | 'alertError1'
  | 'alertError2'
  | 'alertError3'
  | 'alertError4'
  | 'alertError5'
  | 'alertError6'
  | 'alertError7'
  | 'alertError8'
  | 'alertError9'
  | 'alertError10'
  | 'alertError11'
  | 'alertMotor1'
  | 'loop';

/** Messages exactly as in the original language file (ulng.txt). */
export const SIM_MESSAGES: Record<SimErrorKey, { tr: string; en: string }> = {
  alertError1: { tr: 'Bir kontaga birkac eleman baglanmis.', en: 'This contact have many contactors.' },
  alertError2: {
    tr: 'Bu isim birden fazla kullanılmış. Karışıklığı önlemek için lütfen farklı isim kullanınız.',
    en: 'This label is used twice. Use different labels.',
  },
  alertError3: { tr: 'Bu elemanin rolesi yok', en: 'This contact have no relays.' },
  alertError4: { tr: 'Bu yolda iki röle veya motor bağlı öalışmaz', en: 'Only one Relay or Motor must be connected on this connection.' },
  alertError5: { tr: 'Hata: Bu baglantida kisadevre var!', en: 'This connection have shortcircuit' },
  alertError6: { tr: 'Hata: Bu baglantida kisadevre var!', en: 'Two phases connected to to each other' },
  alertError7: { tr: 'Motora Fazlarin biri gelmiyor.', en: 'Motor hasn’t  one phase' },
  alertError8: { tr: 'Motora Fazlarin ikisi gelmiyor.', en: 'Motor hasn’t two phases' },
  alertError9: { tr: 'Motor yanlis baglanmis.', en: 'Motor connected not correctly' },
  alertError10: { tr: 'Motorun Yardimci sargisi devreden cikartilmadi.', en: 'Motor’s complementary coil ’s not seperated' },
  alertError11: { tr: 'Bu Elemanda hata var.', en: 'This Element have an error' },
  alertMotor1: { tr: 'Motor yandı!', en: 'Motor burned over!' },
  loop: { tr: 'Elemana ulasmadan lineler arasinda kesisme var.', en: 'Wires cross each other before reaching an element.' },
};

export interface SimError {
  key: SimErrorKey;
  elements: number[];
  lines: number[];
}

export interface SimSnapshot {
  running: boolean;
  elementStates: number[];
  angles: number[];
  systems: ({ position: number; flags: Record<string, boolean> } | undefined)[];
  activeLines: boolean[];
  label2Text: (string | undefined)[];
  error: SimError | null;
}

const BUTTON_TYPES: ElementType[] = [
  'StartButon',
  'StopButon',
  'StartStopButon',
  'SinirAnahtar',
  'Startx3',
  'Start3x3',
  'SinirAnahtar2',
];

// ---------------------------------------------------------------------------
// Simulator
// ---------------------------------------------------------------------------

export class Simulator {
  private elements: ElementRT[] = [];
  private lines: LineRT[] = [];
  private dots: DotRT[] = [];

  private mainState = 0; // frmMain.State
  private nets: Net[] = []; // alModifNode
  private alWay: Way[] = [];
  private alChangeContacts: [ElementRT, number][] = [];
  private modifList: CP[] = []; // alModifCP
  private scanning = false;
  private compiling = false;
  private rescan = false;
  private scanTimer: Timer = { enabled: false, interval: 10, due: 0 };
  private now = 0;
  private alertActive = false;

  error: SimError | null = null;
  private listeners = new Set<() => void>();

  constructor(circuit: EscCircuit) {
    this.load(circuit);
  }

  // ---- loading -------------------------------------------------------------

  private load(c: EscCircuit) {
    const all: CP[] = new Array(c.connectionPoints.length);
    this.elements = c.elements.map((e, i) => {
      const el = new ElementRT(i, e.type, e.label, e.label2);
      const n = parseInt(e.label2, 10);
      el.int1 = Number.isFinite(n) ? n : 0;
      el.cps = ELEMENT_DEFS[e.type].pins.map((p) => new CP('element', el, p.energy));
      e.connectionPoints.forEach((idx, k) => (all[idx] = el.cps[k]));
      return el;
    });
    // Links that never change (coils, lamp, motor windings, system supply).
    this.elements.forEach((el) => {
      ELEMENT_DEFS[el.type].fixedLinks.forEach((links, k) => {
        el.cps[k].arrCP = links.map((j) => el.cps[j]);
      });
    });
    this.lines = c.lines.map((l, i) => {
      const line = new LineRT(i);
      all[l.connectionPoints[0]] = line.cps[0];
      all[l.connectionPoints[1]] = line.cps[1];
      return line;
    });
    this.dots = c.dots.map((d, i) => {
      const dot = new DotRT(i);
      dot.cps = d.connectionPoints.map((idx) => {
        const cp = new CP('dot', dot, null);
        all[idx] = cp;
        return cp;
      });
      return dot;
    });
    c.connectionPoints.forEach((p, i) => {
      if (all[i] && p.connectedTo >= 0 && all[p.connectedTo]) all[i].connected = all[p.connectedTo];
    });
    c.elements.forEach((e, i) => {
      this.elements[i].alElements = e.linkedElements.map((j) => this.elements[j]).filter(Boolean);
    });
  }

  // ---- public API ------------------------------------------------------------

  get running() {
    return this.mainState !== 0;
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  /** Çalıştır: frmMain.State = 1. */
  start() {
    this.error = null;
    this.guard(() => this.setMainState(1));
    this.emit();
  }

  /** Durdur: frmMain.State = 0. */
  stop() {
    this.guard(() => this.setMainState(0));
    this.emit();
  }

  clearError() {
    this.error = null;
    this.emit();
  }

  /**
   * Press on an element while running (Elements_MouseDown). `latch` is the
   * original's right click: it toggles a button between pressed and released
   * instead of holding it only while the finger is down.
   */
  pointerDown(index: number, latch = false) {
    const e = this.elements[index];
    if (!e || e.state === 0) return;
    if (e.type !== 'Role' && !BUTTON_TYPES.includes(e.type)) return;
    this.guard(() => {
      if (latch) this.setState(e, e.state === 1 ? 2 : 1);
      else this.setState(e, 2);
    });
    this.emit();
  }

  /** Release (Elements_MouseUp). */
  pointerUp(index: number, latch = false) {
    const e = this.elements[index];
    if (!e || e.state === 0) return;
    this.guard(() => {
      if (BUTTON_TYPES.includes(e.type)) {
        if (!latch) this.setState(e, 1);
      } else if (e.type === 'Role') {
        this.requestScan();
      }
    });
    this.emit();
  }

  /** Runs every timer due within the next `ms` milliseconds of simulated time. */
  advance(ms: number) {
    const end = this.now + ms;
    let changed = false;
    this.guard(() => {
      for (;;) {
        let next = Infinity;
        for (const e of this.elements) if (e.timer.enabled) next = Math.min(next, e.timer.due);
        if (this.scanTimer.enabled) next = Math.min(next, this.scanTimer.due);
        if (next > end) break;
        this.now = next;
        for (const e of this.elements) {
          if (e.timer.enabled && e.timer.due <= this.now) {
            e.timer.due = this.now + e.timer.interval;
            this.timerTick(e);
            changed = true;
          }
        }
        if (this.scanTimer.enabled && this.scanTimer.due <= this.now) {
          this.scanTimer.due = this.now + this.scanTimer.interval;
          if (this.rescan) {
            this.rescan = false;
            this.scanCircuit2();
            changed = true;
          }
        }
      }
    });
    this.now = end;
    if (changed) this.emit();
  }

  snapshot(): SimSnapshot {
    return {
      running: this.running,
      elementStates: this.elements.map((e) => e.state),
      angles: this.elements.map((e) => e.angle),
      systems: this.elements.map((e) => (e.isSystem ? { position: e.vars[0], flags: { ...e.flags } } : undefined)),
      activeLines: this.lines.map((l) => l.state === 2),
      label2Text: this.elements.map((e) => e.label2Text),
      error: this.error,
    };
  }

  private guard(fn: () => void) {
    try {
      fn();
    } catch (e) {
      if (!(e instanceof Halt)) throw e;
    }
  }

  // ---- frmMain.State -------------------------------------------------------

  private setMainState(value: number) {
    if (value > 1) value = 0;
    if (value === this.mainState) return;
    if (value === 0) this.mainState = 0;
    for (const e of this.elements) this.setState(e, value);
    for (const l of this.lines) this.setLineState(l, value);
    if (value !== 0) this.mainState = value;
    if (value === 0) {
      // pnlMain_Run (sic): back to design mode.
      for (const n of this.nets) for (const cp of n.alCP) cp.mn = null;
      this.nets = [];
      this.alWay = [];
      this.alChangeContacts = [];
      this.compiling = false;
      this.scanning = false;
      this.rescan = false;
      this.scanTimer.enabled = false;
      return;
    }
    this.compile1();
  }

  private compile1() {
    if (this.mainState === 0) return;
    this.compiling = true;
    this.grupOlustur();
    this.compiling = false;
    this.enableTimer(this.scanTimer, true);
    this.requestScan();
  }

  /** c1GrupOlustur: build the electrical nodes and check names and contacts. */
  private grupOlustur() {
    if (this.mainState === 0) return;
    const labels: string[] = [];
    this.nets = [];
    this.modifList = [];
    for (const e of this.elements) {
      for (const cp of e.cps) {
        if (!cp.modif) {
          const net = new Net();
          this.nets.push(net);
          this.modify(cp, net);
        }
      }
      switch (e.type) {
        case 'Role':
        case 'ZamanRolesi':
        case 'TersZamanRolesi':
          if (labels.includes(e.label)) this.fail('alertError2', [e.index]);
          labels.push(e.label);
          break;
        case 'AcikKontak':
        case 'KapaliKontak':
        case 'UcAcikKontak':
        case 'UcKapaliKontak':
          if (e.alElements.length === 0) this.fail('alertError3', [e.index]);
          if (e.alElements.length > 1) this.fail('alertError1', [e.index]);
          break;
      }
    }
    this.resetModify();
  }

  /** c1Modify: walk wires and junctions from an element pin, collecting one node. */
  private modify(start: CP, net: Net) {
    let cp = start;
    if (!cp.connected || cp.connected.ownerKind !== 'line') return;
    if (cp.ownerKind === 'element') {
      net.alCP.push(cp);
      cp.mn = net;
    }
    while (cp.connected && cp.connected.ownerKind === 'line') {
      this.markModif(cp);
      cp = cp.connected;
      this.markModif(cp);
      const line = cp.owner as LineRT;
      net.alLine.push(line);
      cp = line.next(cp);
    }
    if (!cp.connected) return; // loose wire end
    if (cp.connected.ownerKind === 'element') {
      this.markModif(cp);
      cp = cp.connected;
      this.markModif(cp);
      net.alCP.push(cp);
      cp.mn = net;
    } else if (cp.connected.ownerKind === 'dot') {
      this.markModif(cp);
      cp = cp.connected;
      this.markModif(cp);
      const dot = cp.owner as DotRT;
      for (const d of dot.cps) {
        if (!d.modif) this.modify(d, net);
        else if (d !== cp) this.fail('loop', [], net.alLine.map((l) => l.index));
      }
    }
  }

  private markModif(cp: CP) {
    this.modifList.push(cp);
    cp.modif = true;
  }

  private resetModify() {
    for (const cp of this.modifList) cp.modif = false;
    this.modifList = [];
  }

  // ---- scanning --------------------------------------------------------------

  /** c1ScanCircuit */
  private requestScan() {
    if (this.mainState === 0) return;
    if (this.scanning || this.compiling) {
      this.rescan = true;
      return;
    }
    this.scanCircuit2();
  }

  /** c1ScanCircuit2 */
  private scanCircuit2() {
    if (this.mainState === 0) return;
    if (this.scanning || this.compiling) {
      this.rescan = true;
      return;
    }
    const changes = this.alChangeContacts;
    this.scanning = true;
    this.alChangeContacts = [];
    for (const [e, s] of changes) this.changeContacts(e, s);

    this.alWay = [];
    for (const net of this.nets) {
      for (const cp of net.alCP) {
        if (cp.energy === 'R' || cp.energy === 'S' || cp.energy === 'T') this.makeWay(cp);
      }
    }
    if (this.mainState === 0) return;

    for (const way of this.alWay) {
      const e = way[way.length - 1] as ElementRT;
      const cp = way[way.length - 2] as CP;
      if (cp.energy === 'M') {
        if (e.type === 'UcFazliMotor2') {
          if (!e.modifyWayFlag && !this.motor3Faz2(e)) return;
        } else if (e.type === 'UcFazliMotor') {
          if (!e.modifyWayFlag && !this.motor3Faz(e)) return;
        } else if (!e.modifyWayFlag && !this.analizeState(e)) return;
      } else if (this.checkWayLoad(way) || !this.activateWay(way)) {
        return;
      }
    }

    for (const e of this.elements) {
      switch (e.type) {
        case 'Role':
        case 'ZamanRolesi':
        case 'TersZamanRolesi':
        case 'Lamba':
        case 'BirFazMotor':
        case 'BirFazMotor2':
          if (e.modifyWayFlag) this.setModifyWay(e, false);
          else this.setState(e, 1);
          continue;
        case 'UcFazliMotor':
          if (e.modifyWayFlag) this.setModifyWay(e, false);
          else if (!this.motor3Faz(e)) return;
          continue;
        case 'UcFazliMotor2':
          if (e.modifyWayFlag) this.setModifyWay(e, false);
          else if (!this.motor3Faz2(e)) return;
          continue;
      }
      if (e.isSystem) {
        if (e.modifyWayFlag) this.setModifyWay(e, false);
        else if (!this.analizeState(e)) return;
      }
    }
    for (const l of this.lines) {
      if (l.modifyWay) l.modifyWay = false;
      else this.setLineState(l, 1);
    }
    this.scanning = false;
  }

  /** c1MakeWay: every path from a phase pin through its node. */
  private makeWay(cp: CP) {
    if (!cp.mn) return;
    const base: Way = [cp.owner as ElementRT, cp, cp.mn];
    for (const item of cp.mn.alCP) {
      if (item !== cp) this.completeWay(base.slice(), item);
    }
  }

  /** c1CompleteWay */
  private completeWay(way: Way, cp: CP) {
    if (way.includes(cp) || (way[1] as CP).energy === cp.energy) return;
    way.push(cp, cp.owner as ElementRT);
    switch (cp.energy) {
      case 'M':
        this.alWay.push(way);
        cp.way = way;
        return;
      case 'R':
      case 'S':
      case 'T':
        this.alertWay(way, 'alertError6');
        return;
      case 'N':
        this.alWay.push(way);
        return;
    }
    for (const out of cp.arrCP) {
      if (!out.mn || way.includes(out.mn)) continue;
      const w2 = way.slice();
      w2.push(out, out.mn);
      for (const item of out.mn.alCP) {
        if (!w2.includes(item) && item !== cp) this.completeWay(w2.slice(), item);
      }
    }
  }

  /** c1MakeWay2: does a path join `cp` to `target`? Found paths go to target's element alWay. */
  private makeWay2(cp: CP, target: CP): boolean {
    let result = false;
    if (cp.mn) {
      const base: Way = [cp.owner as ElementRT, cp, cp.mn];
      for (const item of cp.mn.alCP) {
        if (item !== cp && this.completeWay2(base.slice(), item, target)) result = true;
      }
    }
    return result;
  }

  private completeWay2(way: Way, cp: CP, target: CP): boolean {
    let result = false;
    if (way.includes(cp)) return false;
    if (cp === target) {
      way.push(cp, cp.owner as ElementRT);
      (cp.owner as ElementRT).alWay.push(way);
      return true;
    }
    way.push(cp, cp.owner as ElementRT);
    for (const out of cp.arrCP) {
      if (!out.mn || way.includes(out.mn)) continue;
      const w2 = way.slice();
      w2.push(out, out.mn);
      for (const item of out.mn.alCP) {
        if (!w2.includes(item) && item !== cp && this.completeWay2(w2.slice(), item, target)) result = true;
      }
    }
    return result;
  }

  /** c1CheckWayLoad: returns true (and stops) when the path is a fault. */
  private checkWayLoad(way: Way): boolean {
    let noLoad = true;
    let relays = 0;
    let others = 0;
    for (const item of way) {
      if (!(item instanceof ElementRT)) continue;
      switch (item.type) {
        case 'Role':
        case 'ZamanRolesi':
        case 'TersZamanRolesi':
          noLoad = false;
          relays++;
          break;
        case 'Lamba':
        case 'BirFazMotor':
        case 'BirFazMotor2':
          others++;
          noLoad = false;
          break;
      }
    }
    if (noLoad) {
      this.alertWay(way, 'alertError5');
      return true;
    }
    if (relays > 1 || others > 1) {
      this.alertWay(way, 'alertError4');
      return true;
    }
    return false;
  }

  /** c1ActivateWay: energize the loads and wires along a path. */
  private activateWay(way: Way | null): boolean {
    if (!way) return true;
    let prev: CP | null = null;
    for (let num = 0; num < way.length; num++) {
      const item = way[num];
      if (item instanceof ElementRT) {
        switch (item.type) {
          case 'Role':
          case 'ZamanRolesi':
          case 'TersZamanRolesi':
          case 'Lamba':
            this.setModifyWay(item, true);
            this.setState(item, 2);
            break;
          case 'BirFazMotor':
          case 'BirFazMotor2':
            if (!this.motor1Faz(item, way, num)) return false;
            break;
        }
      } else if (item instanceof CP) {
        if (prev && prev.mn === item.mn) this.showWay(prev, item);
        prev = item;
      }
    }
    return true;
  }

  /** c1ShowWay: light the wires between two pins of the same node. */
  private showWay(cp1: CP, cp2: CP) {
    const all: LineRT[][] = [];
    const first: LineRT[] = [];
    all.push(first);
    this.resetModify();
    this.showWayLoop(all, first, cp1, cp2);
    for (const path of all) {
      for (const l of path) {
        this.setLineState(l, 2);
        l.modifyWay = true;
      }
    }
  }

  private showWayLoop(all: LineRT[][], path: LineRT[], cp1: CP, cp2: CP) {
    while (cp1.connected && cp1.connected.ownerKind === 'line') {
      this.markModif(cp1);
      cp1 = cp1.connected;
      this.markModif(cp1);
      const line = cp1.owner as LineRT;
      path.push(line);
      cp1 = line.next(cp1);
    }
    if (cp1.connected?.ownerKind === 'element') {
      if (cp1.connected === cp2) return;
    } else if (cp1.connected?.ownerKind === 'dot') {
      this.markModif(cp1);
      cp1 = cp1.connected;
      this.markModif(cp1);
      for (const d of (cp1.owner as DotRT).cps) {
        if (!d.modif && d.connected) {
          const p2 = path.slice();
          all.push(p2);
          this.showWayLoop(all, p2, d, cp2);
        }
      }
    }
    const i = all.indexOf(path);
    if (i >= 0) all.splice(i, 1);
  }

  private wayEnergy(cp: CP | undefined): string {
    const e = cp?.energy;
    return e === 'R' || e === 'S' || e === 'T' || e === 'N' ? e : 'X';
  }

  /** c1Motor3FazControl: 0 = no supply, 1 = forward, 2 = reverse, 3 = error. */
  private motor3FazControl(e: ElementRT, cps: CP[]): number {
    let text = '';
    let missing = 0;
    for (const cp of cps) {
      if (!cp.way) {
        missing++;
        text += 'X';
      } else text += this.wayEnergy(cp.way[1] as CP);
    }
    switch (missing) {
      case 3:
        return 0;
      case 1:
        this.fail('alertError7', [e.index]);
        return 3;
      case 2:
        this.fail('alertError8', [e.index]);
        return 3;
    }
    if (text === 'RST' || text === 'STR' || text === 'TRS') return 1;
    if (text === 'RTS' || text === 'TSR' || text === 'SRT') return 2;
    this.fail('alertError9', [e.index]);
    return 3;
  }

  /** c1Motor3Faz */
  private motor3Faz(e: ElementRT): boolean {
    const r = this.motor3FazControl(e, e.cps.slice(0, 3));
    if (r === 0) {
      this.setState(e, 1);
      return true;
    }
    if (r === 3) return false;
    e.int1 = r === 1 ? 1 : -1;
    for (const cp of e.cps) this.activateWay(cp.way);
    this.setModifyWay(e, true);
    this.setState(e, 2);
    return true;
  }

  /** c1Motor3Faz2: star-delta motor. */
  private motor3Faz2(e: ElementRT): boolean {
    let text = '';
    let missing = 0;
    for (const cp of e.cps) {
      if (!cp.way) {
        missing++;
        text += 'X';
      } else text += this.wayEnergy(cp.way[1] as CP);
    }
    let mode = 0;
    const forward = ['RST', 'STR', 'TRS'];
    const reverse = ['RTS', 'TSR', 'SRT'];
    switch (missing) {
      case 6:
        this.setState(e, 1);
        return true;
      case 3: {
        const head = text.slice(0, 3);
        if (forward.includes(head)) e.int1 = 1;
        else if (reverse.includes(head)) e.int1 = -1;
        else this.fail('alertError9', [e.index]);
        mode = 1;
        break;
      }
      case 0:
        if (forward.map((s) => s + s).includes(text)) e.int1 = 1;
        else if (reverse.map((s) => s + s).includes(text)) e.int1 = -1;
        else this.fail('alertError9', [e.index]);
        mode = 2;
        break;
      default:
        this.fail('alertError9', [e.index]);
    }
    if (mode === 1) {
      e.alWay = [];
      if (this.makeWay2(e.cps[3], e.cps[4]) && this.makeWay2(e.cps[5], e.cps[4])) {
        for (const w of e.alWay) this.activateWay(w);
        for (const cp of e.cps) this.activateWay(cp.way);
        this.setModifyWay(e, true);
        this.setState(e, 2);
        e.alWay = [];
        for (const cp of e.cps) cp.way = null;
      } else {
        this.setState(e, 1);
        return true;
      }
    } else if (mode === 2) {
      for (const cp of e.cps) this.activateWay(cp.way);
      this.setModifyWay(e, true);
      this.setState(e, 2);
      for (const cp of e.cps) cp.way = null;
    }
    return true;
  }

  /** c1Motor1Faz: single-phase motor, main (pins 0-1) and auxiliary (pins 2-3) windings. */
  private motor1Faz(e: ElementRT, way: Way, position: number): boolean {
    const entry = way[position - 1];
    const k = e.cps.indexOf(entry as CP);
    if (k >= 0) e.cps[k].way = way;
    const start = (w: Way) => this.wayEnergy(w[1] as CP);
    const end = (w: Way) => this.wayEnergy(w[w.length - 2] as CP);
    let text = '';
    const [c0, c1, c2, c3] = e.cps;
    if (c0.way) text += start(c0.way) + end(c0.way);
    else {
      if (!c1.way) return true;
      text += end(c1.way) + start(c1.way);
    }
    if (c2.way) text += start(c2.way) + end(c2.way);
    else if (c3.way) text += end(c3.way) + start(c3.way);
    else text += 'XX';
    switch (text) {
      case 'RNRN':
      case 'SNSN':
      case 'TNTN':
        e.int1 = 1;
        this.setState(e, 5);
        this.setModifyWay(e, true);
        break;
      case 'RNNR':
      case 'SNNS':
      case 'TNNT':
      case 'NRRN':
      case 'NSSN':
      case 'NTTN':
        e.int1 = -1;
        this.setState(e, 5);
        this.setModifyWay(e, true);
        break;
      case 'RNXX':
      case 'SNXX':
      case 'TNXX':
      case 'NRXX':
      case 'NSXX':
      case 'NTXX':
        this.setState(e, e.int2 === 10 ? 3 : 2);
        this.setModifyWay(e, true);
        break;
      default:
        this.fail('alertError9', [e.index]);
    }
    return true;
  }

  /** Elements.AnalizeState: gate and elevator motors. */
  private analizeState(e: ElementRT): boolean {
    if (!e.isSystem) return true;
    const r = this.motor3FazControl(e, e.cps.slice(0, 3));
    if (r === 0) {
      this.setFlag(e, 'p1', false);
      this.changeCPState(e);
      e.mCnt = 0;
    } else if (r === 1 || r === 2) {
      e.int1 = r === 1 ? 1 : -1;
      e.vars[4] = e.int1;
      this.setFlag(e, 'p1', true);
      this.changeCPState(e);
      this.activateWay(e.cps[0].way);
      this.activateWay(e.cps[1].way);
      this.activateWay(e.cps[2].way);
      this.setModifyWay(e, true);
    } else return false;
    return true;
  }

  // ---- errors ------------------------------------------------------------------

  /** c1AlertWay: highlight the wires of a faulty path, report, stop. */
  private alertWay(way: Way, key: SimErrorKey): never {
    const lines = new Set<number>();
    let prev: CP | null = null;
    for (const item of way) {
      if (!(item instanceof CP)) continue;
      if (prev && prev.mn === item.mn) {
        const all: LineRT[][] = [];
        const first: LineRT[] = [];
        all.push(first);
        this.resetModify();
        this.showWayLoop(all, first, prev, item);
        for (const p of all) for (const l of p) lines.add(l.index);
      }
      prev = item;
    }
    const elements = way.filter((x): x is ElementRT => x instanceof ElementRT).map((x) => x.index);
    this.fail(key, elements, [...lines], false);
  }

  /** Report an error and stop, as MessageBox + State = 0 did. */
  private fail(key: SimErrorKey, elements: number[], lines: number[] = [], highlightElements = true): never {
    if (!this.error) this.error = { key, elements: highlightElements ? elements : [], lines };
    this.setMainState(0);
    throw new Halt();
  }

  /** c1AlertElement (motor burned, auxiliary winding left in, element error). */
  private alertElement(e: ElementRT, type: number): void {
    if (this.mainState === 0 || this.alertActive) return;
    this.alertActive = true;
    const key: SimErrorKey = type === 0 ? 'alertError10' : type === 1 ? 'alertMotor1' : 'alertError11';
    this.alertActive = false;
    this.fail(key, [e.index]);
  }

  // ---- element state (Elements.State setter) -------------------------------------

  private link(cps: CP[], pairs: [number, number][], open: number[] = []) {
    for (const i of open) cps[i].arrCP = [];
    for (const [a, b] of pairs) {
      cps[a].arrCP = [cps[b]];
      cps[b].arrCP = [cps[a]];
    }
  }

  private setModifyWay(e: ElementRT, value: boolean) {
    if (!value) for (const cp of e.cps) cp.way = null;
    e.modifyWayFlag = value;
  }

  private enableTimer(t: Timer, on: boolean) {
    if (on && !t.enabled) t.due = this.now + t.interval;
    t.enabled = on;
  }

  private setState(e: ElementRT, value: number) {
    if (value >= e.stateCount) value = e.stateCount - 1;
    if (e.state === value) return;
    e.state = value;
    if (value === 0) this.setModifyWay(e, false);
    const c = e.cps;
    switch (e.type) {
      case 'AcikKontak':
      case 'StartButon':
        if (value === 2) {
          this.link(c, [[0, 1]]);
          this.requestScan();
        } else {
          this.link(c, [], [0, 1]);
          if (value === 1) this.requestScan();
        }
        break;
      case 'Startx3':
      case 'UcAcikKontak':
        if (value === 2) {
          this.link(c, [[0, 1], [2, 3], [4, 5]]);
          this.requestScan();
        } else if (value === 1) {
          this.link(c, [], [0, 1, 2, 3, 4, 5]);
          this.requestScan();
        }
        break;
      case 'UcKapaliKontak':
        if (value === 2) {
          this.link(c, [], [0, 1, 2, 3, 4, 5]);
          this.requestScan();
        } else if (value === 1) {
          this.link(c, [[0, 1], [2, 3], [4, 5]]);
          this.requestScan();
        }
        break;
      case 'Start3x3':
        if (value === 2) {
          this.link(c, [[0, 2], [3, 5], [6, 8]], [1, 4, 7]);
          this.requestScan();
        } else if (value === 1) {
          this.link(c, [[0, 1], [3, 4], [6, 7]], [2, 5, 8]);
          this.requestScan();
        }
        break;
      case 'KapaliKontak':
      case 'StopButon':
        if (value === 1) {
          this.link(c, [[0, 1]]);
          this.requestScan();
        } else {
          this.link(c, [], [0, 1]);
          if (value === 2) this.requestScan();
        }
        break;
      case 'StartStopButon':
      case 'SinirAnahtar2':
        // Break before make: both contacts open for one scan, then the new one closes.
        if (value === 1) {
          this.link(c, [], [0, 1, 2, 3]);
          this.requestScan();
          this.link(c, [[0, 1]], [2, 3]);
          this.requestScan();
        } else if (value === 2) {
          this.link(c, [], [0, 1, 2, 3]);
          this.requestScan();
          this.link(c, [[2, 3]], [0, 1]);
          this.requestScan();
        }
        break;
      case 'SinirAnahtar':
        if (value === 1) {
          this.link(c, [[0, 2]], [1]);
          this.requestScan();
        } else if (value === 2) {
          this.link(c, [[0, 1]], [2]);
          this.requestScan();
        }
        break;
      case 'Role':
        this.scheduleChangeContacts(e, value);
        break;
      case 'ZamanRolesi':
        if (value === 2) {
          this.scheduleChangeContacts(e, 1);
          this.enableTimer(e.timer, true);
        } else if (value === 1) {
          this.enableTimer(e.timer, false);
          e.int2 = e.int1;
          this.scheduleChangeContacts(e, 1);
          this.changeContactsCounter(e, String(e.int1));
        } else {
          this.enableTimer(e.timer, false);
          e.label2Text = String(e.int1);
          e.int2 = e.int1;
          this.scheduleChangeContacts(e, 0);
          this.changeContactsCounter(e, e.label2Text);
        }
        break;
      case 'TersZamanRolesi':
        if (value === 2) {
          e.int2 = e.int1;
          this.changeContactsCounter(e, e.label2Text);
          this.scheduleChangeContacts(e, 2);
          this.enableTimer(e.timer, true);
        } else if (value === 0) {
          this.enableTimer(e.timer, false);
          this.scheduleChangeContacts(e, 0);
          e.label2Text = String(e.int1);
          this.changeContactsCounter(e, e.label2Text);
        }
        break;
      case 'UcFazliMotor':
        if (value === 2) {
          e.int2 = 10;
          this.enableTimer(e.timer, true);
        } else if (value === 1) {
          this.enableTimer(e.timer, true);
        } else {
          this.enableTimer(e.timer, false);
          for (const cp of c) cp.way = null;
          e.int1 = 0;
          e.int2 = 0;
        }
        break;
      case 'BirFazMotor':
      case 'BirFazMotor2':
        if (value === 5) {
          e.int2 = 10;
          this.enableTimer(e.timer, true);
        } else if (value === 3) {
          e.int2 = 10;
          e.mCnt = 0;
          this.enableTimer(e.timer, true);
        } else if (value === 1 || value === 2 || value === 4) {
          e.mCnt = 0;
          this.enableTimer(e.timer, true);
        } else {
          e.mCnt = 0;
          this.enableTimer(e.timer, false);
          e.int1 = 0;
          e.int2 = 0;
        }
        break;
      case 'UcFazliMotor2':
        if (value === 2) {
          e.int2 = 10;
          this.enableTimer(e.timer, true);
        } else if (value === 1) {
          this.enableTimer(e.timer, true);
          for (const cp of c) cp.way = null;
        } else {
          this.enableTimer(e.timer, false);
          for (const cp of c) cp.way = null;
          e.int1 = 0;
          e.int2 = 0;
        }
        break;
      case 'Kapi1':
      case 'Kapi2':
        this.setFlag(e, 'p1', false);
        this.setFlag(e, 'p2', true);
        this.setFlag(e, 'p3', false);
        this.changeCPState(e);
        if (value === 0) {
          this.enableTimer(e.timer, false);
          e.vars[0] = e.vars[2];
          e.mCnt = 0;
        }
        break;
      case 'Asansor':
        for (let i = 1; i < 6; i++) this.setFlag(e, `p${i}`, false);
        this.setFlag(e, 'p6', true);
        this.changeCPState(e);
        if (value === 0) {
          this.enableTimer(e.timer, false);
          e.vars[0] = e.vars[1];
          e.mCnt = 0;
        }
        break;
    }
  }

  private setLineState(l: LineRT, value: number) {
    if (value > 2) value = 2;
    l.state = value;
    if (value === 0) l.modifyWay = false;
  }

  private setFlag(e: ElementRT, key: string, value: boolean) {
    e.flags[key] = value;
  }

  /** Elements.changeCPState: the limit switches built into the systems. */
  private changeCPState(e: ElementRT) {
    const c = e.cps;
    if (e.type === 'Kapi1' || e.type === 'Kapi2') {
      if (e.flags.p2) this.link(c, [[4, 5]], [3, 6]);
      else this.link(c, [[3, 6]], [4, 5]);
      if (e.flags.p3) this.link(c, [[8, 9]], [7, 10]);
      else this.link(c, [[7, 10]], [8, 9]);
    } else if (e.type === 'Asansor') {
      for (let i = 2; i < 7; i++) {
        const b = (i - 2) * 4;
        if (e.flags[`p${i}`]) this.link(c, [[4 + b, 5 + b]], [3 + b, 6 + b]);
        else this.link(c, [[3 + b, 6 + b]], [4 + b, 5 + b]);
      }
    } else return;
    this.enableTimer(e.timer, e.flags.p1);
    this.requestScan();
  }

  private scheduleChangeContacts(e: ElementRT, state: number) {
    this.alChangeContacts.push([e, state]);
    this.requestScan();
  }

  private changeContacts(e: ElementRT, state: number) {
    for (const c of e.alElements) this.setState(c, state);
  }

  private changeContactsCounter(e: ElementRT, text: string) {
    for (const c of e.alElements) c.label2Text = text;
    e.label2Text = text;
  }

  // ---- timers (Elements.timer1_Tick) ----------------------------------------------

  private timerTick(e: ElementRT) {
    switch (e.type) {
      case 'ZamanRolesi':
        e.int2--;
        if (e.int2 <= 0) {
          e.int2 = 0;
          this.enableTimer(e.timer, false);
          this.scheduleChangeContacts(e, 2);
        }
        this.changeContactsCounter(e, String(e.int2));
        break;
      case 'TersZamanRolesi':
        if (e.state !== 2) {
          e.int2--;
          if (e.int2 <= 0) {
            e.int2 = 0;
            this.enableTimer(e.timer, false);
            this.scheduleChangeContacts(e, 1);
          }
          this.changeContactsCounter(e, String(e.int2));
        }
        break;
      case 'UcFazliMotor':
      case 'UcFazliMotor2':
        if (e.state === 1) e.int2--;
        e.angle = (e.angle + (e.int1 * e.int2) / 10) % (Math.PI * 2);
        if (e.int2 <= 0) {
          this.enableTimer(e.timer, false);
          e.int1 = 0;
          e.int2 = 0;
        }
        break;
      case 'BirFazMotor':
      case 'BirFazMotor2':
        if (e.state === 1 || e.state === 2 || e.state === 4) e.int2--;
        else if (e.state === 5) {
          if (e.type === 'BirFazMotor') {
            if (e.mCnt >= 30) this.alertElement(e, 0);
          } else if (e.mCnt >= 10) {
            this.setState(e, 3);
          }
          e.mCnt++;
        }
        e.angle = (e.angle + (e.int1 * e.int2) / 10) % (Math.PI * 2);
        if (e.int2 <= 0) {
          this.enableTimer(e.timer, false);
          e.int1 = 0;
          e.int2 = 0;
        }
        break;
      case 'Kapi1':
      case 'Kapi2': {
        const dir = e.vars[4];
        let move = false;
        if (e.flags.p1) {
          // The original checks dir == 1 at both ends.
          if (e.flags.p3) {
            if (dir === 1 && ++e.mCnt === 5) this.alertElement(e, 1);
          } else if (e.flags.p2) {
            if (dir === 1 && ++e.mCnt === 5) this.alertElement(e, 1);
          } else e.mCnt = 0;
          move = e.state !== 0;
        } else this.enableTimer(e.timer, false);
        if (move) {
          e.angle = (e.angle + (dir * 5) / 10) % (Math.PI * 2);
          e.vars[0] += dir * e.vars[3];
          if (e.vars[0] <= e.vars[2]) {
            e.vars[0] = e.vars[2];
            this.setFlag(e, 'p2', true);
          } else if (e.vars[0] >= e.vars[1]) {
            e.vars[0] = e.vars[1];
            this.setFlag(e, 'p3', true);
          } else {
            this.setFlag(e, 'p2', false);
            this.setFlag(e, 'p3', false);
          }
          this.changeCPState(e);
        }
        break;
      }
      case 'Asansor': {
        const dir = e.vars[4];
        let move = false;
        if (e.flags.p1) {
          if (e.flags.p6) {
            if (dir === 1 && ++e.mCnt === 5) this.alertElement(e, 1);
          } else if (e.flags.p2) {
            if (dir === -1 && ++e.mCnt === 5) this.alertElement(e, 1);
          } else e.mCnt = 0;
          move = e.state !== 0;
        } else this.enableTimer(e.timer, false);
        if (move) {
          e.angle = (e.angle + (dir * 5) / 10) % (Math.PI * 2);
          e.vars[0] += dir * e.vars[3];
          if (e.vars[0] <= e.vars[2]) e.vars[0] = e.vars[2];
          else if (e.vars[0] >= e.vars[1]) e.vars[0] = e.vars[1];
          for (let i = 0; i < 5; i++) this.setFlag(e, `p${i + 2}`, e.vars[0] === 40 * (i + 1) + 5);
          this.changeCPState(e);
        }
        break;
      }
    }
  }
}
