import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BASE_STEPS,
  FALL_THRESHOLD,
  fallingCubeDelays,
  gapFactorForRound,
  hasLandedOnGoal,
  stepFallingCube,
  stepsForRound,
} from "../gameRules.ts";

describe("gapFactorForRound", () => {
  it("starts at 1 on round 1 and grows by 0.5 each round", () => {
    assert.equal(gapFactorForRound(1), 1);
    assert.equal(gapFactorForRound(2), 1.5);
    assert.equal(gapFactorForRound(3), 2);
  });
});

describe("stepsForRound", () => {
  it("keeps the base heights on round 1", () => {
    const steps = stepsForRound(1);
    assert.deepEqual(
      steps.map((step) => step.y),
      BASE_STEPS.map((step) => step.y),
    );
  });

  it("keeps the horizontal layout while lifting the heights", () => {
    const steps = stepsForRound(3);
    steps.forEach((step, i) => {
      assert.equal(step.x, BASE_STEPS[i].x);
      assert.equal(step.z, BASE_STEPS[i].z);
      assert.equal(step.y, BASE_STEPS[i].y * 2);
    });
  });

  it("widens the uneven rises between steps each round", () => {
    const rises = (round: number) => {
      const heights = stepsForRound(round).map((step) => step.y);
      return heights.slice(1).map((height, i) => height - heights[i]);
    };
    const roundOne = rises(1);
    const roundTwo = rises(2);

    // The base staircase is not a uniform flight of steps.
    assert.equal(new Set(roundOne).size, roundOne.length);
    // Every gap grows, and by the same factor.
    roundTwo.forEach((rise, i) =>
      assert.ok(Math.abs(rise - roundOne[i] * 1.5) < 1e-9),
    );
  });

  it("keeps exactly one yellow step, always the last and the highest", () => {
    const steps = stepsForRound(2);
    const yellowSteps = steps.filter((step) => step.yellow);
    assert.equal(yellowSteps.length, 1);
    assert.equal(yellowSteps[0], steps[steps.length - 1]);
    assert.ok(steps.every((step) => step.y <= yellowSteps[0].y));
  });
});

describe("hasLandedOnGoal", () => {
  const goal = { x: -9, y: 11.6, z: -2 };

  it("counts a player standing on the step as a win", () => {
    assert.equal(hasLandedOnGoal({ x: -9, y: 11.85, z: -2 }, goal), true);
  });

  it("allows a small margin below the top surface", () => {
    assert.equal(hasLandedOnGoal({ x: -9, y: 11.55, z: -2 }, goal), true);
  });

  it("rejects a player who is short of the step", () => {
    assert.equal(hasLandedOnGoal({ x: -9, y: 11, z: -2 }, goal), false);
  });

  it("rejects a player at the right height but outside the footprint", () => {
    assert.equal(hasLandedOnGoal({ x: -6.9, y: 11.85, z: -2 }, goal), false);
    assert.equal(hasLandedOnGoal({ x: -9, y: 11.85, z: 0.1 }, goal), false);
  });

  it("accepts a player right at the edge of the footprint", () => {
    assert.equal(hasLandedOnGoal({ x: -7.1, y: 11.85, z: -0.1 }, goal), true);
  });
});

describe("falling off", () => {
  it("treats anything below the threshold as a loss", () => {
    assert.ok(-5.1 < FALL_THRESHOLD);
    assert.ok(!(-5 < FALL_THRESHOLD));
    assert.ok(!(0 < FALL_THRESHOLD));
  });
});

describe("fallingCubeDelays", () => {
  it("climbs by a fixed step from the first delay to the last", () => {
    assert.deepEqual(fallingCubeDelays(0, 1000, 4000), [0, 1000, 2000, 3000, 4000]);
  });

  it("includes both ends of the range", () => {
    const delays = fallingCubeDelays(10, 10, 40000);
    assert.equal(delays[0], 10);
    assert.equal(delays[delays.length - 1], 40000);
    assert.equal(delays.length, 4000);
  });

  it("never decreases", () => {
    const delays = fallingCubeDelays(0, 1000, 40000);
    delays.slice(1).forEach((delay, i) => assert.ok(delay > delays[i]));
  });
});

describe("stepFallingCube", () => {
  const gravity = 0.00005;
  const groundY = 1;

  it("accelerates downward", () => {
    const first = stepFallingCube(30, 0, gravity, groundY);
    const second = stepFallingCube(first.positionY, first.velocity, gravity, groundY);
    assert.ok(first.positionY < 30);
    assert.ok(second.positionY < first.positionY);
    assert.ok(first.positionY - second.positionY > 30 - first.positionY);
    assert.equal(first.landed, false);
  });

  it("snaps to the ground and stays there", () => {
    const landing = stepFallingCube(1.00001, 0.001, gravity, groundY);
    assert.equal(landing.landed, true);
    assert.equal(landing.positionY, groundY);
  });

  it("reaches the ground eventually and never passes it", () => {
    let positionY = 30;
    let velocity = 0;
    let landed = false;
    let frames = 0;
    while (!landed && frames < 100000) {
      ({ positionY, velocity, landed } = stepFallingCube(
        positionY,
        velocity,
        gravity,
        groundY,
      ));
      frames++;
    }
    assert.equal(landed, true);
    assert.equal(positionY, groundY);
  });
});
