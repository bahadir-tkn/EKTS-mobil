/**
 * Editable circuit in the original EKTS object model, with the drawing-panel
 * operations of the desktop program ported from ESCS.frmMain: adding and
 * moving elements, connecting pins with orthogonal wires (Connect, connect2,
 * ConnectPoints), joining a wire to another wire with a junction dot
 * (ConnectToLine), dragging wires and dots (MoveLine, MoveDot, AddZeroLine),
 * tidying wires (ReduceLines, PreReduceLines), deleting (pnlMain_Delete,
 * pnlMain_ReduceNodes), rotating (Elements.Rotation, ReconnectCP) and naming.
 *
 * Coordinates are the original's pixels. A wire is a chain of straight Line
 * objects whose end points (CP) are joined to each other, to element pins or
 * to the four points of a junction Dot.
 */
import type { EscCircuit, EscElementType, EscPoint, EscSide } from '../esc/escFile';
import { ELEMENT_DEFS, rotatePoint, rotateSide, rotatedSize } from './elements';

export type Pt = EscPoint;
export type CPSide = EscSide;

/** frmMain.space: how far a wire leaves a pin before it turns. */
export const SPACE = 5;
/** frmMain.radius: half the 8 px hover dot; the snapping distance. */
export const RADIUS = 4;

/** Lamp colors offered by the original context menu (Red, Blue, Green, Magenta, Yellow). */
export const LAMP_COLORS = [0xffff0000, 0xff0000ff, 0xff008000, 0xffff00ff, 0xffffff00].map((c) => c | 0);
export const DEFAULT_LAMP_COLOR = 0xffff00ff | 0;

const RELAY_TYPES: EscElementType[] = ['Role', 'ZamanRolesi', 'TersZamanRolesi'];
const TIMER_TYPES: EscElementType[] = ['ZamanRolesi', 'TersZamanRolesi'];
const CONTACT_TYPES: EscElementType[] = ['AcikKontak', 'KapaliKontak', 'UcAcikKontak', 'UcKapaliKontak'];

export const isRelay = (t: EscElementType) => RELAY_TYPES.includes(t);
export const isTimer = (t: EscElementType) => TIMER_TYPES.includes(t);
export const isContact = (t: EscElementType) => CONTACT_TYPES.includes(t);

const pt = (x: number, y: number): Pt => ({ x, y });
const samePt = (a: Pt, b: Pt) => a.x === b.x && a.y === b.y;

export class CP {
  con: CP | null = null;
  constructor(
    public owner: DElement | DLine | DDot,
    /** Relative to the element for element pins; absolute for wires and dots. */
    public p: Pt,
    public side: CPSide,
  ) {}

  /** CPoint.ToParentPoint */
  get pos(): Pt {
    return this.owner instanceof DElement
      ? pt(this.owner.location.x + this.p.x, this.owner.location.y + this.p.y)
      : pt(this.p.x, this.p.y);
  }

  /** CPoint.oCon: the object this point is joined to. */
  get conOwner(): DElement | DLine | DDot | null {
    return this.con ? this.con.owner : null;
  }
}

export class DElement {
  location: Pt;
  labelLocation: Pt;
  label2Location: Pt;
  label = '...';
  label2 = '0';
  label2Enabled = false;
  rotation = 0;
  color = 0;
  cps: CP[] = [];
  /** alElements: a relay's contacts, or a contact's relay. */
  linked: DElement[] = [];
  selected = false;

  constructor(public type: EscElementType, location: Pt) {
    this.location = { ...location };
    this.labelLocation = pt(location.x, location.y - 15);
    this.label2Location = pt(location.x, location.y);
    if (type === 'Lamba') this.color = DEFAULT_LAMP_COLOR;
    this.cps = this.makeCPs();
  }

  /** Control size: the rotated drawing box plus one pixel. */
  get size() {
    const s = rotatedSize(this.type, this.rotation);
    return { width: s.width + 1, height: s.height + 1 };
  }

  /** InitCPoint: pins at their rotated positions. */
  makeCPs(): CP[] {
    return ELEMENT_DEFS[this.type].pins.map(
      (p) => new CP(this, rotatePoint(this.type, this.rotation, p), rotateSide(p.side, this.rotation)),
    );
  }
}

export class DLine {
  cp1: CP;
  cp2: CP;
  /** mType: "h", "v", "x" (slanted) or "o" (zero length). */
  type: string = 'x';
  selected = false;

  constructor() {
    this.cp1 = new CP(this, pt(0, 0), 'Null');
    this.cp2 = new CP(this, pt(1, 1), 'Null');
  }

  /** Line.RenewType */
  renewType() {
    const a = this.cp1.p;
    const b = this.cp2.p;
    if (samePt(a, b)) this.type = 'o';
    else if (a.x === b.x) this.type = 'v';
    else if (a.y === b.y) this.type = 'h';
    else this.type = 'x';
  }

  /** Line.nextCPoint */
  next(cp: CP): CP {
    if (cp === this.cp1) return this.cp2;
    if (cp === this.cp2) return this.cp1;
    throw new Error('CP not in this line');
  }
}

