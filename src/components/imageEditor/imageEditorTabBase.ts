import {AppManagers} from '../../lib/appManagers/managers';


export abstract class ImageEditorTabBase {
  protected root: HTMLElement;
  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;
  protected imageEl: HTMLImageElement;
  protected container: HTMLElement;
  protected managers: AppManagers;

  constructor(root: HTMLElement, canvas: HTMLCanvasElement, imageEl: HTMLImageElement, managers: AppManagers) {
    this.root = root;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.imageEl = imageEl;
    this.managers = managers;

    this.construct();
  }

  protected abstract construct(): void;

  public hide() {
    this.container.style.display = 'none';
  }

  public show() {
    this.container.style.display = 'block';
  }
}
