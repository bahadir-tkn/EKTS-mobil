import type { PinDirection, Point } from '../../types/circuit';

const STUB_LENGTH = 16;

function offsetPoint(p: Point, dir: PinDirection, dist: number): Point {
  switch (dir) {
    case 'up':
      return { x: p.x, y: p.y - dist };
    case 'down':
      return { x: p.x, y: p.y + dist };
    case 'left':
      return { x: p.x - dist, y: p.y };
    case 'right':
      return { x: p.x + dist, y: p.y };
  }
}

function isVertical(dir: PinDirection): boolean {
  return dir === 'up' || dir === 'down';
}

/**
 * Removes redundant collinear or duplicate consecutive points so the SVG polyline is crisp.
 */
export function simplifyOrthogonalPoints(points: Point[]): Point[] {
  if (points.length <= 2) return points;

  const deduped: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = deduped[deduped.length - 1];
    if (prev.x !== points[i].x || prev.y !== points[i].y) {
      deduped.push(points[i]);
    }
  }

  if (deduped.length <= 2) return deduped;

  const result: Point[] = [deduped[0]];
  for (let i = 1; i < deduped.length - 1; i++) {
    const a = result[result.length - 1];
    const b = deduped[i];
    const c = deduped[i + 1];
    const sameX = a.x === b.x && b.x === c.x;
    const sameY = a.y === b.y && b.y === c.y;
    if (!sameX && !sameY) {
      result.push(b);
    }
  }
  result.push(deduped[deduped.length - 1]);
  return result;
}

/**
 * Computes clean 90-degree orthogonal schematic routing between two pins.
 * Uses explicit waypoints if provided; otherwise computes an IEC-style Manhattan path.
 */
export function computeOrthogonalPoints(
  from: Point,
  to: Point,
  fromDir: PinDirection,
  toDir: PinDirection,
  waypoints?: Point[]
): Point[] {
  if (waypoints && waypoints.length > 0) {
    return simplifyOrthogonalPoints([from, ...waypoints, to]);
  }

  // Straight direct vertical alignment when pins face each other
  if (from.x === to.x) {
    if ((fromDir === 'down' && toDir === 'up' && from.y <= to.y) ||
        (fromDir === 'up' && toDir === 'down' && from.y >= to.y)) {
      return [from, to];
    }
  }

  // Straight direct horizontal alignment when pins face each other
  if (from.y === to.y) {
    if ((fromDir === 'right' && toDir === 'left' && from.x <= to.x) ||
        (fromDir === 'left' && toDir === 'right' && from.x >= to.x)) {
      return [from, to];
    }
  }

  const p1 = offsetPoint(from, fromDir, STUB_LENGTH);
  const p2 = offsetPoint(to, toDir, STUB_LENGTH);

  const fromVert = isVertical(fromDir);
  const toVert = isVertical(toDir);

  if (fromVert && toVert) {
    // Both exit vertically
    const movingNaturally =
      (fromDir === 'down' && toDir === 'up' && p1.y <= p2.y) ||
      (fromDir === 'up' && toDir === 'down' && p1.y >= p2.y);

    if (movingNaturally) {
      const midY = Math.round((p1.y + p2.y) / 2);
      return simplifyOrthogonalPoints([
        from,
        { x: from.x, y: midY },
        { x: to.x, y: midY },
        to,
      ]);
    }

    // Same direction (e.g. both up for parallel top rail, or both down for common bottom rail)
    if (fromDir === toDir) {
      const railY = fromDir === 'up' ? Math.min(p1.y, p2.y) : Math.max(p1.y, p2.y);
      return simplifyOrthogonalPoints([
        from,
        { x: from.x, y: railY },
        { x: to.x, y: railY },
        to,
      ]);
    }

    // Opposite directions but target is "behind" source — route around via midpoint X
    const midX = Math.round((from.x + to.x) / 2);
    const detourX = from.x === to.x ? from.x + 40 : midX;
    return simplifyOrthogonalPoints([
      from,
      p1,
      { x: detourX, y: p1.y },
      { x: detourX, y: p2.y },
      p2,
      to,
    ]);
  }

  if (!fromVert && !toVert) {
    // Both exit horizontally
    const movingNaturally =
      (fromDir === 'right' && toDir === 'left' && p1.x <= p2.x) ||
      (fromDir === 'left' && toDir === 'right' && p1.x >= p2.x);

    if (movingNaturally) {
      const midX = Math.round((p1.x + p2.x) / 2);
      return simplifyOrthogonalPoints([
        from,
        { x: midX, y: from.y },
        { x: midX, y: to.y },
        to,
      ]);
    }

    if (fromDir === toDir) {
      const railX = fromDir === 'left' ? Math.min(p1.x, p2.x) : Math.max(p1.x, p2.x);
      return simplifyOrthogonalPoints([
        from,
        { x: railX, y: from.y },
        { x: railX, y: to.y },
        to,
      ]);
    }

    const midY = Math.round((from.y + to.y) / 2);
    const detourY = from.y === to.y ? from.y + 40 : midY;
    return simplifyOrthogonalPoints([
      from,
      p1,
      { x: p1.x, y: detourY },
      { x: p2.x, y: detourY },
      p2,
      to,
    ]);
  }

  // One vertical, one horizontal: clean L-shape or Z-shape with stubs
  if (fromVert && !toVert) {
    return simplifyOrthogonalPoints([
      from,
      p1,
      { x: p2.x, y: p1.y },
      p2,
      to,
    ]);
  }

  return simplifyOrthogonalPoints([
    from,
    p1,
    { x: p1.x, y: p2.y },
    p2,
    to,
  ]);
}

export function pointsToSvgPath(points: Point[]): string {
  if (points.length === 0) return '';
  return points
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`)
    .join(' ');
}