export class DDot {
  private mOrigin: Pt = pt(0, 0);
  cps: CP[];
  selected = false;

  constructor(origin: Pt, cps?: CP[]) {
    // Dot(bICP: true): Bottom, Left, Right, Top
    this.cps = cps ?? (['Bottom', 'Left', 'Right', 'Top'] as CPSide[]).map((s) => new CP(this, pt(0, 0), s));
    for (const c of this.cps) c.owner = this;
    this.origin = origin;
  }

  get origin(): Pt {
    return this.mOrigin;
  }

  set origin(v: Pt) {
    this.mOrigin = { ...v };
    for (const c of this.cps) c.p = { ...v };
  }

  /** Dot.oCPSide */
  cpSide(side: CPSide): CP {
    const c = this.cps.find((x) => x.side === side);
    if (!c) throw new Error(`dot has no ${side} point`);
    return c;
  }

  /** Dot.CountEpmtyCP */
  countEmpty(): number {
    return this.cps.filter((c) => c.con === null).length;
  }
}

export interface DText {
  location: Pt;
  size: { width: number; height: number };
  text: string;
}

export type DObject = DElement | DLine | DDot;

export class CircuitDocument {
  elements: DElement[] = [];
  lines: DLine[] = [];
  dots: DDot[] = [];
  texts: DText[] = [];
  summary: { visible: boolean; location: Pt } | null = null;
  /** Bumped on every change; the view re-renders when it moves. */
  version = 0;
  changed = false;
  /** Messages raised while editing (MessageBox in the original). */
  onMessage: (key: 'alertError1' | 'alertError2') => void = () => {};

  touch(changed = true) {
    this.version++;
    if (changed) this.changed = true;
  }

  // ---- loading and saving -------------------------------------------------------

  static fromCircuit(c: EscCircuit): CircuitDocument {
    const doc = new CircuitDocument();
    const cps: (CP | undefined)[] = [];
    for (const e of c.elements) {
      const el = new DElement(e.type, e.location);
      el.rotation = ((e.rotation % 4) + 4) % 4;
      el.cps = el.makeCPs();
      el.labelLocation = { ...e.labelLocation };
      el.label2Location = { ...e.label2Location };
      el.label = e.label;
      el.label2 = e.label2;
      el.label2Enabled = e.label2Visible;
      el.color = e.color;
      e.connectionPoints.forEach((ci, k) => {
        if (el.cps[k]) cps[ci] = el.cps[k];
      });
      doc.elements.push(el);
    }
    c.elements.forEach((e, i) => {
      doc.elements[i].linked = e.linkedElements.map((j) => doc.elements[j]).filter(Boolean);
    });
    for (const l of c.lines) {
      const line = new DLine();
      line.cp1.p = { ...l.from };
      line.cp2.p = { ...l.to };
      line.type = l.orientation;
      cps[l.connectionPoints[0]] = line.cp1;
      cps[l.connectionPoints[1]] = line.cp2;
      doc.lines.push(line);
    }
    for (const d of c.dots) {
      const dcps = d.connectionPoints.map((ci) => {
        const cp = new CP(null as unknown as DDot, pt(0, 0), c.connectionPoints[ci]?.side ?? 'Null');
        cps[ci] = cp;
        return cp;
      });
      doc.dots.push(new DDot(d.location, dcps));
    }
    c.connectionPoints.forEach((raw, i) => {
      const a = cps[i];
      if (a && raw.connectedTo >= 0) a.con = cps[raw.connectedTo] ?? null;
    });
    doc.texts = c.descriptionTexts.map((t) => ({ location: { ...t.location }, size: { ...t.size }, text: t.text }));
    doc.summary = c.summary ? { visible: c.summary.visible, location: { ...c.summary.location } } : null;
    return doc;
  }

  toCircuit(): EscCircuit {
    const index = new Map<CP, number>();
    const all: CP[] = [];
    const reg = (c: CP) => {
      index.set(c, all.length);
      all.push(c);
      return index.get(c)!;
    };
    const elements = this.elements.map((e) => ({
      type: e.type,
      location: { ...e.location },
      labelLocation: { ...e.labelLocation },
      label2Location: { ...e.label2Location },
      label: e.label,
      label2: e.label2,
      label2Visible: e.label2Enabled,
      linkedElements: e.linked.map((x) => this.elements.indexOf(x)).filter((x) => x >= 0),
      connectionPoints: e.cps.map(reg),
      rotation: e.rotation,
      color: e.color,
    }));
    const lines = this.lines.map((l) => ({
      orientation: (l.type === 'v' ? 'v' : 'h') as 'h' | 'v',
      from: { ...l.cp1.p },
      to: { ...l.cp2.p },
      connectionPoints: [reg(l.cp1), reg(l.cp2)] as [number, number],
    }));
    const dots = this.dots.map((d) => ({ location: { ...d.origin }, connectionPoints: d.cps.map(reg) }));
    const connectionPoints = all.map((c) => ({
      side: c.side,
      connectedTo: c.con && index.has(c.con) ? index.get(c.con)! : -1,
    }));
    return {
      elements,
      lines,
      dots,
      connectionPoints,
      descriptionTexts: this.texts.map((t) => ({ location: { ...t.location }, size: { ...t.size }, text: t.text })),
      summary: this.summary ? { visible: this.summary.visible, location: { ...this.summary.location } } : null,
    };
  }

