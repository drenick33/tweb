import {EditorState} from '.';
import {AppManagers} from '../../lib/appManagers/managers';
import {_i18n, LangPackKey} from '../../lib/langPack';
import rootScope from '../../lib/rootScope';
import Button from '../button';
import {ImageEditorColorSelector} from './imageEditorColorSelector';
import {ImageEditorTabBase} from './imageEditorTabBase';
import {SizeSlider} from './sizeSlider';

type DrawTool = 'pen' | 'arrow' | 'brush' | 'neon' | 'blur' | 'eraser';

interface DrawToolButton {
  iconSrc: string;
  tool: DrawTool;
  title: LangPackKey;
}

const initialColor = '#FE4438'

const drawToolButtons: DrawToolButton[] = [
  {iconSrc: 'assets/img/tool_pen.png', tool: 'pen', title: 'Pen'},
  {iconSrc: 'assets/img/tool_arrow.png', tool: 'arrow', title: 'Arrow'},
  {iconSrc: 'assets/img/tool_brush.png', tool: 'brush', title: 'Brush'},
  {iconSrc: 'assets/img/tool_neon.png', tool: 'neon', title: 'Neon'},
  {iconSrc: 'assets/img/tool_blur.png', tool: 'blur', title: 'Blur'},
  {iconSrc: 'assets/img/tool_eraser.png', tool: 'eraser', title: 'Eraser'}
]

export class DrawTabContent extends ImageEditorTabBase {
  private colorHexCode: string;
  private toolSelectorContainer: HTMLElement;
  private activeTool: DrawTool;
  private sizeValue: number;
  private isDrawing: boolean;
  private imageCanvas: HTMLCanvasElement;
  private lastX: number;
  private lastY: number;
  private drawingAngle: number; // angle in radians for drawing arrows

  constructor(root: HTMLElement, canvas: HTMLCanvasElement, imageEl: HTMLImageElement, imageCanvas: HTMLCanvasElement, managers: AppManagers) {
    super(root, canvas, imageEl, managers);
    this.imageCanvas = imageCanvas;
  }

  protected construct(): void {
    this.ctx.save();
    this.sizeValue = 15;
    this.activeTool = 'pen';
    this.colorHexCode = initialColor;
    this.isDrawing = false;

    rootScope.addEventListener('editor_update_state', this.handleStateUpdate.bind(this));

    this.setColorHexCode(this.colorHexCode);

    const container = document.createElement('div');
    container.classList.add('editor-tab-container');
    this.container = container;

    const colorSelector = new ImageEditorColorSelector();
    colorSelector.onChange = (color) => { this.setColorHexCode(color) }
    colorSelector.setColorHexCode(this.colorHexCode);
    container.appendChild(colorSelector.container);

    const sizeSlider = new SizeSlider(1, 30, 1, 15);
    sizeSlider.onChange = (size) => {
      this.sizeValue = size;
    }
    container.appendChild(sizeSlider.container);

    // render tool selector
    const toolHeaderContainer = document.createElement('div');
    toolHeaderContainer.classList.add('draw-tab-section-header');
    const toolHeader = document.createElement('span');
    toolHeader.classList.add('draw-tab-section-text');
    toolHeaderContainer.appendChild(toolHeader);
    container.appendChild(toolHeaderContainer);
    _i18n(toolHeader, 'Tool');
    const toolSelectorContainer = document.createElement('div');
    this.toolSelectorContainer = toolSelectorContainer;

    // render tool buttons
    drawToolButtons.forEach((button) => {
      const toolButton = Button('draw-tab-tool-button', {text: button.title});
      const toolImage = document.createElement('img');
      toolImage.src = button.iconSrc;
      toolButton.prepend(toolImage);
      toolButton.dataset.tool = button.tool; // root is ripple and the parent is the button
      toolButton.onclick = () => { this.setTool(button.tool) };
      toolSelectorContainer.appendChild(toolButton);
    });

    this.setTool('pen');
    this.attachCanvasEvents();

    container.appendChild(toolSelectorContainer);
    this.root.appendChild(container);
  }

