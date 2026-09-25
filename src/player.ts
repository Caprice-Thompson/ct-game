import {
  Mesh,
  MeshBuilder,
  Ray,
  Quaternion,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  Texture,
  TransformNode,
  UniversalCamera,
  Vector3,
} from "@babylonjs/core";
import { PlayerInput } from "./inputController";

export class Player extends TransformNode {
  public camera!: UniversalCamera;
  public scene: Scene;
  private readonly _input: PlayerInput;
  private _moveDirection = Vector3.Zero();
  private _gravity = Vector3.Zero();
  private _grounded = false;
  private _dashTime = 0;

  private static readonly PLAYER_SPEED = 0.12;
  private static readonly GRAVITY = -0.012;
  private static readonly JUMP_FORCE = 0.28;
  private static readonly DASH_SPEED = 0.42;

  //Player
  public mesh!: Mesh; //outer collisionbox of player

  //Camera
  private _camRoot!: TransformNode;
  private _yTilt!: TransformNode;

  //Parallax background
  private _bgPlane!: Mesh;
  private _bgTexture!: Texture;
  private static readonly PARALLAX_SPEED = 0.02;

  static readonly ORIGINAL_TILT: Vector3 = new Vector3(
    0.5934119456780721,
    0,
    0,
  );

  constructor(
    assets,
    scene: Scene,
    shadowGenerator: ShadowGenerator,
    input: PlayerInput,
  ) {
    super("player", scene);
    this.scene = scene;
    this._setupPlayerCamera();
    this._createParallaxBackground();

    this.mesh = assets.mesh;
    this.mesh.parent = this;

    shadowGenerator.addShadowCaster(assets.mesh); //the player mesh will cast shadows

    this._input = input;
    this.scene.onBeforeRenderObservable.add(() => {
      this.updateFromControls();
      this.updateGroundDetection();
      this._updateCamera();
      this._updateParallaxBackground();
    });
  }

  private updateFromControls(): void {
    const forward = this._camRoot.forward.clone();
    const right = this._camRoot.right.clone();
    forward.y = 0;
    right.y = 0;

    const move = right
      .scale(this._input.horizontal)
      .addInPlace(forward.scale(this._input.vertical));
    if (move.lengthSquared() > 0) {
      move.normalize();
    }

    const inputAmount = Math.min(
      1,
      Math.abs(this._input.horizontal) + Math.abs(this._input.vertical),
    );
    this._moveDirection = move.scale(inputAmount * Player.PLAYER_SPEED);

    if (this._input.dash && this._dashTime <= 0 && move.lengthSquared() > 0) {
      this._moveDirection = move.scale(Player.DASH_SPEED);
      this._dashTime = 0.18;
    }

    const input = new Vector3(
      this._input.horizontalAxis,
      0,
      this._input.verticalAxis,
    );
    if (input.lengthSquared() > 0) {
      const angle =
        Math.atan2(this._input.horizontalAxis, this._input.verticalAxis) +
        this._camRoot.rotation.y;
      const target = Quaternion.FromEulerAngles(0, angle, 0);
      this.mesh.rotationQuaternion = Quaternion.Slerp(
        this.mesh.rotationQuaternion ?? Quaternion.Identity(),
        target,
        0.15,
      );
    }
  }

  private updateGroundDetection(): void {
    const deltaSeconds = Math.min(
      this.scene.getEngine().getDeltaTime() / 1000,
      0.05,
    );
    this._dashTime = Math.max(0, this._dashTime - deltaSeconds);

    if (this._grounded && this._input.jump) {
      this._gravity.y = Player.JUMP_FORCE;
      this._grounded = false;
    } else if (!this.isGrounded()) {
      this._gravity.y = Math.max(
        this._gravity.y + Player.GRAVITY * deltaSeconds * 60,
        -Player.JUMP_FORCE,
      );
      this._grounded = false;
    } else {
      this._gravity.y = 0;
      this._grounded = true;
    }

    this.mesh.moveWithCollisions(this._moveDirection.add(this._gravity));
  }

  private isGrounded(): boolean {
    const origin = this.mesh.getAbsolutePosition().add(new Vector3(0, 0.6, 0));
    const ray = new Ray(origin, Vector3.Down(), 0.7);
    const pick = this.scene.pickWithRay(
      ray,
      (mesh) => mesh.isPickable && mesh.isEnabled() && mesh !== this.mesh,
    );
    return Boolean(pick?.hit);
  }

  private _setupPlayerCamera(): UniversalCamera {
    //root camera parent that handles positioning of the camera to follow the player
    this._camRoot = new TransformNode("root");
    this._camRoot.position = new Vector3(0, 0, 0);
    //to face the player from behind (180 degrees)
    this._camRoot.rotation = new Vector3(0, Math.PI, 0);

    //rotations along the x-axis (up/down tilting)
    let yTilt = new TransformNode("ytilt");
    //adjustments to camera view to point down at our player
    yTilt.rotation = Player.ORIGINAL_TILT;
    this._yTilt = yTilt;
    yTilt.parent = this._camRoot;

    //our actual camera that's pointing at our root's position
    this.camera = new UniversalCamera(
      "cam",
      new Vector3(0, 0, -30),
      this.scene,
    );
    this.camera.lockedTarget = this._camRoot.position;
    this.camera.fov = 0.47350045992678597;
    this.camera.parent = yTilt;

    this.scene.activeCamera = this.camera;
    return this.camera;
  }

  private _updateCamera(): void {
    let centerPlayer = this.mesh.position.y + 2;
    this._camRoot.position = Vector3.Lerp(
      this._camRoot.position,
      new Vector3(this.mesh.position.x, centerPlayer, this.mesh.position.z),
      0.4,
    );
  }

  private _createParallaxBackground(): void {
    this._bgPlane = MeshBuilder.CreatePlane(
      "bgPlane",
      { width: 100, height: 50 },
      this.scene,
    );
    this._bgPlane.isPickable = false;
    // Parent to the camera so it always stays 50 units in front of it, facing back at it
    this._bgPlane.parent = this.camera;
    this._bgPlane.position = new Vector3(0, 0, 50);

    const bgMaterial = new StandardMaterial("bgMat", this.scene);
    bgMaterial.backFaceCulling = false;
    this._bgTexture = new Texture("underwater.jpg", this.scene);
    this._bgTexture.wrapU = Texture.WRAP_ADDRESSMODE;
    this._bgTexture.wrapV = Texture.WRAP_ADDRESSMODE;
    bgMaterial.diffuseTexture = this._bgTexture;
    bgMaterial.disableLighting = true; // prevents scene lights from affecting background
    this._bgPlane.material = bgMaterial;
  }

  private _updateParallaxBackground(): void {
    // Shift texture UVs based on camera position to create motion flow
    this._bgTexture.uOffset =
      this.camera.globalPosition.x * Player.PARALLAX_SPEED;
    this._bgTexture.vOffset =
      this.camera.globalPosition.y * Player.PARALLAX_SPEED;
  }
}
