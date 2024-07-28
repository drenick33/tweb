import {AppManagers} from '../../lib/appManagers/managers';
import {_i18n, LangPackKey} from '../../lib/langPack';
import Button from '../button';
import {CropOverlay} from './cropOverlay';
import {ImageEditorTabBase} from './imageEditorTabBase';

type ButtonWidthType = 'full' | 'half';

interface AspectRatioButton {
  text: LangPackKey
  icon: Icon
  width: ButtonWidthType
  ratio?: [number, number]
  restoreOriginal?: boolean
  freeRatio?: boolean
  initiallyActive?: boolean
}

const aspectRatioButtons: AspectRatioButton[] = [
  {text: 'Free', icon: 'aspect_free', width: 'full', freeRatio: true, initiallyActive: true},
  {text: 'Original', icon: 'aspect_original', width: 'full', restoreOriginal: true},
  {text: 'Square', icon: 'aspect_square', width: 'full', ratio: [1, 1]},
  {text: '3:2', icon: 'aspect_3_2', width: 'half', ratio: [3, 2]},
  {text: '2:3', icon: 'aspect_2_3', width: 'half', ratio: [2, 3]},
  {text: '4:3', icon: 'aspect_4_3', width: 'half', ratio: [4, 3]},
  {text: '3:4', icon: 'aspect_3_4', width: 'half', ratio: [3, 4]},
  {text: '5:4', icon: 'aspect_5_4', width: 'half', ratio: [5, 4]},
  {text: '4:5', icon: 'aspect_4_5', width: 'half', ratio: [4, 5]},
  {text: '7:5', icon: 'aspect_7_5', width: 'half', ratio: [7, 5]},
  {text: '5:7', icon: 'aspect_5_7', width: 'half', ratio: [5, 7]},
  {text: '16:9', icon: 'aspect_16_9', width: 'half', ratio: [16, 9]},
  {text: '9:16', icon: 'aspect_9_16', width: 'half', ratio: [9, 16]}

]

export class AspectRatioTabContent extends ImageEditorTabBase {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  imageEl: HTMLImageElement;
  container: HTMLElement;
  cropOverlay: CropOverlay;

  constructor(root: HTMLElement, canvas: HTMLCanvasElement, imageEl: HTMLImageElement, cropOverlay: CropOverlay, managers: AppManagers) {
    super(root, canvas, imageEl, managers);

    this.cropOverlay = cropOverlay;
  }

  construct() {
    const container = document.createElement('div');
    container.classList.add('editor-tab-container');
    this.container = container;

    // render title
    const title = document.createElement('span');
    title.classList.add('aspect-ratio-title');
    _i18n(title, 'AspectRatio');
    container.appendChild(title);

    // render buttons
    const buttonGrid = document.createElement('div');
    buttonGrid.classList.add('aspect-ratio-button-grid');

    aspectRatioButtons.forEach(({text, icon, width, ratio, restoreOriginal, initiallyActive}) => {
      const button = Button('aspect-ratio-button-' + width, {icon, text})
      const parentElement = width === 'full' ? container : buttonGrid;

      if(initiallyActive) {
        button.classList.add('active-aspect-ratio');
      }

      button.onclick = () => {
        // remove active class from all buttons
        parentElement.querySelectorAll('button').forEach((button) => {
          button.classList.remove('active-aspect-ratio');
        });
        button.classList.add('active-aspect-ratio');
        if(ratio) {
          this.cropOverlay.cropToRatio(ratio[0], ratio[1]);
        }
        else if(restoreOriginal) {
          this.cropOverlay.restoreToMax();
        }
      }

      parentElement.appendChild(button);
    })

    container.appendChild(buttonGrid);

    this.hide();
    this.root.appendChild(container);
  }
}