  /** Take over the contents of another document (undo/redo keep the same object). */
  replaceWith(other: CircuitDocument) {
    this.elements = other.elements;
    this.lines = other.lines;
    this.dots = other.dots;
    this.texts = other.texts;
    this.summary = other.summary;
    this.touch();
  }

  // ---- adding -------------------------------------------------------------------

  /** pnlMainAdd: a new element goes to (10, 20) of the visible area, its name above it. */
  addElement(type: EscElementType, viewOrigin: Pt = pt(0, 0)): DElement {
    const el = new DElement(type, pt(viewOrigin.x + 10, viewOrigin.y + 20));
    el.labelLocation = pt(viewOrigin.x + 10, viewOrigin.y + 5);
    if (isTimer(type)) {
      el.label2Location = pt(el.location.x, el.location.y + el.size.height + 3);
      el.label2Enabled = true;
    }
    this.elements.push(el);
    this.touch();
    return el;
  }

  // ---- hit testing ----------------------------------------------------------------

  /** InRegion(Point) */
  static inRegion(p: Pt, r: number, o: Pt): boolean {
    return o.x > p.x - r && o.x < p.x + r && o.y > p.y - r && o.y < p.y + r;
  }

  /** InRegion(Line): inside a straight wire, away from its ends (kept as written). */
  static inRegionLine(line: DLine, r: number, o: Pt): boolean {
    const a = line.cp1.p;
    const b = line.cp2.p;
    if (samePt(a, b)) return false;
    if (a.x === b.x) {
      if (!(o.x > a.x - r && o.x < a.x + r)) return false;
      if (o.y <= a.y + r || o.y >= b.y - r) return o.y < a.y - r ? o.y > b.y + r : false;
      return true;
    }
    if (a.y === b.y) {
      if (!(o.y > a.y - r && o.y < a.y + r)) return false;
      if (o.x <= a.x + r || o.x >= b.x - r) return o.x < a.x - r ? o.x > b.x + r : false;
      return true;
    }
    return false;
  }

  /** SearchCPoint over elements and dots: the nearest free pin within r. */
  findFreePin(p: Pt, r: number, from: { elements?: boolean; dots?: boolean } = { elements: true, dots: true }): CP | null {
    let best: CP | null = null;
    let bestD = Infinity;
    const consider = (c: CP) => {
      if (c.con) return;
      const q = c.pos;
      if (!CircuitDocument.inRegion(q, r, p)) return;
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    };
    if (from.elements) for (const e of this.elements) e.cps.forEach(consider);
    if (from.dots)
      for (const d of this.dots) {
        // Dot points share one place; the original takes the first free one.
        const c = d.cps.find((x) => !x.con);
        if (c) consider(c);
      }
    return best;
  }

  findDot(p: Pt, r: number): DDot | null {
    for (let i = this.dots.length - 1; i >= 0; i--) if (CircuitDocument.inRegion(this.dots[i].origin, r, p)) return this.dots[i];
    return null;
  }

  findLine(p: Pt, r: number): DLine | null {
    for (let i = this.lines.length - 1; i >= 0; i--) if (CircuitDocument.inRegionLine(this.lines[i], r, p)) return this.lines[i];
    return null;
  }

  /** Where dot2 lands when a new wire is dropped on a straight wire. */
  static projectOnLine(line: DLine, p: Pt): Pt | null {
    if (line.type === 'h') return pt(p.x, line.cp1.p.y);
    if (line.type === 'v') return pt(line.cp1.p.x, p.y);
    return null;
  }

  // ---- selection ----------------------------------------------------------------------

  private setLineSelected(line: DLine, v: boolean) {
    line.selected = v;
    for (const c of [line.cp1, line.cp2]) {
      const o = c.conOwner;
      if (o instanceof DLine && o.selected !== v) this.setLineSelected(o, v);
    }
  }

  /** Elements.Selected / Line.Selected / Dot.Selected with their cascade to attached wires. */
  setSelected(o: DObject, v: boolean) {
    if (o instanceof DLine) {
      this.setLineSelected(o, v);
      return;
    }
    o.selected = v;
    for (const c of o.cps) {
      const w = c.conOwner;
      if (w instanceof DLine) this.setLineSelected(w, v);
    }
  }

  /** pnlMainDeselect(o): clear the selection, then select `o`. */
  deselect(o: DObject | null = null) {
    for (const e of this.elements) if (e.selected) this.setSelected(e, false);
    for (const l of this.lines) if (l.selected) this.setSelected(l, false);
    for (const d of this.dots) if (d.selected) this.setSelected(d, false);
    if (o) this.setSelected(o, true);
    this.touch(false);
  }

