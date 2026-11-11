export type Point = { x: number; y: number };

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

// Ordre des points : p1 (coin externe), p2, p3 (haut), p4 (coin interne), p5, p6 (bas)
export function eyeAspectRatio(p: Point[]): number {
  const [p1, p2, p3, p4, p5, p6] = p;
  return (dist(p2, p6) + dist(p3, p5)) / (2 * dist(p1, p4));
}

// Indices du maillage MediaPipe (468 points)
export const RIGHT_EYE = [33, 160, 158, 133, 153, 144];
export const LEFT_EYE = [362, 385, 387, 263, 373, 380];
