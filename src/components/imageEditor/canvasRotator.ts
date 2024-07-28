import {EditorState} from '.';
import rootScope from '../../lib/rootScope';
import Button from '../button';

export class CanvasRotator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private angle: number;
  private isMirrored: boolean;

  private root: HTMLElement;
  private container: HTMLElement;
  private sliderContainer: HTMLElement;
  private rotationSlider: HTMLInputElement;

  constructor(root: HTMLElement, canvas: HTMLCanvasElement) {
    this.root = root;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.angle = 0;
    this.isMirrored = false;
    this.construct();
  }

  private construct() {
    const container = document.createElement('div');
    container.classList.add('canvas-rotator-container');
    this.container = container;

    const sliderContainer = document.createElement('div');
    sliderContainer.classList.add('canvas-rotator-slider-container');
    this.sliderContainer = sliderContainer;

    const sliderLabels = document.createElement('div');
    sliderLabels.classList.add('canvas-rotator-labels');
    const movableLabels = document.createElement('div');
    movableLabels.classList.add('canvas-rotator-movable-labels');
    sliderLabels.appendChild(movableLabels);

    // create a span for all numbers divisible by 15 from -360 to 360
    for(let i = -360; i <= 360; i++) {
      if(i % 45 === 0) {
        const label = document.createElement('span');
        label.textContent = i.toString() + '°';
        label.dataset.value = i.toString();
        label.addEventListener('click', this.handleLabelClick.bind(this));
        movableLabels.appendChild(label);
      }
    }

    const rotationSlider = document.createElement('input');
    rotationSlider.type = 'range';
    rotationSlider.min = '-360';
    rotationSlider.max = '360';
    rotationSlider.value = '0';
    rotationSlider.step = '1';
    rotationSlider.classList.add('canvas-rotator-slider');
    this.rotationSlider = rotationSlider;

    rotationSlider.addEventListener('input', this.updateSliderBackground.bind(this));


    const mirrorCanvasButton = Button('mirror-canvas-button', {icon: 'flip'});
    mirrorCanvasButton.classList.add('canvas-rotator-button');
    mirrorCanvasButton.onclick = this.toggleMirror.bind(this);

    const flipCanvasButton = Button('flip-canvas-button', {icon: 'flip'});
    flipCanvasButton.classList.add('canvas-rotator-button');
    flipCanvasButton.onclick = this.flipCanvas.bind(this);

    sliderContainer.appendChild(rotationSlider)
    sliderContainer.appendChild(sliderLabels);

    container.appendChild(flipCanvasButton);
    container.appendChild(sliderContainer);
    container.appendChild(mirrorCanvasButton);

    this.root.appendChild(container);
    this.hide();
  }

  private setAngle(angle: number) {
    this.angle = angle;
    if(this.angle > 360) {
      this.angle = 0;
    }
  }

  public processMirror(image: HTMLImageElement) {
    return this.mirrorCanvas(image);
  }

  public processRotationAndMirror(image: HTMLImageElement) {
    return this.rotate(this.angle, image);
  }

  private rotate(angle: number, image: HTMLImageElement): HTMLImageElement {
    const ctx = this.ctx;
    if(!ctx) {
      console.error('Failed to get 2D context');
      return;
    }

    // Save the original dimensions of the canvas
    const originalWidth = image.width;
    const originalHeight = image.height;


    // Save the current state of the canvas
    ctx.save();

    if(this.isMirrored) {
      ctx.translate(originalWidth, 0);
      ctx.scale(-1, 1);
    }

    // Translate to the center of the canvas
    ctx.translate(originalWidth / 2, originalHeight / 2);

    // Rotate the canvas by the specified angle (convert to radians)
    ctx.rotate((Math.PI / 180) * angle);

    // Clear the rotated canvas
    ctx.clearRect(-originalWidth / 2, -originalHeight / 2, originalWidth, originalHeight);


    // Draw the rotated image back onto the canvas
    ctx.drawImage(image, -originalWidth / 2, -originalHeight / 2, originalWidth, originalHeight);

    // Restore the canvas to its original state
    ctx.restore();

    const img = new Image();
    img.src = this.canvas.toDataURL();
    return img;
  }

  public show() {
    this.container.style.display = 'flex';
  }

  public hide() {
    this.container.style.display = 'none';
  }

  private toggleMirror() {
    this.isMirrored = !this.isMirrored;
    this.pushUpdate();
  }

  private mirrorCanvas(image: HTMLImageElement): HTMLImageElement {
    const ctx = this.ctx;

    // Ensure the canvas context is valid
    if(!ctx) {
      console.error('Failed to get 2D context');
      return;
    }

    const width = image.width;
    const height = image.height;

    this.canvas.width = width;
    this.canvas.height = height;

    // Clear the canvas
    ctx.clearRect(0, 0, width, height);

    // Save the current state of the canvas
    ctx.save();

    if(this.isMirrored) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    // Draw the image onto the canvas
    ctx.drawImage(image, 0, 0, width, height);

    // Restore the canvas to its original state
    ctx.restore();

    const img = new Image();
    img.src = this.canvas.toDataURL();
    return img;
  }

  private flipCanvas() {
    const newAngle = this.angle + 90;
    if(newAngle > 360) {
      this.setAngle(90);
      this.pushUpdate()
      return
    }
    this.setAngle(newAngle);
    this.pushUpdate();
  }

  private pushUpdate() {
    const updatedState: Partial<EditorState> = {
      angle: this.angle,
      isMirrored: this.isMirrored,
      requiresRedraw: true
    }

    rootScope.dispatchEvent('editor_push_stack', updatedState);
    rootScope.dispatchEvent('editor_redraw_canvas')
  }

  private handleLabelClick(event: Event) {
    const label = event.target as HTMLElement;
    const value = label.dataset.value;
    if(value) {
      this.rotationSlider.value = value;
      this.updateSliderBackground({target: this.rotationSlider} as unknown as Event);
    }
  }

  private updateSliderBackground(e: Event) {
    const t = e.target as HTMLInputElement;
    console.log(t.value);

    const labelsContainer = this.sliderContainer.querySelector('.canvas-rotator-movable-labels') as HTMLElement;
    const labels = this.sliderContainer.querySelectorAll('.canvas-rotator-movable-labels span');

    const maxOffset = 100; // Maximum percentage the labels can move
    const sliderRange = parseInt(this.rotationSlider.max) - parseInt(this.rotationSlider.min);
    const value = (this.rotationSlider.valueAsNumber - parseInt(this.rotationSlider.min)) / sliderRange * 100;
    const offset = ((value / 100) * maxOffset) - (maxOffset / 2);
    labelsContainer.style.transform = `translateX(${offset}%)`;

    // Calculate which label should be centered
    const labelRange = labels.length - 1;
    const centerIndex = Math.round(((-1 *this.rotationSlider.valueAsNumber - parseInt(this.rotationSlider.min)) / sliderRange) * labelRange);

    // Remove center class from all labels
    labels.forEach(label => label.classList.remove('center'));

    // Add center class to the middle label
    if(labels[centerIndex]) {
      labels[centerIndex].classList.add('center');
    }

    this.setAngle(this.rotationSlider.valueAsNumber);
    this.pushUpdate()
  }
}
