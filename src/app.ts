import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
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
  Quaternion,
  StandardMaterial,
  Color3,
  PointLight,
  ShadowGenerator,
  Effect,
  PostProcess,
  AbstractSound,
  Space,
  Axis,
  Vector4,
  Texture,
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
import { Hud } from "./ui";
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
  private _cutScene!: Scene;
  private _gamescene!: Scene;
  private _environment;
  public assets;
  private _transition: boolean = false;
  private _player!: Player;
  private _ui!: Hud;
  public game!: AbstractSound;

  constructor() {
    this._canvas = this._createCanvas();

    // initialize babylon scene and engine
    this._engine = new Engine(this._canvas, true);
    this._scene = new Scene(this._engine);

    var camera: ArcRotateCamera = new ArcRotateCamera(
      "Camera",
      Math.PI / 2,
      Math.PI / 2,
      2,
      Vector3.Zero(),
      this._scene,
    );
    camera.attachControl(this._canvas, true);
    var light1: HemisphericLight = new HemisphericLight(
      "light1",
      new Vector3(1, 1, 0),
      this._scene,
    );
    var sphere: Mesh = MeshBuilder.CreateSphere(
      "sphere",
      { diameter: 1 },
      this._scene,
    );

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
    // void this._goToStart();

    // // run the main render loop
    // this._engine.runRenderLoop(() => {
    //   this._scene.render();
    // });
  }

  private _createCanvas(): HTMLCanvasElement {
    //Commented out for development
    document.documentElement.style["overflow"] = "hidden";
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
      switch (this._state) {
        case State.START:
          this._scene.render();
          break;
        case State.CUTSCENE:
          this._scene.render();
          break;
        case State.GAME:
          this._scene.render();
          break;
        case State.LOSE:
          this._scene.render();
          break;
        default:
          break;
      }
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
    scene.clearColor = new Color4(0, 0, 0, 1);
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
          this._goToCutScene();
          this._transition = false;
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
    scene.clearColor = new Color4(0, 0, 0, 1);
    let camera = new FreeCamera("camera1", new Vector3(0, 0, 0), scene);
    camera.setTarget(Vector3.Zero());

    //--GUI--
    const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    const mainBtn = Button.CreateSimpleButton("mainmenu", "MAIN MENU");
    const startAgainBtn = Button.CreateSimpleButton(
      "startagain",
      "START AGAIN",
    );
    startAgainBtn.width = 0.2;
    startAgainBtn.height = "40px";
    startAgainBtn.color = "white";
    startAgainBtn.top = "14px";
    startAgainBtn.thickness = 0;
    startAgainBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    guiMenu.addControl(startAgainBtn);
    startAgainBtn.onPointerUpObservable.add(() => {
      this._goToStart();
    });
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
  private async _goToCutScene(): Promise<void> {
    this._engine.displayLoadingUI();
    //--SETUP SCENE--
    //dont detect any inputs from this ui while the game is loading
    this._scene.detachControl();
    this._cutScene = new Scene(this._engine);
    let camera = new FreeCamera(
      "camera1",
      new Vector3(0, 0, 0),
      this._cutScene,
    );
    camera.setTarget(Vector3.Zero());
    this._cutScene.clearColor = new Color4(0, 0, 0, 1);

    //--GUI--
    const cutScene = AdvancedDynamicTexture.CreateFullscreenUI("cutscene");
    let transition = 0; //increment based on dialogue
    let canplay = false;
    let finished_anim = false;
    let anims_loaded = 0;

    //Animations
    const beginning_anim = new Image(
      "sparkLife",
      "./sprites/beginning_anim.png",
    );
    beginning_anim.stretch = Image.STRETCH_UNIFORM;
    beginning_anim.cellId = 0;
    beginning_anim.cellHeight = 480;
    beginning_anim.cellWidth = 480;
    beginning_anim.sourceWidth = 480;
    beginning_anim.sourceHeight = 480;
    cutScene.addControl(beginning_anim);
    beginning_anim.onImageLoadedObservable.add(() => {
      anims_loaded++;
    });
    const working_anim = new Image("sparkLife", "./sprites/working_anim.png");
    working_anim.stretch = Image.STRETCH_UNIFORM;
    working_anim.cellId = 0;
    working_anim.cellHeight = 480;
    working_anim.cellWidth = 480;
    working_anim.sourceWidth = 480;
    working_anim.sourceHeight = 480;
    working_anim.isVisible = false;
    cutScene.addControl(working_anim);
    working_anim.onImageLoadedObservable.add(() => {
      anims_loaded++;
    });
    const dropoff_anim = new Image("sparkLife", "./sprites/dropoff_anim.png");
    dropoff_anim.stretch = Image.STRETCH_UNIFORM;
    dropoff_anim.cellId = 0;
    dropoff_anim.cellHeight = 480;
    dropoff_anim.cellWidth = 480;
    dropoff_anim.sourceWidth = 480;
    dropoff_anim.sourceHeight = 480;
    dropoff_anim.isVisible = false;
    cutScene.addControl(dropoff_anim);
    dropoff_anim.onImageLoadedObservable.add(() => {
      anims_loaded++;
    });
    const leaving_anim = new Image("sparkLife", "./sprites/leaving_anim.png");
    leaving_anim.stretch = Image.STRETCH_UNIFORM;
    leaving_anim.cellId = 0;
    leaving_anim.cellHeight = 480;
    leaving_anim.cellWidth = 480;
    leaving_anim.sourceWidth = 480;
    leaving_anim.sourceHeight = 480;
    leaving_anim.isVisible = false;
    cutScene.addControl(leaving_anim);
    leaving_anim.onImageLoadedObservable.add(() => {
      anims_loaded++;
    });
    const watermelon_anim = new Image(
      "sparkLife",
      "./sprites/watermelon_anim.png",
    );
    watermelon_anim.stretch = Image.STRETCH_UNIFORM;
    watermelon_anim.cellId = 0;
    watermelon_anim.cellHeight = 480;
    watermelon_anim.cellWidth = 480;
    watermelon_anim.sourceWidth = 480;
    watermelon_anim.sourceHeight = 480;
    watermelon_anim.isVisible = false;
    cutScene.addControl(watermelon_anim);
    watermelon_anim.onImageLoadedObservable.add(() => {
      anims_loaded++;
    });
    const reading_anim = new Image("sparkLife", "./sprites/reading_anim.png");
    reading_anim.stretch = Image.STRETCH_UNIFORM;
    reading_anim.cellId = 0;
    reading_anim.cellHeight = 480;
    reading_anim.cellWidth = 480;
    reading_anim.sourceWidth = 480;
    reading_anim.sourceHeight = 480;
    reading_anim.isVisible = false;
    cutScene.addControl(reading_anim);
    reading_anim.onImageLoadedObservable.add(() => {
      anims_loaded++;
    });

    //Dialogue animations
    const dialogueBg = new Image(
      "sparkLife",
      "./sprites/bg_anim_text_dialogue.png",
    );
    dialogueBg.stretch = Image.STRETCH_UNIFORM;
    dialogueBg.cellId = 0;
    dialogueBg.cellHeight = 480;
    dialogueBg.cellWidth = 480;
    dialogueBg.sourceWidth = 480;
    dialogueBg.sourceHeight = 480;
    dialogueBg.horizontalAlignment = 0;
    dialogueBg.verticalAlignment = 0;
    dialogueBg.isVisible = false;
    cutScene.addControl(dialogueBg);
    dialogueBg.onImageLoadedObservable.add(() => {
      anims_loaded++;
    });

    const dialogue = new Image("sparkLife", "./sprites/text_dialogue.png");
    dialogue.stretch = Image.STRETCH_UNIFORM;
    dialogue.cellId = 0;
    dialogue.cellHeight = 480;
    dialogue.cellWidth = 480;
    dialogue.sourceWidth = 480;
    dialogue.sourceHeight = 480;
    dialogue.horizontalAlignment = 0;
    dialogue.verticalAlignment = 0;
    dialogue.isVisible = false;
    cutScene.addControl(dialogue);
    dialogue.onImageLoadedObservable.add(() => {
      anims_loaded++;
    });

    //looping animation for the dialogue background
    const dialogueTimer = setInterval(() => {
      if (finished_anim && dialogueBg.cellId < 3) {
        dialogueBg.cellId++;
      } else {
        dialogueBg.cellId = 0;
      }
    }, 250);

    //skip cutscene
    const skipBtn = Button.CreateSimpleButton("skip", "SKIP");
    skipBtn.fontFamily = "Viga";
    skipBtn.width = "45px";
    skipBtn.left = "-14px";
    skipBtn.height = "40px";
    skipBtn.color = "white";
    skipBtn.top = "14px";
    skipBtn.thickness = 0;
    skipBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    skipBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    cutScene.addControl(skipBtn);

    skipBtn.onPointerDownObservable.add(() => {
      this._cutScene.detachControl();
      clearInterval(animTimer);
      clearInterval(anim2Timer);
      clearInterval(dialogueTimer);
      this._engine.displayLoadingUI();
      canplay = true;
    });

    //--PLAYING ANIMATIONS--
    let animTimer;
    let anim2Timer;
    let anim = 1; //keeps track of which animation we're playing
    //sets up the state machines for animations
    this._cutScene.onBeforeRenderObservable.add(() => {
      if (anims_loaded == 8) {
        anims_loaded = 0;

        //animation sequence
        animTimer = setInterval(() => {
          switch (anim) {
            case 1:
              if (beginning_anim.cellId == 9) {
                //each animation could have a different number of frames
                anim++;
                beginning_anim.isVisible = false; // current animation hidden
                working_anim.isVisible = true; // show the next animation
              } else {
                beginning_anim.cellId++;
              }
              break;
            case 2:
              if (working_anim.cellId == 11) {
                anim++;
                working_anim.isVisible = false;
                dropoff_anim.isVisible = true;
              } else {
                working_anim.cellId++;
              }
              break;
            case 3:
              if (dropoff_anim.cellId == 11) {
                anim++;
                dropoff_anim.isVisible = false;
                leaving_anim.isVisible = true;
              } else {
                dropoff_anim.cellId++;
              }
              break;
            case 4:
              if (leaving_anim.cellId == 9) {
                anim++;
                leaving_anim.isVisible = false;
                watermelon_anim.isVisible = true;
              } else {
                leaving_anim.cellId++;
              }
              break;
            default:
              break;
          }
        }, 250);

        //animation sequence 2 that uses a different time interval
        anim2Timer = setInterval(() => {
          switch (anim) {
            case 5:
              if (watermelon_anim.cellId == 8) {
                anim++;
                watermelon_anim.isVisible = false;
                reading_anim.isVisible = true;
              } else {
                watermelon_anim.cellId++;
              }
              break;
            case 6:
              if (reading_anim.cellId == 11) {
                reading_anim.isVisible = false;
                finished_anim = true;
                dialogueBg.isVisible = true;
                dialogue.isVisible = true;
                next.isVisible = true;
              } else {
                reading_anim.cellId++;
              }
              break;
          }
        }, 750);
      }

      //only once all of the game assets have finished loading and you've completed the animation sequence + dialogue can you go to the game state
      if (finishedLoading && canplay) {
        canplay = false;
        this._goToGame();
      }
    });

    //--PROGRESS DIALOGUE--
    const next = Button.CreateImageOnlyButton("next", "./sprites/arrowBtn.png");
    next.rotation = Math.PI / 2;
    next.thickness = 0;
    next.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    next.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    next.width = "64px";
    next.height = "64px";
    next.top = "-3%";
    next.left = "-12%";
    next.isVisible = false;
    cutScene.addControl(next);

    next.onPointerUpObservable.add(() => {
      if (transition == 8) {
        //once we reach the last dialogue frame, goToGame
        this._cutScene.detachControl();
        this._engine.displayLoadingUI(); //if the game hasn't loaded yet, we'll see a loading screen
        transition = 0;
        canplay = true;
      } else if (transition < 8) {
        // 8 frames of dialogue
        transition++;
        dialogue.cellId++;
      }
    });

    //--WHEN SCENE IS FINISHED LOADING--
    await this._cutScene.whenReadyAsync();
    this._engine.hideLoadingUI();
    this._scene.dispose();
    this._state = State.CUTSCENE;
    this._scene = this._cutScene;

    //--START LOADING AND SETTING UP THE GAME DURING THIS SCENE--
    var finishedLoading = false;
    await this._setUpGame().then((res) => {
      finishedLoading = true;
    });
  }
  private async _setUpGame() {
    //--CREATE SCENE--
    let scene = new Scene(this._engine);
    this._gamescene = scene;

    //--CREATE ENVIRONMENT--
    const environment = new Environment(scene);
    this._environment = environment;
    //Load environment and character assets
    await this._environment.load(); //environment
    await this._loadCharacterAssets(scene); //character
  }
  private async _goToGame() {
    //--SETUP SCENE--
    this._scene.detachControl();
    let scene = this._gamescene;
    scene.clearColor = new Color4(
      0.001568627450980391,
      0.01568627450980392,
      0.20392156862745098,
    ); // a color that fit the overall color scheme better
    let camera: ArcRotateCamera = new ArcRotateCamera(
      "Camera",
      Math.PI / 2,
      Math.PI / 2,
      2,
      Vector3.Zero(),
      scene,
    );
    camera.setTarget(Vector3.Zero());

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
    await this._initializeGameAsync(scene);
    //--WHEN SCENE FINISHED LOADING--
    await scene.whenReadyAsync();

    //Actions to complete once the game loop is setup

    //--WHEN SCENE FINISHED LOADING--
    await scene.whenReadyAsync();
    scene.getMeshByName("outer")!.position = new Vector3(0, 3, 0);
    //get rid of start scene, switch to gamescene and change states
    this._scene.dispose();
    this._state = State.GAME;
    this._scene = scene;
    this._engine.hideLoadingUI();
    //the game is ready, attach control back
    this._scene.attachControl();
  }

  private async _loadCharacterAssets(scene: Scene) {
    async function loadCharacter() {
      // collision mesh (declared first so the car body/wheels can parent to it)
      const outer = MeshBuilder.CreateBox(
        "outer",
        { width: 6, depth: 1, height: 2 },
        scene,
      );
      outer.isVisible = false;
      outer.isPickable = false;
      outer.checkCollisions = true;
      outer.useVertexColors = true;
      //move origin of box collider to the bottom of the mesh (to match imported player mesh)
      outer.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0));
      //for collisions
      outer.ellipsoid = new Vector3(1, 1.5, 1);
      outer.ellipsoidOffset = new Vector3(0, 1.5, 0);
      outer.rotationQuaternion = new Quaternion(0, 1, 0, 0); // rotate the player mesh 180 since we want to see the back of the player

      // car body
      const bodyMaterial = new StandardMaterial("body_mat", scene);
      bodyMaterial.diffuseColor = new Color3(1.0, 0.25, 0.25);
      bodyMaterial.backFaceCulling = false;
      const side = [
        new Vector3(-4, 2, -2),
        new Vector3(4, 2, -2),
        new Vector3(5, -2, -2),
        new Vector3(-7, -2, -2),
      ];
      side.push(side[0]); // close trapezium
      const extrudePath = [new Vector3(0, 0, 0), new Vector3(0, 0, 4)];
      const carBody = MeshBuilder.ExtrudeShape(
        "carBody",
        { shape: side, path: extrudePath, cap: Mesh.CAP_ALL },
        scene,
      );
      carBody.material = bodyMaterial;
      carBody.isPickable = false;
      carBody.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0));
      carBody.parent = outer;

      // wheels
      const wheelMaterial = new StandardMaterial("wheel_mat", scene);
      const wheelTexture = new Texture(
        "https://i.imgur.com/ZUWbT6L.png",
        scene,
      );
      wheelMaterial.diffuseTexture = wheelTexture;

      const faceColors: Color4[] = [];
      faceColors[1] = new Color4(0, 0, 0, 1);

      const faceUV: Vector4[] = [];
      faceUV[0] = new Vector4(0, 0, 1, 1);
      faceUV[2] = new Vector4(0, 0, 1, 1);

      const wheelFI = MeshBuilder.CreateCylinder(
        "wheelFI",
        { diameter: 3, height: 1, tessellation: 24, faceColors, faceUV },
        scene,
      );
      wheelFI.material = wheelMaterial;
      wheelFI.rotate(Axis.X, Math.PI / 2, Space.WORLD);
      wheelFI.parent = carBody;
      wheelFI.position = new Vector3(-4.5, -2, -2.8);

      const wheelFO = wheelFI.createInstance("FO");
      wheelFO.parent = carBody;
      wheelFO.position = new Vector3(-4.5, -2, 2.8);

      const wheelRI = wheelFI.createInstance("RI");
      wheelRI.parent = carBody;
      wheelRI.position = new Vector3(2.5, -2, -2.8);

      const wheelRO = wheelFI.createInstance("RO");
      wheelRO.parent = carBody;
      wheelRO.position = new Vector3(2.5, -2, 2.8);

      return {
        mesh: outer as Mesh,
        wheels: [wheelFI, wheelFO, wheelRI, wheelRO],
      };
    }
    return loadCharacter().then((assets) => {
      this.assets = assets;
    });
  }
  private async _initializeGameAsync(scene): Promise<void> {
    //temporary light to light the entire scene
    var light0 = new HemisphericLight("HemiLight", new Vector3(0, 1, 0), scene);

    const light = new PointLight("sparklight", new Vector3(0, 0, 0), scene);
    light.diffuse = new Color3(
      0.08627450980392157,
      0.10980392156862745,
      0.15294117647058825,
    );
    light.intensity = 35;
    light.radius = 1;

    const shadowGenerator = new ShadowGenerator(1024, light);
    shadowGenerator.darkness = 0.4;

    //Create the player
    const input = new PlayerInput(scene);
    this._player = new Player(this.assets, scene, shadowGenerator, input);

    // Spin the wheels for visual effect; Player owns all position/rotation/jump control
    const wheels = this.assets.wheels;
    scene.registerAfterRender(() => {
      for (const wheel of wheels) {
        wheel.rotate(Axis.Z, Math.PI / 32, Space.LOCAL);
      }
    });
  }
}
new App();
