import { Color3, MeshBuilder, Scene, StandardMaterial } from "@babylonjs/core";

export class Environment {
  private _scene: Scene;

  constructor(scene: Scene) {
    this._scene = scene;
    this._scene.collisionsEnabled = true;
  }

  public async load() {
    const whiteMaterial = new StandardMaterial("whiteMaterial", this._scene);
    whiteMaterial.diffuseColor = new Color3(
      0.42900000000000005,
      0.4552166666666663,
      0.55,
    );

    const box = MeshBuilder.CreateBox(
      "box",
      { width: 28, depth: 28, height: 0.4 },
      this._scene,
    );
    box.position.y = -0.2;
    box.material = whiteMaterial;
    box.isPickable = true;
    box.checkCollisions = true;

    // Floating step: a jumpable platform above the ground, using the same
    // collision-mesh approach as the ground
    const stepMaterial = new StandardMaterial("stepMaterial", this._scene);
    stepMaterial.diffuseColor = new Color3(0.6, 0.6, 0.65);

    const step = MeshBuilder.CreateBox(
      "step",
      { width: 4, depth: 4, height: 0.5 },
      this._scene,
    );
    step.position.set(4, 1.5, 4);
    step.material = stepMaterial;
    step.isPickable = true;
    step.checkCollisions = true;
  }
}
