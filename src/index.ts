import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { AppendSceneAsync } from "@babylonjs/core/Loading/sceneLoader";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

// Side-effect imports: these register plugins and augment prototypes at load time
import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/core/Helpers/sceneHelpers";
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Materials/PBR/pbrMaterial";
import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader";
import "@babylonjs/loaders/glTF";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new Engine(canvas, true);

    const createScene = async () => {
        const scene = new Scene(engine);

        try {
            // Load a glTF model
            await AppendSceneAsync("https://assets.babylonjs.com/meshes/boombox.glb", scene);

            // Create a default camera, and event caught by the controls will call preventdefault(),
            // such as wheel event
            scene.createDefaultCamera(true, true, true);
            // Rotate the camera to face the front of the model
            (scene.activeCamera as ArcRotateCamera).alpha += Math.PI;
        } catch {
            // Fallback: when loading fails
            // Create a default box mesh
            CreateBox("box", {}, scene);

            scene.createDefaultCamera(true, true, true);
            const camera = scene.activeCamera as ArcRotateCamera;
            camera.setPosition(new Vector3(3, 3, 3));
            camera.setTarget(new Vector3(0, 0, 0));

            // Create a default light for the scene
            scene.createDefaultLight(true);
        }

        // Create a default environment (skybox + ground + environment lighting)
        scene.createDefaultEnvironment({
            createGround: true,
            createSkybox: true,
        });

        return scene;
    };

createScene().then((scene) => {
    engine.runRenderLoop(() => {
        scene.render();
    });
});

window.addEventListener("resize", () => {
    engine.resize();
});
