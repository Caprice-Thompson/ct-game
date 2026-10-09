import { Color3, MeshBuilder, Scene, StandardMaterial } from "@babylonjs/core";
import { stepsForRound } from "./gameRules";

export class Environment {
  private _scene: Scene;

  constructor(scene: Scene) {
    this._scene = scene;
    this._scene.collisionsEnabled = true;
  }

  // round 1 is the base layout; each later round stretches the vertical gaps
  public async load(round = 1) {
    // ground material
    const whiteMaterial = new StandardMaterial("whiteMaterial", this._scene);
    whiteMaterial.diffuseColor = new Color3(0.37506666666666655, 0.58, 0.27259999999999995);

    const box = MeshBuilder.CreateBox(
      "box",
      { width: 28, depth: 28, height: 0.4 },
      this._scene,
    );
    box.position.y = -0.2;
    box.material = whiteMaterial;
    box.isPickable = true;
    box.checkCollisions = true;

    // Floating steps
    const stepMaterial = new StandardMaterial("stepMaterial", this._scene);
    stepMaterial.diffuseColor = new Color3(0.6, 0.6, 0.65);

    const yellowStepMaterial = new StandardMaterial(
      "yellowStepMaterial",
      this._scene,
    );
    yellowStepMaterial.diffuseColor = new Color3(0.95, 0.85, 0.2);

    // Pulse the goal so it reads as the objective: the glow breathes over time
    this._scene.registerBeforeRender(() => {
      const glow = (Math.sin(performance.now() / 300) + 1) / 2; // 0 to 1
      yellowStepMaterial.emissiveColor = new Color3(
        0.6 * glow,
        0.5 * glow,
        0.05 * glow,
      );
    });

    const steps = stepsForRound(round);

    steps.forEach((pos, i) => {
      const step = MeshBuilder.CreateBox(
        `step${i}`,
        { width: 4, depth: 4, height: 0.5 },
        this._scene,
      );
      step.position.set(pos.x, pos.y, pos.z);
      step.material = pos.yellow ? yellowStepMaterial : stepMaterial;
      step.isPickable = true;
      step.checkCollisions = true;
    });
  }
}
