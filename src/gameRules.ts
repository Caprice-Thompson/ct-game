// Pure game rules, kept free of the rendering engine so they can be unit tested.

export interface StepLayout {
  x: number;
  y: number;
  z: number;
  yellow?: boolean;
}

// The staircase before any per-round stretching. Rises between steps are uneven.
export const BASE_STEPS: StepLayout[] = [
  { x: 4, y: 1.5, z: 4 },
  { x: 7, y: 3.2, z: 1 },
  { x: 2, y: 5.4, z: -3 },
  { x: -3, y: 7.1, z: -1 },
  { x: -6, y: 9.3, z: 3 },
  { x: -9, y: 11.6, z: -2, yellow: true },
];

// Each round multiplies every step height, which also widens the uneven gaps.
export const gapFactorForRound = (round: number): number =>
  1 + (round - 1) * 0.5;

export const stepsForRound = (round: number): StepLayout[] => {
  const gapFactor = gapFactorForRound(round);
  return BASE_STEPS.map((step) => ({ ...step, y: step.y * gapFactor }));
};

// Falling below the platform ends the round.
export const FALL_THRESHOLD = -5;

// The player wins by landing on the yellow step: at its top surface and
// inside its footprint.
const STEP_HALF_HEIGHT = 0.25;
const STEP_HALF_WIDTH = 2;
const LANDING_TOLERANCE = 0.3;

export const hasLandedOnGoal = (
  player: { x: number; y: number; z: number },
  goal: { x: number; y: number; z: number },
): boolean => {
  const goalTop = goal.y + STEP_HALF_HEIGHT;
  return (
    player.y >= goalTop - LANDING_TOLERANCE &&
    Math.abs(player.x - goal.x) < STEP_HALF_WIDTH &&
    Math.abs(player.z - goal.z) < STEP_HALF_WIDTH
  );
};

// Falling cubes: delays climb by a fixed step from the first to the last.
export interface FallingCubeSpec {
  x: number;
  z: number;
  delay: number;
}

export const fallingCubeDelays = (
  firstDelay: number,
  delayStep: number,
  lastDelay: number,
): number[] => {
  const count = (lastDelay - firstDelay) / delayStep + 1;
  return Array.from({ length: count }, (_, i) => firstDelay + i * delayStep);
};

// One frame of a cube's fall. Landed cubes stay put on the ground.
export const stepFallingCube = (
  positionY: number,
  velocity: number,
  gravity: number,
  groundY: number,
): { positionY: number; velocity: number; landed: boolean } => {
  const nextVelocity = velocity + gravity;
  const nextY = positionY - nextVelocity;
  if (nextY <= groundY) {
    return { positionY: groundY, velocity: nextVelocity, landed: true };
  }
  return { positionY: nextY, velocity: nextVelocity, landed: false };
};
