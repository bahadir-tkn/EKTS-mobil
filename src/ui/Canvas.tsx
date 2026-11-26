/**
 * The drawing panel with touch and mouse handling.
 *
 * Panning and zooming change one transform attribute on the root group
 * directly, without re-rendering React, so moving around stays smooth on
 * phones. Editing follows the original panel: drag from a free pin to make a
 * wire, drop it on another pin or on a wire, drag selected elements, wires
 * and dots, double tap to pick up a connected group.
 *
 * Mobile adaptations: an element, wire or dot is moved only after it has been
 * selected with a tap (otherwise a drag pans the view); a long press stands
 * in for the right mouse button (context menu while editing, latching a
 * button while running).
 */
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { CircuitDocument, CP, DDot, DElement, DLine, RADIUS, type DObject, type DText, type Pt } from '../ekts/document';
import type { SimSnapshot } from '../ekts/simulator';
import { rotatedSize } from '../ekts/elements';
import { Drawing, labelBox, type WireDraft } from './Drawing';
import { summaryLayout } from './Summary';
import type { Lang } from './strings';

const PRESSABLE = ['Role', 'StartButon', 'StopButon', 'StartStopButon', 'SinirAnahtar', 'Startx3', 'Start3x3', 'SinirAnahtar2'];
const TAP_SLOP = 8; // screen px
const LONG_PRESS_MS = 550;
const DOUBLE_TAP_MS = 320;
const MIN_K = 0.25;
const MAX_K = 8;

export interface CanvasHandle {
  fit(): void;
  zoomBy(f: number): void;
  /** Top-left of the visible area in drawing coordinates. */
  viewOrigin(): Pt;
}

export interface CanvasProps {
  doc: CircuitDocument;
  version: number;
  mode: 'edit' | 'run';
  lang: Lang;
  snapshot: SimSnapshot | null;
  alert: { elements: Set<number>; lines: Set<number>; phase: boolean } | null;
  onChange(): void;
  onPress(index: number, latch: boolean): void;
  onRelease(index: number, latch: boolean): void;
  onContextMenu(e: DElement, clientX: number, clientY: number): void;
  onEditLabel(e: DElement, which: 1 | 2): void;
  onEditText(t: DText): void;
  onTextMenu(t: DText, clientX: number, clientY: number): void;
  onZoom?(k: number): void;
  /** A touch or click has finished; whatever it changed is one undo step. */
  onCommit?(): void;
}

type Gesture =
  | { kind: 'none' }
  | { kind: 'tap'; target: DObject | DText | null; startView: View; moved: boolean }
  | { kind: 'text'; t: DText; resize: boolean; startDoc: Pt; startLoc: Pt; startSize: { width: number; height: number }; moved: boolean }
  | { kind: 'pinch'; startView: View; a0: Pt; b0: Pt }
  | { kind: 'element'; el: DElement; startDoc: Pt; startLoc: Pt; moved: boolean }
  | { kind: 'group'; items: Set<DObject>; last: Pt; moved: boolean }
  | { kind: 'label'; el: DElement; which: 1 | 2; startDoc: Pt; startLoc: Pt; moved: boolean }
  | { kind: 'line'; line: DLine; moved: boolean }
  | { kind: 'dot'; dot: DDot; moved: boolean }
  | { kind: 'wire'; from: CP }
  | { kind: 'summary'; startDoc: Pt; startLoc: Pt; moved: boolean }
  | { kind: 'press'; index: number; latched: boolean; latch: boolean };

interface View {
  x: number;
  y: number;
  k: number;
}