  selectAll() {
    for (const e of this.elements) e.selected = true;
    for (const l of this.lines) l.selected = true;
    for (const d of this.dots) d.selected = true;
    this.touch(false);
  }

  get hasSelection(): boolean {
    return this.elements.some((e) => e.selected) || this.lines.some((l) => l.selected) || this.dots.some((d) => d.selected);
  }

  /** alSelectedElements_Add: everything wired to `o` (double click picks up a whole group). */
  connectedGroup(o: DObject, into: Set<DObject> = new Set()): Set<DObject> {
    if (into.has(o)) return into;
    into.add(o);
    const cps = o instanceof DLine ? [o.cp1, o.cp2] : o.cps;
    for (const c of cps) {
      const n = c.conOwner;
      if (n) this.connectedGroup(n, into);
    }
    return into;
  }

  /** Move a picked-up group (cntSelectedElements) by (dx, dy). */
  translateGroup(group: Iterable<DObject>, dx: number, dy: number) {
    for (const o of group) {
      if (o instanceof DElement) this.translateElement(o, dx, dy);
      else if (o instanceof DLine) {
        o.cp1.p = pt(o.cp1.p.x + dx, o.cp1.p.y + dy);
        o.cp2.p = pt(o.cp2.p.x + dx, o.cp2.p.y + dy);
      } else o.origin = pt(o.origin.x + dx, o.origin.y + dy);
    }
    this.touch();
  }

  // ---- moving -------------------------------------------------------------------------

  /** Elements_Move: the element and its name labels. */
  private translateElement(e: DElement, dx: number, dy: number) {
    e.location = pt(e.location.x + dx, e.location.y + dy);
    e.labelLocation = pt(e.labelLocation.x + dx, e.labelLocation.y + dy);
    if (e.label2Enabled) e.label2Location = pt(e.label2Location.x + dx, e.label2Location.y + dy);
  }

  /** Dragging an element: Elements_Move, then MoveLine for each pin (Elements_MouseMove2). */
  moveElement(e: DElement, dx: number, dy: number) {
    if (!dx && !dy) return;
    this.translateElement(e, dx, dy);
    for (const c of e.cps) this.moveLineCP(c);
    this.touch();
  }

  /** Elements_MouseUp2 */
  endMoveElement(e: DElement) {
    for (const c of e.cps) this.reduceLinesCP(c);
    this.touch();
  }

  moveLabel(e: DElement, which: 1 | 2, dx: number, dy: number) {
    if (which === 1) e.labelLocation = pt(e.labelLocation.x + dx, e.labelLocation.y + dy);
    else e.label2Location = pt(e.label2Location.x + dx, e.label2Location.y + dy);
    this.touch();
  }

  /** MoveLine(Line, Point): slide a straight wire sideways. */
  moveLine(line: DLine, p: Pt) {
    if (!(line.cp1.conOwner instanceof DLine)) this.addZeroLine(line.cp1, true);
    if (!(line.cp2.conOwner instanceof DLine)) this.addZeroLine(line.cp2, true);
    if (line.cp1.p.x === line.cp2.p.x) {
      line.cp1.p = pt(p.x, line.cp1.p.y);
      line.cp2.p = pt(p.x, line.cp2.p.y);
    } else if (line.cp1.p.y === line.cp2.p.y) {
      line.cp1.p = pt(line.cp1.p.x, p.y);
      line.cp2.p = pt(line.cp2.p.x, p.y);
    }
    if (line.cp1.con) line.cp1.con.p = { ...line.cp1.p };
    if (line.cp2.con) line.cp2.con.p = { ...line.cp2.p };
    this.touch();
  }

  /** line_MouseUp1 */
  endMoveLine(line: DLine) {
    if (this.lines.includes(line)) this.reduceLines(line);
    this.touch();
  }

  /** MoveLine(CPoint): the wire on a moved pin follows it. */
  private moveLineCP(cp: CP) {
    const oConCp = cp.con;
    if (!oConCp) return;
    const p = cp.pos;
    const line = oConCp.owner;
    if (!(line instanceof DLine)) return;
    const other = line.next(oConCp);
    if (!(other.conOwner instanceof DLine)) this.addZeroLine(other, true);
    if (line.type === 'v') other.p = pt(p.x, other.p.y);
    else if (line.type === 'h') other.p = pt(other.p.x, p.y);
    oConCp.p = { ...p };
    if (other.con) other.con.p = { ...other.p };
  }

  /** MoveDot */
  moveDot(dot: DDot, p: Pt) {
    dot.origin = p;
    for (const c of dot.cps) this.moveLineCP(c);
    this.touch();
  }

  /** pnlMain_MouseUp after dragging a dot */
  endMoveDot(dot: DDot) {
    for (const c of dot.cps) this.reduceLinesCP(c);
    this.touch();
  }

