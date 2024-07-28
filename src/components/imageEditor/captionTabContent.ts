import {EditorState} from '.';
import {AppManagers} from '../../lib/appManagers/managers';
import {_i18n, i18n} from '../../lib/langPack';
import rootScope from '../../lib/rootScope';
import Button from '../button';
import {ImageEditorColorSelector} from './imageEditorColorSelector';
import {ImageEditorTabBase} from './imageEditorTabBase';
import {SizeSlider} from './sizeSlider';

interface TextAlignmentButton {
  icon: Icon;
  alignment: string;
}

interface TextStyleButton {
  icon: Icon;
  style: string;
}

const textAlignmentButtons: TextAlignmentButton[] = [
  {
    icon: 'align_left',
    alignment: 'left'
  },
  {
    icon: 'align_center',
    alignment: 'center'
  },
  {
    icon: 'align_right',
    alignment: 'right'
  }
];

const textStyleButtons: TextStyleButton[] = [
  {
    icon: 'text_filled',
    style: 'filled'
  },
  {
    icon: 'text_outlined',
    style: 'outlined'
  },
  {
    icon: 'text_inverted',
    style: 'fontFrame' // ???
  }
];

const fontButtons: string[] = ['Roboto', 'Typewriter', 'Avenir Next', 'Courier New', 'Noteworthy', 'Georgia', 'Papyrus', 'Snell Roundhand']

const initialFontSize = 24;
const initialColor = '#ffffff';


export class CaptionTabContent extends ImageEditorTabBase {
  private colorHexCode: string
  private fontSize: number
  private textAlignment: string
  private textStyle: string
  private selectedFont: string
  private textPrompt: HTMLInputElement;

  constructor(root: HTMLElement, canvas: HTMLCanvasElement, imageEl: HTMLImageElement, managers: AppManagers) {
    super(root, canvas, imageEl, managers);
  }

  protected construct(): void {
    this.fontSize = initialFontSize;
    this.colorHexCode = initialColor;
    this.textAlignment = 'left';
    this.textStyle = 'filled';

    rootScope.addEventListener('editor_update_state', this.handleStateUpdate.bind(this));


    const container = document.createElement('div');
    container.classList.add('editor-tab-container');
    container.classList.add('caption-tab-container');
    this.container = container;

    const colorSelector = new ImageEditorColorSelector();
    colorSelector.onChange = (color) => { this.setColorHexCode(color) }
    colorSelector.setColorHexCode(this.colorHexCode);
    container.appendChild(colorSelector.container);

    const textFormatRow = document.createElement('div');
    textFormatRow.classList.add('caption-tab-format-row');

    const textAlignmentSection = document.createElement('div');

    textAlignmentButtons.forEach((button) => {
      const alignmentButton = Button('caption-tab-alignment-button', {icon: button.icon});
      alignmentButton.dataset.alignment = button.alignment;
      alignmentButton.onclick = () => {
        this.setAlignment(button.alignment);
      }

      textAlignmentSection.appendChild(alignmentButton);
    });
    textFormatRow.appendChild(textAlignmentSection);


    const textStyleSection = document.createElement('div');

    textStyleButtons.forEach((button) => {
      const styleButton = Button('caption-tab-style-button', {icon: button.icon});
      styleButton.dataset.style = button.style;
      styleButton.onclick = () => {
        this.setStyle(button.style);
      }

      textStyleSection.appendChild(styleButton);
    });
    textFormatRow.appendChild(textStyleSection);

    container.appendChild(textFormatRow);

    // slider
    const sizeSlider = new SizeSlider(1, 64, 1, initialFontSize);
    sizeSlider.onChange = (size) => {
      this.fontSize = size;
    }
    container.appendChild(sizeSlider.container);

    // font section
    const fontSection = document.createElement('div');
    const fontHeader = document.createElement('span');
    fontHeader.classList.add('caption-tab-section-header');
    _i18n(fontHeader, 'Font');
    fontSection.appendChild(fontHeader);
    container.appendChild(fontSection);

    const fontButtonContainer = document.createElement('div');
    fontButtonContainer.classList.add('caption-tab-font-button-container');

    fontButtons.forEach((font) => {
      const fontButton = Button('caption-tab-font-button');
      fontButton.innerText = font;
      fontButton.style.fontFamily = font;
      fontButton.dataset.font = font;
      fontButton.onclick = () => {this.setFont(font)};
      fontButtonContainer.appendChild(fontButton);
    });


    container.appendChild(fontButtonContainer);

    this.setStyle('filled');
    this.setAlignment('left');
    this.setFont('Roboto');

    // add prompt for text
    const textPrompt = document.createElement('input');
    textPrompt.classList.add('caption-text-prompt');
    textPrompt.placeholder = i18n('AddText').textContent;
    this.textPrompt = textPrompt;

    this.root.appendChild(container);
    this.canvas.parentElement.appendChild(textPrompt);

    this.attachCanvasEvents();
  }

