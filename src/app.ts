import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  FreeCamera,
  Color4,
  Matrix,
  StandardMaterial,
  Color3,
  PointLight,
  ShadowGenerator,
  Effect,
  PostProcess,
} from "@babylonjs/core";
import {
  AdvancedDynamicTexture,
  Button,
  Control,
  Image,
  Rectangle,
  TextBlock,
} from "@babylonjs/gui";
import { Environment } from "./environment";
import { Player } from "./player";
import { PlayerInput } from "./inputController";

//enum for states
enum State {
  START = 0,
  GAME = 1,
  LOSE = 2,
  CUTSCENE = 3,
}

class App {
  // General Entire Application
  private _scene: Scene;
  private _canvas: HTMLCanvasElement;
  private _engine: Engine;

  //Scene - related
  private _state: number = 0;
  private _gamescene!: Scene;
  public assets!: { mesh: Mesh };
  private _transition: boolean = false;
  private _player!: Player;

  constructor() {
    this._canvas = this._createCanvas();

    // initialize babylon scene and engine
    this._engine = new Engine(this._canvas, true);
    this._scene = new Scene(this._engine);

    // hide/show the Inspector
    window.addEventListener("keydown", (ev) => {
      // Shift+Ctrl+Alt+I
      if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
        if (this._scene.debugLayer.isVisible()) {
          this._scene.debugLayer.hide();
        } else {
          this._scene.debugLayer.show();
        }
      }
    });
    this._main();
  }

  private _createCanvas(): HTMLCanvasElement {
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.width = "100%";
    document.documentElement.style.height = "100%";
    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";
    document.body.style.overflow = "hidden";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.body.style.margin = "0";
    document.body.style.padding = "0";

    //create the canvas html element and attach it to the webpage
    this._canvas = document.createElement("canvas");
    this._canvas.style.width = "100%";
    this._canvas.style.height = "100%";
    this._canvas.id = "gameCanvas";
    document.body.appendChild(this._canvas);

    return this._canvas;
  }

  private async _main(): Promise<void> {
    await this._goToStart();

    // Register a render loop to repeatedly render the scene
    this._engine.runRenderLoop(() => {
      this._scene.render();
    });

    //resize if the screen is resized/rotated
    window.addEventListener("resize", () => {
      this._engine.resize();
    });
  }

  private async _goToStart() {
    this._engine.displayLoadingUI();

    this._scene.detachControl();
    let scene = new Scene(this._engine);
    scene.clearColor = new Color4(1, 1, 1, 1);
    let camera = new FreeCamera("camera1", new Vector3(0, 0, 0), scene);
    camera.setTarget(Vector3.Zero());
    //...do gui related stuff

    const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    guiMenu.idealHeight = 720;

    //background image
    const imageRect = new Rectangle("titleContainer");
    imageRect.width = 0.8;
    imageRect.thickness = 0;
    guiMenu.addControl(imageRect);

    const startbg = new Image("startbg", "mountains-bg.jpg");
    imageRect.addControl(startbg);

    const title = new TextBlock("title", "CT Productions");
    title.resizeToFit = true;
    title.fontFamily = "Ceviche One";
    title.fontSize = "64px";
    title.color = "white";
    title.resizeToFit = true;
    title.top = "14px";
    title.width = 0.8;
    title.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    imageRect.addControl(title);

    const startBtn = Button.CreateSimpleButton("start", "PLAY");
    startBtn.fontFamily = "Viga";
    startBtn.width = 0.2;
    startBtn.height = "40px";
    startBtn.color = "white";
    startBtn.top = "-14px";
    startBtn.thickness = 0;
    startBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    imageRect.addControl(startBtn);

    //set up transition effect : modified version of https://www.babylonjs-playground.com/#2FGYE8#0
    Effect.RegisterShader(
      "fade",
      "precision highp float;" +
        "varying vec2 vUV;" +
        "uniform sampler2D textureSampler; " +
        "uniform float fadeLevel; " +
        "void main(void){" +
        "vec4 baseColor = texture2D(textureSampler, vUV) * fadeLevel;" +
        "baseColor.a = 1.0;" +
        "gl_FragColor = baseColor;" +
        "}",
    );

    let fadeLevel = 1.0;
    this._transition = false;
    scene.registerBeforeRender(() => {
      if (this._transition) {
        fadeLevel -= 0.05;
        if (fadeLevel <= 0) {
          this._transition = false;
          //go straight from the start screen into the game
          this._engine.displayLoadingUI();
          this._setUpGame().then(() => {
            this._goToGame();
          });
        }
      }
    });

    //this handles interactions with the start button attached to the scene
    startBtn.onPointerDownObservable.add(() => {
      //fade screen
      const postProcess = new PostProcess(
        "Fade",
        "fade",
        ["fadeLevel"],
        null,
        1.0,
        camera,
      );
      postProcess.onApply = (effect) => {
        effect.setFloat("fadeLevel", fadeLevel);
      };
      this._transition = true;

      scene.detachControl(); //observables disabled
    });

    //--SCENE FINISHED LOADING--
    await scene.whenReadyAsync();
    this._engine.hideLoadingUI();
    //lastly set the current state to the start state and set the scene to the start scene
    this._scene.dispose();
    this._scene = scene;
    this._state = State.START;
  }

  private async _goToLose(): Promise<void> {
    this._engine.displayLoadingUI();

    //--SCENE SETUP--
    this._scene.detachControl();
    let scene = new Scene(this._engine);
    scene.clearColor = new Color4(1, 1, 1, 1);
    let camera = new FreeCamera("camera1", new Vector3(0, 0, 0), scene);
    camera.setTarget(Vector3.Zero());

    //--GUI--
    const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    const mainBtn = Button.CreateSimpleButton("mainmenu", "MAIN MENU");
    mainBtn.width = 0.2;
    mainBtn.height = "40px";
    mainBtn.color = "white";
    guiMenu.addControl(mainBtn);
    //this handles interactions with the start button attached to the scene
    mainBtn.onPointerUpObservable.add(() => {
      this._goToStart();
    });

    //--SCENE FINISHED LOADING--
    await scene.whenReadyAsync();
    this._engine.hideLoadingUI(); //when the scene is ready, hide loading
    //lastly set the current state to the lose state and set the scene to the lose scene
    this._scene.dispose();
    this._scene = scene;
    this._state = State.LOSE;
  }

  private async _setUpGame() {
    //--CREATE SCENE--
    let scene = new Scene(this._engine);
    this._gamescene = scene;

    //--CREATE ENVIRONMENT--
    const environment = new Environment(scene);
    //Load environment and character assets
    await environment.load(); //environment
    await this._loadCharacterAssets(scene); //character
  }

  private async _goToGame() {
    //--SETUP SCENE--
    this._scene.detachControl();
    let scene = this._gamescene;
    scene.clearColor = new Color4(1, 1, 1, 1);

    //--GUI--
    const playerUI = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    //dont detect any inputs from this ui while the game is loading
    scene.detachControl();

    //create a simple button
    const loseBtn = Button.CreateSimpleButton("lose", "LOSE");
    loseBtn.width = 0.2;
    loseBtn.height = "40px";
    loseBtn.color = "white";
    loseBtn.top = "-14px";
    loseBtn.thickness = 0;
    loseBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    playerUI.addControl(loseBtn);

    //this handles interactions with the start button attached to the scene
    loseBtn.onPointerDownObservable.add(() => {
      this._goToLose();
      scene.detachControl(); //observables disabled
    });

    //primitive character and setting
    this._initializeGame(scene);

    //--WHEN SCENE FINISHED LOADING--
    await scene.whenReadyAsync();
    //get rid of start scene, switch to gamescene and change states
    this._scene.dispose();
    this._state = State.GAME;
    this._scene = scene;
    this._engine.hideLoadingUI();
    //the game is ready, attach control back
    this._scene.attachControl();
  }

  private async _loadCharacterAssets(scene: Scene): Promise<void> {
    const outer = MeshBuilder.CreateBox("outer", { size: 2 }, scene);
    outer.isPickable = false;
    outer.checkCollisions = true;
    // move origin to the bottom of the cube so ground detection lines up with its feet
    outer.bakeTransformIntoVertices(Matrix.Translation(0, 1, 0));
    outer.ellipsoid = new Vector3(1, 1, 1);
    outer.ellipsoidOffset = new Vector3(0, 1, 0);

    const bodyMaterial = new StandardMaterial("body_mat", scene);
    bodyMaterial.diffuseColor = new Color3(0.09, 0.11, 0.87); // blue
    outer.material = bodyMaterial;

    this.assets = { mesh: outer };
  }

  private _initializeGame(scene: Scene): void {
    new HemisphericLight("HemiLight", new Vector3(0, 1, 0), scene);

    const light = new PointLight("sparklight", new Vector3(0, 0, 0), scene);
    light.diffuse = new Color3(0.086, 0.11, 0.153);
    light.intensity = 35;
    light.radius = 1;

    const shadowGenerator = new ShadowGenerator(1024, light);
    shadowGenerator.darkness = 0.4;

    const input = new PlayerInput(scene);
    this._player = new Player(this.assets, scene, shadowGenerator, input);
  }

  public dispose(): void {
    this._engine.stopRenderLoop();
    this._engine.dispose();
    this._canvas.remove();
  }
}

let currentApp = new App();

// Self-accept so edits swap the app instance in place instead of a full page reload
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    currentApp.dispose();
  });
  import.meta.hot.accept(() => {
    currentApp = new App();
  });
}