function elementAt(doc: CircuitDocument, p: Pt, slack: number): DElement | null {
  let best: DElement | null = null;
  let bestD = Infinity;
  for (let i = doc.elements.length - 1; i >= 0; i--) {
    const e = doc.elements[i];
    const s = rotatedSize(e.type, e.rotation);
    const x0 = e.location.x - slack;
    const y0 = e.location.y - slack;
    const x1 = e.location.x + s.width + slack;
    const y1 = e.location.y + s.height + slack;
    if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
    const cx = e.location.x + s.width / 2;
    const cy = e.location.y + s.height / 2;
    const d = Math.max(Math.abs(p.x - cx) - s.width / 2, 0) + Math.max(Math.abs(p.y - cy) - s.height / 2, 0);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function insideElement(e: DElement, p: Pt) {
  const s = rotatedSize(e.type, e.rotation);
  return p.x > e.location.x && p.x < e.location.x + s.width && p.y > e.location.y && p.y < e.location.y + s.height;
}

function textAt(doc: CircuitDocument, p: Pt, slack: number): DText | null {
  for (let i = doc.texts.length - 1; i >= 0; i--) {
    const t = doc.texts[i];
    const w = t.size.width || 100;
    const h = t.size.height || 23;
    if (p.x >= t.location.x - slack && p.x <= t.location.x + w + slack && p.y >= t.location.y - slack && p.y <= t.location.y + h + slack)
      return t;
  }
  return null;
}

function summaryAt(doc: CircuitDocument, layout: { width: number; height: number } | null, p: Pt): boolean {
  if (!layout || !doc.summary?.visible) return false;
  const { x, y } = doc.summary.location;
  return p.x >= x && p.x <= x + layout.width && p.y >= y && p.y <= y + layout.height;
}

function labelAt(doc: CircuitDocument, p: Pt, slack: number, onlySelected: boolean): { el: DElement; which: 1 | 2 } | null {
  for (let i = doc.elements.length - 1; i >= 0; i--) {
    const e = doc.elements[i];
    if (onlySelected && !e.selected) continue;
    const boxes: [1 | 2, ReturnType<typeof labelBox>][] = [[1, labelBox(e.label, e.labelLocation)]];
    if (e.label2Enabled) boxes.push([2, labelBox(e.label2, e.label2Location)]);
    for (const [which, b] of boxes) {
      if (p.x >= b.x - slack && p.x <= b.x + b.width + slack && p.y >= b.y - slack && p.y <= b.y + b.height + slack)
        return { el: e, which };
    }
  }
  return null;
}

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas(props, ref) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const view = useRef<View>({ x: 16, y: 16, k: 2 });
  const pointers = useRef(new Map<number, Pt>());
  const gesture = useRef<Gesture>({ kind: 'none' });
  const downAt = useRef<Pt>({ x: 0, y: 0 });
  const longTimer = useRef<number | null>(null);
  const lastTap = useRef<{ t: number; target: DObject | DText | null; label: { el: DElement; which: 1 | 2 } | null }>({
    t: 0,
    target: null,
    label: null,
  });
  const group = useRef<Set<DObject> | null>(null);
  const [wire, setWire] = useState<WireDraft | null>(null);
  const [hoverPin, setHoverPin] = useState<Pt | null>(null);
  const propsRef = useRef(props);
  const summary = useMemo(
    () => (props.doc.summary?.visible ? summaryLayout(props.doc, props.lang) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.doc, props.version, props.lang],
  );
  const summaryRef = useRef(summary);
  summaryRef.current = summary;
  propsRef.current = props;

  const applyView = useCallback(() => {
    const v = view.current;
    gRef.current?.setAttribute('transform', `translate(${v.x} ${v.y}) scale(${v.k})`);
  }, []);

  const toDoc = useCallback((cx: number, cy: number): Pt => {
    const r = svgRef.current!.getBoundingClientRect();
    const v = view.current;
    return { x: (cx - r.left - v.x) / v.k, y: (cy - r.top - v.y) / v.k };
  }, []);

  const zoomAt = useCallback(
    (sx: number, sy: number, k: number) => {
      const v = view.current;
      const nk = Math.min(MAX_K, Math.max(MIN_K, k));
      v.x = sx - ((sx - v.x) * nk) / v.k;
      v.y = sy - ((sy - v.y) * nk) / v.k;
      v.k = nk;
      applyView();
      propsRef.current.onZoom?.(nk);
    },
    [applyView],
  );

  const fit = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const { doc } = propsRef.current;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const add = (x: number, y: number) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    };
    for (const e of doc.elements) {
      const s = rotatedSize(e.type, e.rotation);
      add(e.location.x, e.location.y);
      add(e.location.x + s.width, e.location.y + s.height);
      add(e.labelLocation.x, e.labelLocation.y);
      add(e.labelLocation.x + 12, e.labelLocation.y + 11);
    }
    for (const l of doc.lines) {
      add(l.cp1.p.x, l.cp1.p.y);
      add(l.cp2.p.x, l.cp2.p.y);
    }
    const w = svg.clientWidth;
    const h = svg.clientHeight;
    if (minX === Infinity) {
      view.current = { x: 16, y: 16, k: Math.min(2, Math.max(1, w / 360)) };
    } else {
      const pad = 16;
      const k = Math.min(3, Math.max(MIN_K, Math.min((w - 2 * pad) / (maxX - minX || 1), (h - 2 * pad) / (maxY - minY || 1))));
      view.current = {
        k,
        x: (w - (maxX - minX) * k) / 2 - minX * k,
        y: (h - (maxY - minY) * k) / 2 - minY * k,
      };
    }
    applyView();
    propsRef.current.onZoom?.(view.current.k);
  }, [applyView]);

  useImperativeHandle(
    ref,
    () => ({
      fit,
      zoomBy(f: number) {
        const svg = svgRef.current;
        if (!svg) return;
        zoomAt(svg.clientWidth / 2, svg.clientHeight / 2, view.current.k * f);
      },
      viewOrigin() {
        const v = view.current;
        return { x: Math.round(-v.x / v.k), y: Math.round(-v.y / v.k) };
      },
    }),
    [fit, zoomAt],
  );

  useEffect(() => {
    applyView();
  }, [applyView]);

  // Leaving run mode or loading a new document drops any picked-up group.
  useEffect(() => {
    group.current = null;
  }, [props.mode, props.doc]);

  const clearLong = () => {
    if (longTimer.current !== null) {
      window.clearTimeout(longTimer.current);
      longTimer.current = null;
    }
  };

  /** Finish an object drag the way the original's MouseUp did. */
  const endGesture = (g: Gesture) => {
    const { doc, onChange, onRelease } = propsRef.current;
    switch (g.kind) {
      case 'element':
        if (g.moved) {
          doc.endMoveElement(g.el);
          onChange();
        }
        break;
      case 'line':
        if (g.moved) {
          doc.endMoveLine(g.line);
          onChange();
        }
        break;
      case 'dot':
        if (g.moved) {
          doc.endMoveDot(g.dot);
          onChange();
        }
        break;
      case 'press':
        onRelease(g.index, g.latched || g.latch);
        break;
      case 'wire':
        setWire(null);
        break;
    }
  };

  const hitRadius = () => Math.max(RADIUS, 14 / view.current.k);

  const onPointerDown = (ev: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current!;
    svg.setPointerCapture(ev.pointerId);
    pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    clearLong();
    setHoverPin(null);

    if (pointers.current.size === 2) {
      // Second finger: whatever the first one was doing becomes a pinch.
      const g = gesture.current;
      if (g.kind === 'wire') setWire(null);
      else endGesture(g);
      const [a, b] = [...pointers.current.values()];
      gesture.current = { kind: 'pinch', startView: { ...view.current }, a0: a, b0: b };
      return;
    }
    if (pointers.current.size > 2) return;

    const { doc, mode, onPress, onChange } = propsRef.current;
    const p = toDoc(ev.clientX, ev.clientY);
    downAt.current = { x: ev.clientX, y: ev.clientY };
    const r = hitRadius();
    const right = ev.button === 2;

    const onSummary = summaryAt(doc, summaryRef.current, p);
    if (mode === 'run') {
      const el = onSummary ? null : elementAt(doc, p, Math.max(2, 6 / view.current.k));
      if (el && PRESSABLE.includes(el.type)) {
        const index = doc.elements.indexOf(el);
        gesture.current = { kind: 'press', index, latched: false, latch: right };
        onPress(index, right);
        if (!right && ev.pointerType !== 'mouse') {
          longTimer.current = window.setTimeout(() => {
            const g = gesture.current;
            if (g.kind === 'press' && g.index === index) {
              g.latched = true;
              navigator.vibrate?.(15);
            }
          }, LONG_PRESS_MS);
        }
        return;
      }
      gesture.current = { kind: 'tap', target: null, startView: { ...view.current }, moved: false };
      return;
    }

    // ---- edit mode
    if (right) {
      const el = elementAt(doc, p, 2 / view.current.k);
      gesture.current = { kind: 'none' };
      if (el) {
        doc.deselect(el);
        onChange();
        propsRef.current.onContextMenu(el, ev.clientX, ev.clientY);
      }
      return;
    }

    if (onSummary && !right) {
      // pnlSummary_MouseDown/MouseMove: the list is dragged directly.
      gesture.current = { kind: 'summary', startDoc: p, startLoc: { ...doc.summary!.location }, moved: false };
      return;
    }

    const grp = group.current;
    if (grp) {
      const el = elementAt(doc, p, 2 / view.current.k);
      if (el && grp.has(el)) {
        gesture.current = { kind: 'group', items: grp, last: { x: Math.round(p.x), y: Math.round(p.y) }, moved: false };
        return;
      }
    }

    const txt = textAt(doc, p, 2 / view.current.k);
    if (txt) {
      const w = txt.size.width || 100;
      const h = txt.size.height || 23;
      const grip = Math.max(10, 16 / view.current.k);
      if (txt.selected) {
        const resize = p.x > txt.location.x + w - grip && p.y > txt.location.y + h - grip;
        gesture.current = { kind: 'text', t: txt, resize, startDoc: p, startLoc: { ...txt.location }, startSize: { width: w, height: h }, moved: false };
      } else {
        gesture.current = { kind: 'tap', target: txt, startView: { ...view.current }, moved: false };
      }
      longTimer.current = window.setTimeout(() => {
        const g = gesture.current;
        const still = (g.kind === 'tap' && !g.moved) || (g.kind === 'text' && !g.moved);
        if (!still) return;
        gesture.current = { kind: 'none' };
        doc.selectText(txt);
        onChange();
        navigator.vibrate?.(15);
        propsRef.current.onTextMenu(txt, downAt.current.x, downAt.current.y);
      }, LONG_PRESS_MS);
      return;
    }

    const lab = labelAt(doc, p, 3 / view.current.k, true);
    if (lab) {
      const loc = lab.which === 1 ? lab.el.labelLocation : lab.el.label2Location;
      gesture.current = { kind: 'label', el: lab.el, which: lab.which, startDoc: p, startLoc: { ...loc }, moved: false };
      return;
    }

    const under = elementAt(doc, p, Math.max(2, 6 / view.current.k));
    const pin = under && under.selected && insideElement(under, p) ? null : doc.findFreePin(p, r);
    if (pin) {
      gesture.current = { kind: 'wire', from: pin };
      const from = pin.pos;
      setWire({ from, to: from, target: null });
      return;
    }

    if (under) {
      if (under.selected) {
        gesture.current = { kind: 'element', el: under, startDoc: p, startLoc: { ...under.location }, moved: false };
      } else {
        gesture.current = { kind: 'tap', target: under, startView: { ...view.current }, moved: false };
      }
      longTimer.current = window.setTimeout(() => {
        const g = gesture.current;
        const still = (g.kind === 'tap' && !g.moved) || (g.kind === 'element' && !g.moved);
        if (!still) return;
        gesture.current = { kind: 'none' };
        doc.deselect(under);
        onChange();
        navigator.vibrate?.(15);
        propsRef.current.onContextMenu(under, downAt.current.x, downAt.current.y);
      }, LONG_PRESS_MS);
      return;
    }

    const dot = doc.findDot(p, r);
    if (dot) {
      gesture.current = dot.selected
        ? { kind: 'dot', dot, moved: false }
        : { kind: 'tap', target: dot, startView: { ...view.current }, moved: false };
      return;
    }
    const line = doc.findLine(p, r);
    if (line) {
      gesture.current =
        line.selected && (line.type === 'h' || line.type === 'v')
          ? { kind: 'line', line, moved: false }
          : { kind: 'tap', target: line, startView: { ...view.current }, moved: false };
      return;
    }
    gesture.current = { kind: 'tap', target: null, startView: { ...view.current }, moved: false };
  };

  const onPointerMove = (ev: React.PointerEvent<SVGSVGElement>) => {
    const { doc, mode, onChange } = propsRef.current;
    if (!pointers.current.has(ev.pointerId)) {
      // Mouse hover: show the red dot on a free pin, as the original did.
      if (ev.pointerType === 'mouse' && mode === 'edit') {
        const pin = doc.findFreePin(toDoc(ev.clientX, ev.clientY), RADIUS + 1);
        const pos = pin ? pin.pos : null;
        setHoverPin((old) => (old?.x === pos?.x && old?.y === pos?.y ? old : pos));
      }
      return;
    }
    pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const g = gesture.current;
    const dist = Math.hypot(ev.clientX - downAt.current.x, ev.clientY - downAt.current.y);
    if (dist > TAP_SLOP) clearLong();

    if (g.kind === 'pinch') {
      const pts = [...pointers.current.values()];
      if (pts.length < 2) return;
      const [a, b] = pts;
      const r = svgRef.current!.getBoundingClientRect();
      const d0 = Math.hypot(g.b0.x - g.a0.x, g.b0.y - g.a0.y) || 1;
      const d1 = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const k = Math.min(MAX_K, Math.max(MIN_K, (g.startView.k * d1) / d0));
      const m0 = { x: (g.a0.x + g.b0.x) / 2 - r.left, y: (g.a0.y + g.b0.y) / 2 - r.top };
      const m1 = { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top };
      // Keep the drawing point that was under the fingers' midpoint under it.
      const dx = (m0.x - g.startView.x) / g.startView.k;
      const dy = (m0.y - g.startView.y) / g.startView.k;
      view.current = { k, x: m1.x - dx * k, y: m1.y - dy * k };
      applyView();
      propsRef.current.onZoom?.(k);
      return;
    }

    const p = toDoc(ev.clientX, ev.clientY);
    switch (g.kind) {
      case 'tap': {
        if (!g.moved && dist <= TAP_SLOP) return;
        g.moved = true;
        view.current.x = g.startView.x + (ev.clientX - downAt.current.x);
        view.current.y = g.startView.y + (ev.clientY - downAt.current.y);
        applyView();
        return;
      }
      case 'element': {
        if (!g.moved && dist <= TAP_SLOP / 2) return;
        g.moved = true;
        const nx = Math.round(g.startLoc.x + p.x - g.startDoc.x);
        const ny = Math.round(g.startLoc.y + p.y - g.startDoc.y);
        doc.moveElement(g.el, nx - g.el.location.x, ny - g.el.location.y);
        onChange();
        return;
      }
      case 'group': {
        const q = { x: Math.round(p.x), y: Math.round(p.y) };
        if (q.x === g.last.x && q.y === g.last.y) return;
        g.moved = true;
        doc.translateGroup(g.items, q.x - g.last.x, q.y - g.last.y);
        g.last = q;
        onChange();
        return;
      }
      case 'text': {
        if (!g.moved && dist <= TAP_SLOP / 2) return;
        g.moved = true;
        const dx = Math.round(p.x - g.startDoc.x);
        const dy = Math.round(p.y - g.startDoc.y);
        if (g.resize) doc.resizeText(g.t, g.startSize.width + dx, g.startSize.height + dy);
        else doc.moveText(g.t, { x: g.startLoc.x + dx, y: g.startLoc.y + dy });
        onChange();
        return;
      }
      case 'summary': {
        if (!g.moved && dist <= TAP_SLOP / 2) return;
        g.moved = true;
        doc.moveSummary({ x: g.startLoc.x + p.x - g.startDoc.x, y: g.startLoc.y + p.y - g.startDoc.y });
        onChange();
        return;
      }
      case 'label': {
        if (!g.moved && dist <= TAP_SLOP / 2) return;
        g.moved = true;
        const loc = g.which === 1 ? g.el.labelLocation : g.el.label2Location;
        const nx = Math.round(g.startLoc.x + p.x - g.startDoc.x);
        const ny = Math.round(g.startLoc.y + p.y - g.startDoc.y);
        doc.moveLabel(g.el, g.which, nx - loc.x, ny - loc.y);
        onChange();
        return;
      }
      case 'line': {
        if (!g.moved && dist <= TAP_SLOP / 2) return;
        g.moved = true;
        doc.moveLine(g.line, { x: Math.round(p.x), y: Math.round(p.y) });
        onChange();
        return;
      }
      case 'dot': {
        if (!g.moved && dist <= TAP_SLOP / 2) return;
        g.moved = true;
        doc.moveDot(g.dot, { x: Math.round(p.x), y: Math.round(p.y) });
        onChange();
        return;
      }
      case 'wire': {
        const r = hitRadius();
        let target: Pt | null = null;
        const pin = doc.findFreePin(p, r);
        if (pin && pin !== g.from) target = pin.pos;
        else {
          const line = doc.findLine(p, r);
          if (line) target = CircuitDocument.projectOnLine(line, p);
        }
        setWire({ from: g.from.pos, to: p, target });
        return;
      }
    }
  };

  const onPointerUp = (ev: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(ev.pointerId)) return;
    pointers.current.delete(ev.pointerId);
    clearLong();
    const g = gesture.current;
    const { doc, onChange } = propsRef.current;

    if (g.kind === 'pinch') {
      // Lifting one finger ends the pinch; the other finger does nothing more.
      if (pointers.current.size === 0) gesture.current = { kind: 'none' };
      else gesture.current = { kind: 'none' };
      return;
    }
    if (pointers.current.size > 0) return;
    gesture.current = { kind: 'none' };

    const p = toDoc(ev.clientX, ev.clientY);
    switch (g.kind) {
      case 'wire': {
        setWire(null);
        const r = hitRadius();
        const pin = doc.findFreePin(p, r);
        if (pin && pin !== g.from) {
          doc.connect(g.from, pin);
          onChange();
          return;
        }
        const line = doc.findLine(p, r);
        if (line) {
          const at = CircuitDocument.projectOnLine(line, p);
          if (at) {
            doc.connectToLine(line, { x: Math.round(at.x), y: Math.round(at.y) }, g.from);
            onChange();
          }
        }
        return;
      }
      case 'tap': {
        if (g.moved || propsRef.current.mode === 'run') return;
        handleTap(g.target, p);
        return;
      }
      case 'element':
        if (!g.moved) handleTap(g.el, p);
        else endGesture(g);
        return;
      case 'label':
        if (!g.moved) handleTap(g.el, p);
        return;
      case 'text':
        if (!g.moved) handleTap(g.t, p);
        return;
      case 'summary':
        return;
      case 'group':
        if (!g.moved) {
          const el = elementAt(doc, p, 2 / view.current.k);
          if (el) handleTap(el, p);
        }
        return;
      default:
        endGesture(g);
    }
  };

  const handleTap = (target: DObject | DText | null, p: Pt) => {
    const { doc, onChange, onEditLabel } = propsRef.current;
    if (target && !(target instanceof DElement) && !(target instanceof DLine) && !(target instanceof DDot)) {
      // A description text: double tap edits it (lblText_DoubleClick).
      const now = performance.now();
      const prev = lastTap.current;
      lastTap.current = { t: now, target, label: null };
      group.current = null;
      if (now - prev.t < DOUBLE_TAP_MS && prev.target === target) {
        propsRef.current.onEditText(target);
        return;
      }
      doc.selectText(target);
      onChange();
      return;
    }
    const now = performance.now();
    const label = labelAt(doc, p, 3 / view.current.k, false);
    const prev = lastTap.current;
    const isDouble = now - prev.t < DOUBLE_TAP_MS;
    lastTap.current = { t: now, target, label };

    if (isDouble && label && prev.label && prev.label.el === label.el && prev.label.which === label.which) {
      onEditLabel(label.el, label.which);
      return;
    }
    if (isDouble && target instanceof DElement && prev.target === target) {
      // Elements_DoubleClick2: pick up the element with everything wired to it.
      const g = doc.connectedGroup(target);
      group.current = g;
      for (const o of g) o.selected = true;
      doc.touch(false);
      onChange();
      return;
    }
    group.current = null;
    doc.deselect((target as DObject | null) ?? (label ? label.el : null));
    onChange();
  };

  const onPointerCancel = (ev: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(ev.pointerId);
    clearLong();
    const g = gesture.current;
    gesture.current = { kind: 'none' };
    if (g.kind === 'wire') setWire(null);
    else endGesture(g);
  };

  const onWheel = (ev: React.WheelEvent<SVGSVGElement>) => {
    const r = svgRef.current!.getBoundingClientRect();
    zoomAt(ev.clientX - r.left, ev.clientY - r.top, view.current.k * Math.exp(-ev.deltaY * 0.0015));
  };

  return (
    <svg
      ref={svgRef}
      className="canvas"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => {
        onPointerUp(e);
        if (pointers.current.size === 0) propsRef.current.onCommit?.();
      }}
      onPointerCancel={(e) => {
        onPointerCancel(e);
        if (pointers.current.size === 0) propsRef.current.onCommit?.();
      }}
      onPointerLeave={() => setHoverPin(null)}
      onWheel={onWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <g ref={gRef}>
        <Drawing
          doc={props.doc}
          version={props.version}
          snapshot={props.snapshot}
          alert={props.alert}
          wire={wire}
          hoverPin={props.mode === 'edit' ? hoverPin : null}
          summary={summary}
        />
      </g>
    </svg>
  );
});