  private attachCanvasEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this))
    this.canvas.addEventListener('mouseout', this.handleMouseOut.bind(this));
  }

  private detachCanvasEvents(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('mouseout', this.handleMouseOut.bind(this));
  }

  public show(): void {
    super.show();
    this.setColorHexCode(this.colorHexCode);
    this.attachCanvasEvents();
  }

  public hide(): void {
    super.hide();
    this.detachCanvasEvents();
  }

  private isVisible(): boolean {
    return this.container.style.display === 'block';
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

  private getCanvasCoordinates(e: MouseEvent) {
    // Because the canvas might be scaled, we need to adjust the coordinates
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private blurArea(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, blurAmount: number) {
    // Create an off-screen canvas for combining and blurring
    const offScreenCanvas = document.createElement('canvas');
    const offScreenCtx = offScreenCanvas.getContext('2d');

    offScreenCanvas.width = this.canvas.width;
    offScreenCanvas.height = this.canvas.height;

    // Draw the image canvas onto the off-screen canvas
    offScreenCtx.drawImage(this.imageCanvas, 0, 0);

    // Draw the drawing canvas onto the off-screen canvas
    offScreenCtx.drawImage(this.canvas, 0, 0);

    // Apply the blur filter
    offScreenCtx.filter = `blur(${blurAmount}px)`;
    offScreenCtx.drawImage(offScreenCanvas, 0, 0);

    // Draw the blurred area back onto the main drawing canvas
    ctx.clearRect(x, y, width, height); // Clear the original area on the drawing canvas
    ctx.drawImage(offScreenCanvas, x, y, width, height, x, y, width, height);
  }


  // might be possible to optimize this
  private drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
    const headLength = this.sizeValue * 2; // Length of the arrowhead
    const angle = this.drawingAngle // Math.atan2(y2 - y1, x2 - x1) + (45 * (Math.PI / 180));
    ctx.fillStyle = this.colorHexCode;


    // Draw the line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Draw the arrowhead
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 7), y2 - headLength * Math.sin(angle - Math.PI / 7));
    ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 7), y2 - headLength * Math.sin(angle + Math.PI / 7));
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'transparent';
  }

  private setTool(tool: DrawTool) {
    this.activeTool = tool;

    const buttons = this.toolSelectorContainer.querySelectorAll('.draw-tab-tool-button');
    buttons.forEach((button) => {
      button.classList.remove('draw-tab-tool-button-active');
    })

    const activeButton = this.toolSelectorContainer.querySelector(`.draw-tab-tool-button[data-tool="${tool}"]`);
    console.log(activeButton);
    if(activeButton) {
      activeButton.classList.add('draw-tab-tool-button-active');
    }
  }

  private setPenStyle() {
    this.ctx.restore();
    this.ctx.shadowColor = 'transparent';
    this.ctx.globalAlpha = 1;
    this.ctx.lineWidth = this.sizeValue
    this.ctx.globalCompositeOperation = 'source-over';

    switch(this.activeTool) {
      case 'pen':
      case 'arrow':
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = this.colorHexCode;
        break;
      case 'brush':
        this.ctx.lineCap = 'square';
        this.ctx.lineJoin = 'bevel'
        this.ctx.globalAlpha = 0.05;
        this.ctx.strokeStyle = this.colorHexCode;
        break
      case 'neon':
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.shadowColor = this.colorHexCode;
        this.ctx.shadowBlur = 20;
        break;
      case 'blur':
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        break;
      case 'eraser':
        this.ctx.globalCompositeOperation = 'destination-out'; // Set composite mode to "erase"
        this.ctx.strokeStyle = 'rgba(0,0,0,1)'; // Fully opaque black (the color doesn't matter)
        this.ctx.lineWidth = this.sizeValue; // Set the line width to match the eraser size
        this.ctx.lineCap = 'round'; // Round line ends
        break;
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    if(!this.isVisible()) return;
    this.isDrawing = true;
    const {x, y} = this.getCanvasCoordinates(e);
    this.lastX = x;
    this.lastY = y;
    this.setPenStyle();
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  private handleMouseMove(e: MouseEvent): void {
    if(this.isDrawing) {
      const {x, y} = this.getCanvasCoordinates(e);
      if(this.activeTool === 'blur') {
        this.blurArea(this.ctx, x - 10, y - 10, this.sizeValue * 2, this.sizeValue * 2, 5);
        return;
      }

      if(this.activeTool === 'arrow') {
        const angle = Math.atan2(y - this.lastY, x - this.lastX);
        this.drawingAngle = angle;
        this.lastX = x;
        this.lastY = y;
      }

      this.ctx.lineTo(x, y);
      this.ctx.stroke();
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    this.isDrawing = false;
    if(this.activeTool === 'arrow') {
      const {x, y} = this.getCanvasCoordinates(e);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
      this.drawArrow(this.ctx, this.lastX, this.lastY, x, y);
    }

    // get src of the image canvas
    const drawingCanvasDataUrl = this.canvas.toDataURL();


    // push to state
    const update: Partial<EditorState> = {
      drawingCanvasDataUrl,
      requiresRedraw: true,
      valueChanged: 'drawingCanvasDataUrl'
    }

    rootScope.dispatchEvent('editor_push_stack', update);
  }

  private handleMouseOut(e: MouseEvent): void {
    this.isDrawing = false;
  }

  private handleStateUpdate(state: EditorState) {
    if(!state.requiresRedraw || !state.drawingCanvasDataUrl) return

    const img = new Image();
    img.src = state.drawingCanvasDataUrl;
    img.onload = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0);
    }
    img.src = state.drawingCanvasDataUrl
  }
}