  private attachCanvasEvents(): void {
    // the last canvas blocks all click events, so we'll just attach the event to it
    const canvasWrapper = this.canvas.parentElement;
    const allCanvases = canvasWrapper.getElementsByTagName('canvas')
    const lastCanvas = allCanvases[allCanvases.length - 1];

    lastCanvas.addEventListener('click', this.handleCanvasClick.bind(this));
  }

  private detachCanvasEvents(): void {
    const canvasWrapper = this.canvas.parentElement;
    const allCanvases = canvasWrapper.getElementsByTagName('canvas')
    const lastCanvas = allCanvases[allCanvases.length - 1];

    lastCanvas.removeEventListener('click', this.handleCanvasClick.bind(this));
  }

  private isVisible(): boolean {
    return this.container.style.display === 'block';
  }

  public show(): void {
    super.show();
    this.setColorHexCode(this.colorHexCode);
    this.attachCanvasEvents();
  }

  public hide(): void {
    super.hide();
    this.textPrompt.style.display = 'none';
    this.detachCanvasEvents();
  }


  private setColorHexCode(hexCode: string): void {
    this.colorHexCode = hexCode;

    const root = document.querySelector(':root') as HTMLElement;
    if(root) {
      root.style.setProperty('--draw-tab-color', hexCode);
    } else {
      console.error('Root element not found. Unable to set color.');
    }
  }

  private setAlignment(alignment: string): void {
    this.textAlignment = alignment;

    const buttons = this.container.querySelectorAll('.caption-tab-alignment-button');
    buttons.forEach((button) => {
      button.classList.remove('caption-tab-format-button-active');
    });

    const selectedButton = this.container.querySelector(`.caption-tab-alignment-button[data-alignment="${alignment}"]`);
    selectedButton.classList.add('caption-tab-format-button-active');
  }

  private setStyle(style: string): void {
    this.textStyle = style;

    const buttons = this.container.querySelectorAll('.caption-tab-style-button');
    buttons.forEach((button) => {
      button.classList.remove('caption-tab-format-button-active');
    });

    const selectedButton = this.container.querySelector(`.caption-tab-style-button[data-style="${style}"]`);
    selectedButton.classList.add('caption-tab-format-button-active');
  }

  private setFont(font: string): void {
    this.selectedFont = font;

    const buttons = this.container.querySelectorAll('.caption-tab-font-button');
    buttons.forEach((button) => {
      button.classList.remove('caption-tab-font-button-active');
    });

    const selectedButton = this.container.querySelector(`.caption-tab-font-button[data-font="${font}"]`);
    selectedButton.classList.add('caption-tab-font-button-active');
  }