  /**
   * AddZeroLine: where a wire meets a pin or dot directly, put in a short stub
   * out of the pin and a zero-length bend so the wire can be dragged.
   */
  private addZeroLine(cp1: CP, selected: boolean) {
    const oConCp = cp1.con;
    if (!oConCp) return;
    let fixed: CP;
    let lineEnd: CP;
    if (oConCp.side !== 'Null') {
      fixed = oConCp;
      lineEnd = cp1;
    } else {
      if (cp1.side === 'Null') return;
      fixed = cp1;
      lineEnd = oConCp;
    }
    const q = fixed.pos;
    let p: Pt;
    switch (fixed.side) {
      case 'Bottom':
        p = pt(q.x, q.y + SPACE);
        break;
      case 'Left':
        p = pt(q.x - SPACE, q.y);
        break;
      case 'Right':
        p = pt(q.x + SPACE, q.y);
        break;
      case 'Top':
        p = pt(q.x, q.y - SPACE);
        break;
      default:
        return;
    }
    const line = new DLine();
    const line2 = new DLine();
    this.connectAndMove(line.cp1, fixed);
    this.connectAndMoveAt(line2.cp1, line.cp2, p);
    this.connectAndMoveAt(lineEnd, line2.cp2, p);
    this.lines.push(line);
    line.renewType();
    this.lines.push(line2);
    if (line.type === 'h') line2.type = 'v';
    else if (line.type === 'v') line2.type = 'h';
    line.selected = selected;
    line2.selected = selected;
  }

  // ---- connecting -----------------------------------------------------------------

  /** ConnectAndMove(lCpFrom, eCpTo) */
  private connectAndMove(from: CP, to: CP) {
    from.con = to;
    to.con = from;
    if (from.owner instanceof DLine) from.p = to.pos;
  }

  /** ConnectAndMove(lCpFrom, lCpTo, pt) */
  private connectAndMoveAt(from: CP, to: CP, p: Pt) {
    from.con = to;
    to.con = from;
    if (from.owner instanceof DLine && to.owner instanceof DLine) {
      to.p = { ...p };
      from.p = { ...p };
    }
  }

  /** Connect: route a new wire between two free points. */
  connect(cp1: CP, cp2: CP) {
    const a = cp1.pos;
    const b = cp2.pos;
    let x1 = a.x;
    let y1 = a.y;
    let x2 = b.x;
    let y2 = b.y;
    let s1 = '';
    let s2 = '';
    switch (cp1.side) {
      case 'Bottom':
        y1 += SPACE;
        s1 = 'y1b';
        break;
      case 'Left':
        x1 -= SPACE;
        s1 = 'x1s';
        break;
      case 'Right':
        x1 += SPACE;
        s1 = 'x1b';
        break;
      case 'Top':
        y1 -= SPACE;
        s1 = 'y1s';
        break;
    }
    switch (cp2.side) {
      case 'Bottom':
        y2 += SPACE;
        s2 = 'y2b';
        break;
      case 'Left':
        x2 -= SPACE;
        s2 = 'x2s';
        break;
      case 'Right':
        x2 += SPACE;
        s2 = 'x2b';
        break;
      case 'Top':
        y2 -= SPACE;
        s2 = 'y2s';
        break;
    }
    this.connectPoints(cp1, cp2, CircuitDocument.connect2(x1, y1, s1, x2, y2, s2));
    this.touch();
  }

  /** connect2: the bend points of the route, as the original chose them. */
  static connect2(x1: number, y1: number, s1: string, x2: number, y2: number, s2: string): Pt[] {
    // C# integer division truncates toward zero.
    let mx = Math.trunc((x1 + x2) / 2);
    if (mx === x1 || mx === x2) mx += SPACE;
    let my = Math.trunc((y1 + y2) / 2);
    if (my === y1 || my === y2) my += SPACE;
    if (
      (x1 === x2 && ((y1 < y2 && s1 !== 'y1s' && s2 !== 'y2b') || (y1 > y2 && s1 !== 'y1b' && s2 !== 'y2s'))) ||
      (y1 === y2 && ((x1 < x2 && s1 !== 'x1s' && s2 !== 'x2b') || (x1 > x2 && s1 !== 'x1b' && s2 !== 'x2s')))
    )
      return [pt(x1, y1), pt(x2, y2)];
    if (((x1 >= x2 && s1 !== 'x1b') || (x1 <= x2 && s1 !== 'x1s')) && ((y1 <= y2 && s2 !== 'y2b') || (y1 >= y2 && s2 !== 'y2s')))
      return [pt(x1, y1), pt(x2, y1), pt(x2, y2)];
    if (((x1 <= x2 && s2 !== 'x2b') || (x1 >= x2 && s2 !== 'x2s')) && ((y1 <= y2 && s1 !== 'y1s') || (y1 >= y2 && s1 !== 'y1b')))
      return [pt(x1, y1), pt(x1, y2), pt(x2, y2)];
    if (((mx <= x1 && s1 !== 'x1b') || (mx >= x1 && s1 !== 'x1s')) && ((mx <= x2 && s2 !== 'x2b') || (mx >= x2 && s2 !== 'x2s')))
      return [pt(x1, y1), pt(mx, y1), pt(mx, y2), pt(x2, y2)];
    if (((my <= y1 && s1 !== 'y1b') || (my >= y1 && s1 !== 'y1s')) && ((my <= y2 && s2 !== 'y2b') || (my >= y2 && s2 !== 'y2s')))
      return [pt(x1, y1), pt(x1, my), pt(x2, my), pt(x2, y2)];
    return [];
  }

