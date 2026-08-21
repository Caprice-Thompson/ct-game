import {
  Color3,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";

export class Environment {
  private _scene: Scene;

  constructor(scene: Scene) {
    this._scene = scene;
    this._scene.collisionsEnabled = true;
  }

  public async load() {
    const trackMaterial = new StandardMaterial("trackMaterial", this._scene);
    trackMaterial.diffuseColor = new Color3(0.12, 0.13, 0.16);

    const infieldMaterial = new StandardMaterial(
      "infieldMaterial",
      this._scene,
    );
    infieldMaterial.diffuseColor = new Color3(0.12, 0.28, 0.14);

    const barrierMaterial = new StandardMaterial(
      "barrierMaterial",
      this._scene,
    );
    barrierMaterial.diffuseColor = new Color3(0.75, 0.18, 0.08);

    // Continuous base keeps the infield walkable while the surrounding lanes
    // give the scene the shape of a racing circuit.
    const trackBase = MeshBuilder.CreateBox(
      "trackBase",
      { width: 28, depth: 28, height: 0.4 },
      this._scene,
    );
    trackBase.position.y = -0.2;
    trackBase.material = trackMaterial;
    trackBase.isPickable = true;
    trackBase.checkCollisions = true;

    const infield = MeshBuilder.CreateBox(
      "infield",
      { width: 14, depth: 14, height: 0.08 },
      this._scene,
    );
    infield.position.y = 0.04;
    infield.material = infieldMaterial;

    const roadSegments = [
      {
        name: "trackNorth",
        width: 28,
        depth: 5,
        position: new Vector3(0, 0.08, -11.5),
      },
      {
        name: "trackSouth",
        width: 28,
        depth: 5,
        position: new Vector3(0, 0.08, 11.5),
      },
      {
        name: "trackWest",
        width: 5,
        depth: 18,
        position: new Vector3(-11.5, 0.08, 0),
      },
      {
        name: "trackEast",
        width: 5,
        depth: 18,
        position: new Vector3(11.5, 0.08, 0),
      },
    ];

    for (const segment of roadSegments) {
      const road = MeshBuilder.CreateBox(
        segment.name,
        { width: segment.width, depth: segment.depth, height: 0.08 },
        this._scene,
      );
      road.position = segment.position;
      road.material = trackMaterial;
      road.isPickable = true;
      road.checkCollisions = true;
    }

    const barriers = [
      {
        name: "barrierNorth",
        width: 28,
        depth: 0.35,
        position: new Vector3(0, 0.55, -13.8),
      },
      {
        name: "barrierSouth",
        width: 28,
        depth: 0.35,
        position: new Vector3(0, 0.55, 13.8),
      },
      {
        name: "barrierWest",
        width: 0.35,
        depth: 28,
        position: new Vector3(-13.8, 0.55, 0),
      },
      {
        name: "barrierEast",
        width: 0.35,
        depth: 28,
        position: new Vector3(13.8, 0.55, 0),
      },
    ];

    for (const barrierData of barriers) {
      const barrier = MeshBuilder.CreateBox(
        barrierData.name,
        {
          width: barrierData.width,
          depth: barrierData.depth,
          height: 1,
        },
        this._scene,
      );
      barrier.position = barrierData.position;
      barrier.material = barrierMaterial;
      barrier.isPickable = true;
      barrier.checkCollisions = true;
    }
  }
}
