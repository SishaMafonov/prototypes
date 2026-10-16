import type { Arena } from './match.ts';

export const planetNames = ['Earth', 'Jupiter', 'Lava', 'Ice'] as const;
export type PlanetName = typeof planetNames[number];
export const planetDefinitions: Record<PlanetName, {
  scale: number; color: string; attraction: number; impulse: number;
  body: { x: number; y: number; diameter: number };
}> = {
  // Body bounds exclude the transparent padding of each 543 × 724 sprite frame.
  Jupiter: { scale: 1.15, color: '255, 193, 116', attraction: 6, impulse: 0.12,
    body: { x: 276.5, y: 355, diameter: 498 } },
  Earth: { scale: 1.4, color: '103, 232, 216', attraction: 2.8, impulse: 0.3,
    body: { x: 288.5, y: 356, diameter: 498 } },
  Lava: { scale: 1.7, color: '255, 143, 105', attraction: 1.1, impulse: 0.65,
    body: { x: 267, y: 356, diameter: 503 } },
  Ice: { scale: 1.7, color: '131, 215, 255', attraction: 1.1, impulse: 0.65,
    body: { x: 257.5, y: 356, diameter: 500 } },
};

export type FieldPlanet = {
  id: string;
  name: PlanetName;
  side: 0 | 1;
  x: number;
  y: number;
  diameter: number;
  centerX: number;
  centerY: number;
  bodyRadius: number;
  gravityRadius: number;
};

export function createPlanetField(arena: Arena): FieldPlanet[] {
  const { left, right, top, bottom, width, height, size } = arena;
  const halfWidth = width / 2;
  const jupiterSize = size * 0.4;
  const earthSize = size * 0.3;
  const smallSize = size * 0.15;
  const borderGap = halfWidth * 0.04;
  const verticalGap = (height - smallSize * 2) / 3 * 2.1;
  const centerY = (top + bottom) / 2;
  const jupiterX = left + borderGap + jupiterSize / 2;
  const earthX = left + halfWidth - borderGap - earthSize / 2;
  const middleX = (jupiterX + jupiterSize / 2 + earthX - earthSize / 2) / 2;
  const middleOffsetY = (smallSize + verticalGap) / 2;
  const formation: { name: PlanetName; x: number; y: number; diameter: number }[] = [
    { name: 'Jupiter', x: jupiterX, y: centerY, diameter: jupiterSize },
    { name: 'Ice', x: middleX, y: centerY - middleOffsetY, diameter: smallSize },
    { name: 'Lava', x: middleX, y: centerY + middleOffsetY, diameter: smallSize },
    { name: 'Earth', x: earthX, y: centerY, diameter: earthSize },
  ];
  return formation.flatMap(planet => ([0, 1] as const).map(side => {
    const definition = planetDefinitions[planet.name];
    const spriteScale = planet.diameter / 543;
    const x = side === 0 ? planet.x : left + right - planet.x;
    const bodyRadius = definition.body.diameter * spriteScale / 2;
    return {
      ...planet, id: `${side}:${planet.name}`, side, x,
      centerX: x + (definition.body.x - 543 / 2) * spriteScale * (side === 0 ? 1 : -1),
      centerY: planet.y + (definition.body.y - 724 / 2) * spriteScale,
      bodyRadius, gravityRadius: bodyRadius * definition.scale,
    };
  }));
}