  /** ConnectPoints: one Line per leg, joined end to end, then tidied. */
  private connectPoints(cp1: CP, cp2: CP, points: Pt[]) {
    const n = points.length + 1;
    const arr: DLine[] = [new DLine()];
    this.connectAndMove(arr[0].cp1, cp1);
    for (let i = 1; i < n; i++) {
      arr[i] = new DLine();
      this.connectAndMoveAt(arr[i].cp1, arr[i - 1].cp2, points[i - 1]);
    }
    this.connectAndMove(arr[n - 1].cp2, cp2);
    for (const l of arr) {
      this.lines.push(l);
      l.renewType();
    }
    this.reduceLines(arr[0]);
  }

  /** ConnectToLine: join a pin to the middle of a wire through a new junction dot. */
  connectToLine(line: DLine, p: Pt, cp: CP) {
    const line2 = new DLine();
    const dot = new DDot(p);
    this.dots.push(dot);
    if (line.type === 'h') {
      if (line.cp1.p.x < line.cp2.p.x) {
        this.connectAndMove(line2.cp2, line.cp2.con!);
        this.connectAndMove(line.cp2, dot.cpSide('Left'));
        this.connectAndMove(line2.cp1, dot.cpSide('Right'));
      } else {
        this.connectAndMove(line2.cp2, line.cp1.con!);
        this.connectAndMove(line.cp1, dot.cpSide('Left'));
        this.connectAndMove(line2.cp1, dot.cpSide('Right'));
      }
      this.lines.push(line2);
      line2.renewType();
      if (cp.pos.y < p.y) this.connect(cp, dot.cpSide('Top'));
      else this.connect(cp, dot.cpSide('Bottom'));
    } else if (line.type === 'v') {
      if (line.cp1.p.y < line.cp2.p.y) {
        this.connectAndMove(line2.cp2, line.cp2.con!);
        this.connectAndMove(line.cp2, dot.cpSide('Top'));
        this.connectAndMove(line2.cp1, dot.cpSide('Bottom'));
      } else {
        this.connectAndMove(line2.cp2, line.cp1.con!);
        this.connectAndMove(line.cp1, dot.cpSide('Top'));
        this.connectAndMove(line2.cp1, dot.cpSide('Bottom'));
      }
      this.lines.push(line2);
      line2.renewType();
      if (cp.pos.x < p.x) this.connect(cp, dot.cpSide('Left'));
      else this.connect(cp, dot.cpSide('Right'));
    } else {
      this.lines.push(line2);
      line2.renewType();
    }
    this.touch();
  }

  // ---- tidying wires --------------------------------------------------------------

  private removeLine(l: DLine) {
    const i = this.lines.indexOf(l);
    if (i >= 0) this.lines.splice(i, 1);
  }

  private static isBetween(x: number, a: number, b: number): boolean {
    if (a < b) return a <= x && x <= b;
    if (a > b) return a >= x && x >= b;
    return a === x && b === x;
  }

  /** FindSetOfLines: the whole chain of lines `line` belongs to, end to end. */
  private findSetOfLines(line: DLine): DLine[] {
    let num = 1;
    let l2 = line;
    let c = line.cp2;
    while (l2.next(c).conOwner instanceof DLine) {
      c = l2.next(c).con!;
      l2 = c.owner as DLine;
      num++;
      if (num > 100000) throw new Error('wire loop');
    }
    let l3 = line;
    c = line.cp1;
    while (l3.next(c).conOwner instanceof DLine) {
      c = l3.next(c).con!;
      l3 = c.owner as DLine;
      num++;
      if (num > 100000) throw new Error('wire loop');
    }
    const arr: DLine[] = [l3];
    let l4 = l3;
    c = l3.next(c);
    while (l4.next(c).conOwner instanceof DLine) {
      c = l4.next(c).con!;
      l4 = c.owner as DLine;
      arr.push(l4);
    }
    return arr;
  }

  private reduceLinesCP(cp: CP) {
    const o = cp.conOwner;
    if (o instanceof DLine && this.lines.includes(o)) this.reduceLines(o);
  }

  /** PreReduceLines: merge straight runs that continue in the same direction. */
  private preReduceLines(line: DLine, cp: CP, depth = 0) {
    if (depth > 10000) return;
    const line2 = cp.conOwner;
    if (!(line2 instanceof DLine)) return;
    const c1 = line.cp1 !== cp ? line.cp1 : line.cp2;
    const c2 = line2.cp1.conOwner !== line ? line2.cp1 : line2.cp2;
    if ((c1.p.x === c2.p.x || c1.p.y === c2.p.y) && line.type === line2.type) {
      if (!c2.con) return;
      this.connectAndMove(cp, c2.con);
      this.removeLine(line2);
      this.preReduceLines(line, cp, depth + 1);
    } else if (samePt(line2.cp1.p, line2.cp2.p) && c2.conOwner instanceof DLine) {
      const line3 = c2.conOwner;
      if (line.type === line3.type) {
        const far = line3.next(c2.con!);
        if (!far.con) return;
        this.connectAndMove(cp, far.con);
        this.removeLine(line2);
        this.removeLine(line3);
        this.preReduceLines(line, cp, depth + 1);
      } else this.preReduceLines(line2, c2, depth + 1);
    } else this.preReduceLines(line2, c2, depth + 1);
  }

