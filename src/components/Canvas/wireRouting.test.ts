import test from 'node:test';
import assert from 'node:assert/strict';
import { computeOrthogonalPoints, pointsToSvgPath } from './wireRouting';

test('produces straight line for aligned facing vertical pins', () => {
  const pts = computeOrthogonalPoints({ x: 180, y: 100 }, { x: 180, y: 200 }, 'down', 'up');
  assert.deepEqual(pts, [
    { x: 180, y: 100 },
    { x: 180, y: 200 },
  ]);
  assert.equal(pointsToSvgPath(pts), 'M 180 100 L 180 200');
});

test('produces 90-degree orthogonal segments for offset vertical pins', () => {
  const pts = computeOrthogonalPoints({ x: 180, y: 100 }, { x: 320, y: 200 }, 'down', 'up');
  assert.ok(pts.length >= 3);
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    assert.ok(
      prev.x === curr.x || prev.y === curr.y,
      `Segment ${i} must be strictly orthogonal`
    );
  }
});

test('honors explicit waypoints and simplifies collinear points', () => {
  const pts = computeOrthogonalPoints(
    { x: 180, y: 280 },
    { x: 320, y: 320 },
    'down',
    'up',
    [
      { x: 180, y: 300 },
      { x: 320, y: 300 },
    ]
  );
  assert.deepEqual(pts, [
    { x: 180, y: 280 },
    { x: 180, y: 300 },
    { x: 320, y: 300 },
    { x: 320, y: 320 },
  ]);
});
