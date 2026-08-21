import { Scalar, Scene } from "@babylonjs/core";

export class PlayerInput {
  public horizontal = 0;
  public vertical = 0;
  public horizontalAxis = 0;
  public verticalAxis = 0;
  public jump = false;
  public dash = false;

  private readonly inputMap: Record<string, boolean> = {};

  constructor(scene: Scene) {
    scene.onKeyboardObservable.add(({ event, type }) => {
      if (type === 1) {
        this.inputMap[event.key] = true;
      } else if (type === 2) {
        this.inputMap[event.key] = false;
      }
    });

    scene.onBeforeRenderObservable.add(() => {
      this.updateFromKeyboard();
    });
  }

  private updateFromKeyboard(): void {
    const left = this.inputMap.ArrowLeft || this.inputMap.a;
    const right = this.inputMap.ArrowRight || this.inputMap.d;
    const up = this.inputMap.ArrowUp || this.inputMap.w;
    const down = this.inputMap.ArrowDown || this.inputMap.s;

    this.horizontalAxis = left ? -1 : right ? 1 : 0;
    this.verticalAxis = down ? -1 : up ? 1 : 0;
    this.horizontal = Scalar.Lerp(this.horizontal, this.horizontalAxis, 0.2);
    this.vertical = Scalar.Lerp(this.vertical, this.verticalAxis, 0.2);

    this.jump = Boolean(this.inputMap[" "] || this.inputMap.Space);
    this.dash = Boolean(this.inputMap.Shift);
  }
}