  /** ReduceLines: merge collinear legs and cut out loops a wire makes with itself. */
  private reduceLines(line: DLine, depth = 0) {
    if (depth > 1000) return;
    let flag = false;
    this.preReduceLines(line, line.cp1);
    this.preReduceLines(line, line.cp2);
    if (samePt(line.cp1.p, line.cp2.p) && line.cp1.conOwner instanceof DLine && line.cp2.conOwner instanceof DLine) {
      const line2 = line.cp1.conOwner;
      const line3 = line.cp2.conOwner;
      const a = line.cp1.con!;
      const far = line3.next(line.cp2.con!);
      if (far.con) {
        this.connectAndMove(a, far.con);
        this.removeLine(line);
        this.removeLine(line3);
        line = line2;
      }
    }
    const arr = this.findSetOfLines(line);
    for (let num = arr.length - 1; num >= 0; num--) {
      for (let i = 0; i < num - 2; i++) {
        const A = arr[num];
        const B = arr[i];
        if (A.type === B.type && (A.type === 'h' || A.type === 'v')) {
          if (A.type === 'h' && A.cp1.p.y === B.cp1.p.y) {
            if (
              CircuitDocument.isBetween(A.cp1.p.x, B.cp1.p.x, B.cp2.p.x) ||
              CircuitDocument.isBetween(A.cp2.p.x, B.cp1.p.x, B.cp2.p.x) ||
              CircuitDocument.isBetween(B.cp1.p.x, A.cp1.p.x, A.cp2.p.x)
            )
              flag = true;
          } else if (
            A.cp1.p.x === B.cp1.p.x &&
            (CircuitDocument.isBetween(A.cp1.p.y, B.cp1.p.y, B.cp2.p.y) ||
              CircuitDocument.isBetween(A.cp2.p.y, B.cp1.p.y, B.cp2.p.y) ||
              CircuitDocument.isBetween(B.cp1.p.y, A.cp1.p.y, A.cp2.p.y))
          )
            flag = true;
          if (flag) {
            const bEnd = B.cp1.conOwner === arr[i + 1] ? B.cp1 : B.cp2.conOwner === arr[i + 1] ? B.cp2 : null;
            const aEnd = A.cp1.conOwner === arr[num - 1] ? A.cp2 : A.cp2.conOwner === arr[num - 1] ? A.cp1 : null;
            if (!bEnd || !aEnd || !aEnd.con) return;
            this.connectAndMove(bEnd, aEnd.con);
            for (let j = i + 1; j <= num; j++) this.removeLine(arr[j]);
            this.reduceLines(B, depth + 1);
            return;
          }
        } else if ((A.type === 'h' && B.type === 'v') || (A.type === 'v' && B.type === 'h')) {
          let x = 0;
          let y = 0;
          if (A.type === 'h') {
            y = A.cp1.p.y;
            x = B.cp1.p.x;
            if (CircuitDocument.isBetween(y, B.cp1.p.y, B.cp2.p.y) && CircuitDocument.isBetween(x, A.cp1.p.x, A.cp2.p.x)) flag = true;
          } else {
            y = B.cp1.p.y;
            x = A.cp1.p.x;
            if (CircuitDocument.isBetween(y, A.cp1.p.y, A.cp2.p.y) && CircuitDocument.isBetween(x, B.cp1.p.x, B.cp2.p.x)) flag = true;
          }
          if (flag) {
            const bEnd = B.cp1.conOwner === arr[i + 1] ? B.cp1 : B.cp2.conOwner === arr[i + 1] ? B.cp2 : null;
            const aEnd = A.cp1.conOwner === arr[num - 1] ? A.cp1 : A.cp2.conOwner === arr[num - 1] ? A.cp2 : null;
            if (!bEnd || !aEnd) return;
            this.connectAndMoveAt(bEnd, aEnd, pt(x, y));
            for (let j = i + 1; j < num; j++) this.removeLine(arr[j]);
            this.reduceLines(B, depth + 1);
            return;
          }
        }
      }
    }
  }

  // ---- deleting -------------------------------------------------------------------

  /** pnlMain_Delete: remove everything selected, then clean up junctions. */
  deleteSelected() {
    if (!this.hasSelection) return;
    for (const e of [...this.elements]) {
      if (!e.selected) continue;
      for (const c of e.cps) {
        if (c.con) c.con.con = null;
        c.con = null;
      }
      for (const other of e.linked) {
        other.linked = other.linked.filter((x) => x !== e);
        if (isRelay(e.type)) other.label = '...';
      }
      this.elements.splice(this.elements.indexOf(e), 1);
    }
    for (const l of [...this.lines]) {
      if (!l.selected) continue;
      for (const c of [l.cp1, l.cp2]) {
        if (c.con) c.con.con = null;
        c.con = null;
      }
      this.removeLine(l);
    }
    for (const d of [...this.dots]) {
      if (!d.selected) continue;
      for (const c of d.cps) {
        if (c.con) c.con.con = null;
        c.con = null;
      }
      this.dots.splice(this.dots.indexOf(d), 1);
    }
    this.deselect(null);
    this.reduceNodes();
    this.touch();
  }