  private getCanvasCoordinatesForInput(e: MouseEvent) {
    // Because the canvas might be scaled, we need to adjust the coordinates
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY // - rect.top
    }
  }

  private getCanvasCoordinates(e: MouseEvent) {
    // Because the canvas might be scaled, we need to adjust the coordinates
    const rect = this.canvas.getBoundingClientRect();

    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const scale = scaleX > scaleY ? scaleY : scaleX;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      scale
    };
  }

  private handleCanvasClick(e: MouseEvent): void {
    if(!this.isVisible()) return;
    const {x, y} = this.getCanvasCoordinatesForInput(e)
    const {x: canvasX, y: canvasY, scale} = this.getCanvasCoordinates(e)

    this.textPrompt.style.fontSize = `${this.fontSize / scale}px`;

    const {height: inputHeight} = this.textPrompt.getBoundingClientRect();

    this.textPrompt.style.left = `${x}px`;
    this.textPrompt.style.top = `${y - inputHeight}px`;
    this.textPrompt.style.display = 'block';
    this.setInputStyle();
    this.textPrompt.focus();

    this.textPrompt.onkeydown = (event) => {
      if(event.key === 'Enter') {
        const text = this.textPrompt.value;
        this.setContextStyle();
        this.drawText(text, canvasX, canvasY);
        this.textPrompt.value = '';
        this.textPrompt.style.display = 'none';
      } else if(event.key === 'Escape') {
        this.textPrompt.value = '';
        this.textPrompt.style.display = 'none';
      }
    }
  }

  private setInputStyle() {
    this.textPrompt.style.backgroundColor = 'transparent';
    this.textPrompt.style.color = this.colorHexCode;
    this.textPrompt.style.textShadow = 'none';
    this.textPrompt.style.fontFamily = this.selectedFont;
    this.textPrompt.style.fontSize = `${this.fontSize}px`;
    this.textPrompt.style.font = `${this.fontSize}px ${this.selectedFont}`;

    switch(this.textAlignment) {
      case 'left':
        this.textPrompt.style.textAlign = 'left';
        break;
      case 'center':
        this.textPrompt.style.textAlign = 'center';
        break;
      case 'right':
        this.textPrompt.style.textAlign = 'right';
        break;
    }

    switch(this.textStyle) {
      case 'filled':
        this.textPrompt.style.color = this.colorHexCode;
        this.textPrompt.style.textShadow = 'none';
        break;
      case 'outlined':
        this.textPrompt.style.color = '#fff';
        this.textPrompt.style.textShadow = this.colorHexCode.includes('#fff') ? '0 0 4px #000' : `0 0 4px ${this.colorHexCode}`;
        break;
      case 'fontFrame':
        this.textPrompt.style.color = '#fff'
        this.textPrompt.style.textShadow = this.colorHexCode.includes('#fff') ? '0 0 4px #000' : `0 0 4px ${this.colorHexCode}`;
        this.textPrompt.style.backgroundColor = this.colorHexCode
    }
  }

  private setContextStyle() {
    this.ctx.font = `${this.fontSize}px ${this.selectedFont}`;
    this.ctx.lineWidth = 0;

    switch(this.textAlignment) {
      case 'left':
        this.ctx.textAlign = 'left';
        break;
      case 'center':
        this.ctx.textAlign = 'center';
        break;
      case 'right':
        this.ctx.textAlign = 'right';
        break;
    }

    switch(this.textStyle) {
      case 'filled':
        this.ctx.fillStyle = this.colorHexCode;
        this.ctx.strokeStyle = 'transparent';
        break;
      case 'outlined':
        this.ctx.fillStyle = '#fff';
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = this.colorHexCode.includes('#fff') ? '#000' : this.colorHexCode;
        break;
      case 'fontFrame':
        this.ctx.fillStyle = this.colorHexCode;
        this.ctx.strokeStyle = this.colorHexCode.includes('#fff') ? '#000' : this.colorHexCode;
        this.ctx.lineWidth = 4;
        break;
    }

    return;
  }

  private drawText(text: string, x: number, y: number) {
    if(this.textStyle === 'fontFrame') {
      this.drawFontFrameText(text, x, y);
      return;
    }

    this.ctx.strokeText(text, x, y);
    this.ctx.fillText(text, x, y);
    this.pushToStack();
  }

  private drawFontFrameText(text: string, x: number, y: number) {
    const roundRect = (x: number, y: number, width: number, height: number, radius: number) => {
      if(width < 2 * radius) radius = width / 2;
      if(height < 2 * radius) radius = height / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x + radius, y);
      this.ctx.arcTo(x + width, y, x + width, y + height, radius);
      this.ctx.arcTo(x + width, y + height, x, y + height, radius);
      this.ctx.arcTo(x, y + height, x, y, radius);
      this.ctx.arcTo(x, y, x + width, y, radius);
      this.ctx.closePath();
      return this.ctx;
    }

    const padding = 20;
    const radius = 20;
    const bgColor = this.colorHexCode;
    const textColor = '#fff';

    const textWidth = this.ctx.measureText(text).width;
    const textHeight = this.fontSize;

    // Calculate dimensions of the rounded rectangle
    const width = textWidth + padding * 2;
    const height = textHeight + padding * 2;

    // Draw rounded rectangle
    this.ctx.fillStyle = bgColor;
    roundRect(x, y - height / 1.5, width, height, radius).fill();

    // Draw text
    this.ctx.fillStyle = textColor;
    this.ctx.strokeText(text, x, y);
    this.ctx.fillText(text, x, y);
    this.pushToStack();
  }

  private pushToStack() {
    const dataUrl = this.canvas.toDataURL();

    const update: Partial<EditorState> = {
      captionCanvasDataUrl: dataUrl,
      requiresRedraw: true,
      valueChanged: 'captionCanvasDataUrl'
    }

    rootScope.dispatchEvent('editor_push_stack', update);
  }

  private handleStateUpdate(state: EditorState) {
    if(!state.requiresRedraw || !state.captionCanvasDataUrl) return

    const img = new Image();
    img.src = state.captionCanvasDataUrl;
    img.onload = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0);
    }
    img.src = state.captionCanvasDataUrl
  }
};
