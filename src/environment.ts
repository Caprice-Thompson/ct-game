import { Color3, MeshBuilder, Scene, StandardMaterial, Texture } from "@babylonjs/core";
import { stepsForRound } from "./gameRules";

export class Environment {
  private _scene: Scene;

  constructor(scene: Scene) {
    this._scene = scene;
    this._scene.collisionsEnabled = true;
  }

  // round 1 is the base layout; each later round stretches the vertical gaps
  public async load(round = 1) {
    const groundMaterial = new StandardMaterial("groundMaterial", this._scene);
    groundMaterial.specularColor = new Color3(0, 0, 0);
    groundMaterial.diffuseColor = new Color3(1, 1, 1);
    groundMaterial.disableLighting = true;

    const box = MeshBuilder.CreateBox(
      "box",
      { width: 28, depth: 28, height: 0.4 },
      this._scene,
    );
    box.position.y = -0.2;
    box.material = groundMaterial;
    box.isPickable = true;
    box.checkCollisions = true;

    const applyRetroBlock = (mat: StandardMaterial, diffuse: Color3) => {
      mat.diffuseColor = diffuse;
      mat.specularColor = new Color3(0, 0, 0);
      mat.emissiveColor = diffuse.scale(0.15);
    };

    const tetrisPalette = [
      new Color3(0, 0.94, 0.94),
      new Color3(0, 0, 0.94),
      new Color3(0.94, 0.63, 0),
      new Color3(0, 0.94, 0),
      new Color3(0.63, 0, 0.94),
      new Color3(0.94, 0, 0),
    ];
    const stepMaterials = tetrisPalette.map((color, i) => {
      const mat = new StandardMaterial(`stepMaterial${i}`, this._scene);
      applyRetroBlock(mat, color);
      return mat;
    });

    const yellowStepMaterial = new StandardMaterial(
      "yellowStepMaterial",
      this._scene,
    );
    applyRetroBlock(yellowStepMaterial, new Color3(0.94, 0.94, 0));

    this._scene.registerBeforeRender(() => {
      const glow = (Math.sin(performance.now() / 300) + 1) / 2;
      yellowStepMaterial.emissiveColor = new Color3(0.35 * glow, 0.35 * glow, 0);
    });

    const steps = stepsForRound(round);

    steps.forEach((pos, i) => {
      const step = MeshBuilder.CreateBox(
        `step${i}`,
        { width: 4, depth: 4, height: 0.5 },
        this._scene,
      );
      step.position.set(pos.x, pos.y, pos.z);
      step.material = pos.yellow
        ? yellowStepMaterial
        : stepMaterials[i % stepMaterials.length];
      step.isPickable = true;
      step.checkCollisions = true;
    });
  }
}