  /** pnlMain_ReduceNodes: a dot left with two wires is dissolved; with one or none it goes, with its wire. */
  private reduceNodes(depth = 0) {
    if (depth > 1000) return;
    for (let k = this.dots.length - 1; k >= 0; k--) {
      const dot = this.dots[k];
      if (!dot) continue;
      const empty = dot.countEmpty();
      if (empty === 2) {
        const used = dot.cps.filter((c) => c.con);
        const line = used[0].conOwner as DLine;
        const line2 = used[1].conOwner as DLine;
        const c1 = used[0].con!;
        const c2 = used[1].con!;
        if (line.type === line2.type) {
          const far = line2.next(c2).con;
          if (far) this.connectAndMove(c1, far);
          else c1.con = null;
          this.removeLine(line2);
        } else {
          c1.con = c2;
          c2.con = c1;
        }
        this.dots.splice(this.dots.indexOf(dot), 1);
      } else if (empty > 2) {
        this.deselect(dot);
        this.deleteSelected();
        k = Math.min(k, this.dots.length);
      }
    }
  }

  // ---- element properties -----------------------------------------------------------------

  /** Elements.Rotation += quarterTurns, re-routing the wires on its pins (ReconnectCP). */
  rotate(e: DElement, quarterTurns: number) {
    e.rotation = (((e.rotation + quarterTurns) % 4) + 4) % 4;
    const old = e.cps;
    e.cps = e.makeCPs();
    old.forEach((c, num) => {
      if (!c.con) return;
      let o: CP | null = c.con;
      o.con = null;
      c.con = null;
      let guard = 0;
      while (o && o.owner instanceof DLine && guard++ < 100000) {
        o = o.owner.next(o).con;
      }
      if (!o) return;
      const o2 = o.con;
      if (!o2) return;
      o2.con = null;
      o.con = null;
      this.connect(o, e.cps[num]);
      this.deselect(o2.owner);
      this.deleteSelected();
    });
    this.touch();
  }

  setColor(e: DElement, argb: number) {
    e.color = argb | 0;
    this.touch();
  }

  /** textBox1_Validated, Tag "1": a name, upper case; a relay passes it to its contacts. */
  setLabel(e: DElement, text: string) {
    if (text === '') return;
    // String.ToUpper on the Turkish Windows the program was made for.
    const t = text.toLocaleUpperCase('tr-TR');
    e.label = t;
    if (isRelay(e.type)) for (const c of e.linked) c.label = t;
    this.touch();
  }

  /** textBox1_Validated, Tag "2": a time relay's delay in seconds. */
  setDelay(e: DElement, text: string) {
    if (!/^\d+$/.test(text)) return;
    const v = String(parseInt(text, 10));
    e.label2 = v;
    if (isTimer(e.type)) for (const c of e.linked) c.label2 = v;
    this.touch();
  }

  /** comboBox1_Enter: the names a contact can pick from (alertError2 if one repeats). */
  relayNames(): string[] {
    const names: string[] = [];
    let dup = false;
    for (const e of this.elements) {
      if (!isRelay(e.type)) continue;
      if (names.includes(e.label)) dup = true;
      names.push(e.label);
    }
    if (dup) this.onMessage('alertError2');
    return names;
  }

  /** comboBox1_Validated: attach a contact to the relay with that name. */
  setContactRelay(e: DElement, name: string) {
    e.label = name;
    const relay = this.elements.find((x) => x.label === name && isRelay(x.type));
    if (e.linked.length > 0) {
      const prev = e.linked[0];
      prev.linked = prev.linked.filter((x) => x !== e);
      e.linked = e.linked.filter((x) => x !== prev);
    }
    if (e.linked.length > 0) this.onMessage('alertError1');
    if (!relay) {
      this.touch();
      return;
    }
    e.linked.push(relay);
    relay.linked.push(e);
    if (isTimer(relay.type)) {
      if (e.label2Enabled) e.label2 = relay.label2;
      else this.showLabel2(e, true);
    } else this.showLabel2(e, false);
    this.touch();
  }

  /** pnlMain_Label2 */
  private showLabel2(e: DElement, show: boolean) {
    if (show) {
      e.label2Location = pt(e.location.x, e.location.y + e.size.height + 3);
      e.label2Enabled = true;
      if (e.linked.length === 1) e.label2 = e.linked[0].label2;
    } else e.label2Enabled = false;
  }

  // ---- description texts ------------------------------------------------------------------

  addText(text: string, at: Pt) {
    this.texts.push({ location: { ...at }, size: { width: 0, height: 0 }, text });
    this.touch();
  }
}
