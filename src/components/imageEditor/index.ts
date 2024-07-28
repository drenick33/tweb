import deepEqual from '../../helpers/object/deepEqual';
import {AppManagers} from '../../lib/appManagers/managers';
import {_i18n} from '../../lib/langPack';
import rootScope from '../../lib/rootScope';
import Button from '../button';
import ButtonIcon from '../buttonIcon';
import Icon from '../icon';
import {SendFileParams} from '../popups/newMedia';
import ripple from '../ripple';
import Scrollable, {ScrollableX} from '../scrollable';
import {AspectRatioTabContent} from './aspectRatioTabContent';
import {CanvasRotator} from './canvasRotator';
import {CaptionTabContent} from './captionTabContent';
import {CropOverlay} from './cropOverlay';
import {DrawTabContent} from './drawTabContent';
import {FilterSlidersTabContent, initialSliderMap, SliderMap} from './filterSlidersTabContent';
import {ImageEditorTabBase} from './imageEditorTabBase';
import {StickerTabContent} from './stickerTabContent';

type ImageEditorTab = 'slider' | 'aspectRatio' | 'caption' | 'draw' | 'sticker';

interface TabMapValue {
  tabEl: HTMLElement;
  content: ImageEditorTabBase;
}

export interface EditorSaveImageEventDetails {
  file: File;
}

export const EditorSaveImageCustomEvent = 'editor_save_image';

export type EditorSaveImageEvent = CustomEvent<EditorSaveImageEventDetails>;

export interface EditorState extends EditorStateValues {
  valueChanged: keyof EditorState | null;
}

export interface EditorStateValues {
  sliderValues: SliderMap;
  imageSrc: string;
  requiresRedraw: boolean;
  isMirrored: boolean;
  angle: number;
  drawingCanvasDataUrl: string;
  captionCanvasDataUrl: string;
  stickerCanvasSrc: string;
}

export type EditorStackUpdate = Partial<EditorState>;

export type UpdateStateFn = (update: Partial<EditorState>) => void;

export class ImageEditor {
  private root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale: number = 1;
  private sidebar: HTMLElement;
  private imageContainer: HTMLElement;
  private imageEl: HTMLImageElement;
  private fileParams: SendFileParams;
  private managers: AppManagers;
  private stack: EditorState[] = [];
  private stackIndex: number = 0;
  private ImageEditorTabMap: Map<ImageEditorTab, TabMapValue> = new Map();
  private currentTab: ImageEditorTab;
  private drawingCanvas: HTMLCanvasElement;
  private captionCanvas: HTMLCanvasElement;
  private stickerCanvas: HTMLCanvasElement;

  private cropOverlay: CropOverlay;
  private canvasRotator: CanvasRotator;

  private filterTabContent: FilterSlidersTabContent;
  private aspectRatioTabContent: AspectRatioTabContent;
  private captionTabContent: CaptionTabContent;
  private drawTabContent: DrawTabContent;
  private stickerTabContent: StickerTabContent;


  constructor(
    fileParams: SendFileParams,
    managers: AppManagers
  ) {
    this.fileParams = fileParams;
    this.managers = managers;

    this.imageEl = document.createElement('img');
    this.imageEl.src = this.fileParams.objectURL;

    const initialState: EditorState = {
      sliderValues: initialSliderMap,
      imageSrc: this.imageEl.src,
      requiresRedraw: true,
      isMirrored: false,
      angle: 0,
      drawingCanvasDataUrl: '',
      captionCanvasDataUrl: '',
      stickerCanvasSrc: '',
      valueChanged: null
    }

    rootScope.addEventListener('editor_redraw_canvas', this.drawCanvas.bind(this))
    rootScope.addEventListener('editor_push_stack', this.pushStateToStack.bind(this))
    rootScope.addEventListener('editor_update_state', this.handleStateUpdate.bind(this))

    this.stack.push(initialState);
  }

  public construct() {
    this.root = document.createElement('div');
    this.root.classList.add('editor-root');

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')

    // for drawing only
    this.drawingCanvas = document.createElement('canvas');

    // for captions only
    this.captionCanvas = document.createElement('canvas');

    // for stickers only
    this.stickerCanvas = document.createElement('canvas');

    this.imageContainer = document.createElement('div');
    this.imageContainer.classList.add('editor-image-container');


    this.imageContainer.appendChild(this.canvas);
    this.imageContainer.appendChild(this.captionCanvas);
    this.imageContainer.appendChild(this.stickerCanvas);
    this.imageContainer.appendChild(this.drawingCanvas);

    this.root.appendChild(this.imageContainer);


    this.cropOverlay = new CropOverlay(this.imageContainer, this.canvas);


    this.renderSidebar();

    this.drawCanvas();

    document.body.prepend(this.root);

    this.cropOverlay.restoreToMax();
    this.canvasRotator = new CanvasRotator(this.imageContainer, this.canvas);
  }

  private drawCanvas() {
    // create a new image element to avoid modifying the original image
    const image = new Image();
    image.src = this.imageEl.src;


    image.onload = () => {
      this.canvas.width = image.naturalWidth;
      this.canvas.height = image.naturalHeight;
      this.captionCanvas.width = image.naturalWidth;
      this.captionCanvas.height = image.naturalHeight;
      this.stickerCanvas.width = image.naturalWidth;
      this.stickerCanvas.height = image.naturalHeight;
      this.drawingCanvas.width = image.naturalWidth;
      this.drawingCanvas.height = image.naturalHeight;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // rotate and mirror the image, then apply filters
      const rotatedImage = this.canvasRotator.processRotationAndMirror(image);

      rotatedImage.onload = () => {
        this.filterTabContent.processFilters(rotatedImage);

        if(this.cropOverlay.isVisible && !this.cropOverlay.hasBeenResized) {
          this.cropOverlay.updateCanvas(this.canvas);
          this.cropOverlay.restoreToMax()
        }
      }
    }
  }

  public destroy() {
    this.root.remove();
  }

  private renderSidebar() {
    this.sidebar = new Scrollable().container;
    this.sidebar.style.position = 'initial'; // Scrollable sets it to absolute, which messes up the rendering
    this.sidebar.classList.add('editor-sidebar');

    const renderHeader = () => {
      const header = document.createElement('div');
      header.classList.add('editor-sidebar-header');

      const leftSection = document.createElement('div');

      const closeButton = ButtonIcon('close')
      closeButton.onclick = () => {
        this.destroy();
      }

      const editText = document.createElement('span');
      editText.classList.add('editor-sidebar-header-title')
      _i18n(editText, 'Edit');
      leftSection.classList.add('editor-sidebar-header-section');
      leftSection.append(closeButton, editText);


      const rightSection = document.createElement('div');
      const undoButton = ButtonIcon('undo');
      undoButton.onclick = () => {
        this.undo();
      }
      const redoButton = ButtonIcon('redo');
      redoButton.onclick = () => {
        this.redo();
      }

      rightSection.append(undoButton, redoButton);
      rightSection.classList.add('editor-sidebar-header-section');

      header.appendChild(leftSection);
      header.appendChild(rightSection);
      this.sidebar.appendChild(header);
    }

    const renderTabs = () => {
      const navScrollableContainer = document.createElement('div');
      navScrollableContainer.classList.add('search-super-tabs-scrollable', 'menu-horizontal-scrollable', 'sticky');

      const navScrollable = new ScrollableX(navScrollableContainer);
      navScrollable.container.classList.add('search-super-nav-scrollable');

      const tabList = document.createElement('nav');
      tabList.classList.add('search-super-tabs', 'menu-horizontal-div');

      navScrollable.container.append(tabList);


      const sliderTab = document.createElement('div');
      sliderTab.classList.add('menu-horizontal-div-item', 'editor-tab-button')
      const sliderIcon = Icon('sliders');
      sliderTab.appendChild(sliderIcon);
      ripple(sliderTab)
      tabList.appendChild(sliderTab);

      const aspectRatioTab = document.createElement('div');
      aspectRatioTab.classList.add('menu-horizontal-div-item', 'editor-tab-button')
      const cropIcon = Icon('crop');
      aspectRatioTab.appendChild(cropIcon);
      ripple(aspectRatioTab)
      tabList.appendChild(aspectRatioTab);

      const captionTab = document.createElement('div');
      captionTab.classList.add('menu-horizontal-div-item', 'editor-tab-button')
      const captionIcon = Icon('font');
      captionTab.appendChild(captionIcon);
      ripple(captionTab)
      tabList.appendChild(captionTab);

      const drawTab = document.createElement('div');
      drawTab.classList.add('menu-horizontal-div-item', 'editor-tab-button')
      const drawIcon = Icon('brush');
      drawTab.appendChild(drawIcon);
      ripple(drawTab)
      tabList.appendChild(drawTab);

      const stickerTab = document.createElement('div');
      stickerTab.classList.add('menu-horizontal-div-item', 'editor-tab-button')
      const stickerIcon = Icon('smile');
      stickerTab.appendChild(stickerIcon);
      ripple(stickerTab)
      tabList.appendChild(stickerTab);

      this.sidebar.appendChild(navScrollableContainer);

      this.filterTabContent = new FilterSlidersTabContent(this.sidebar, this.canvas, this.imageEl, this.managers);
      this.aspectRatioTabContent = new AspectRatioTabContent(this.sidebar, this.canvas, this.imageEl, this.cropOverlay, this.managers);
      this.captionTabContent = new CaptionTabContent(this.sidebar, this.captionCanvas, this.imageEl, this.managers);
      this.drawTabContent = new DrawTabContent(this.sidebar, this.drawingCanvas, this.imageEl, this.canvas, this.managers);
      this.stickerTabContent = new StickerTabContent(this.sidebar, this.stickerCanvas, this.imageEl, this.managers);

      this.ImageEditorTabMap.set('slider', {content: this.filterTabContent, tabEl: sliderTab});
      this.ImageEditorTabMap.set('aspectRatio', {content: this.aspectRatioTabContent, tabEl: aspectRatioTab});
      this.ImageEditorTabMap.set('caption', {content: this.captionTabContent, tabEl: captionTab});
      this.ImageEditorTabMap.set('draw', {content: this.drawTabContent, tabEl: drawTab});
      this.ImageEditorTabMap.set('sticker', {content: this.stickerTabContent, tabEl: stickerTab});

      sliderTab.onclick = this.switchTab.bind(this, 'slider');
      aspectRatioTab.onclick = this.switchTab.bind(this, 'aspectRatio');
      captionTab.onclick = this.switchTab.bind(this, 'caption');
      drawTab.onclick = this.switchTab.bind(this, 'draw');
      stickerTab.onclick = this.switchTab.bind(this, 'sticker');

      this.switchTab('slider');
    }


    const renderConfirmButton = () => {
      const confirmButton = Button('editor-confirm-button btn-circle', {icon: 'check'}) // document.createElement('button');
      confirmButton.onclick = this.confirm.bind(this);

      this.root.appendChild(confirmButton);
    }


    renderHeader();
    renderTabs()
    renderConfirmButton();
    this.root.appendChild(this.sidebar);
  }

  private switchTab(tab: ImageEditorTab) {
    this.ImageEditorTabMap.forEach(({content, tabEl}) => {
      content.hide();
      tabEl.classList.remove('active');
    });

    const tabMapValue = this.ImageEditorTabMap.get(tab);
    if(!tabMapValue) {
      return;
    }

    const {content, tabEl} = tabMapValue;

    tabEl?.classList.add('active');
    content?.show();
    this.currentTab = tab;
    if(tab === 'aspectRatio') {
      this.cropOverlay.show();
      this.canvasRotator.show();
      return;
    }

    this.cropOverlay?.hide();
    this.canvasRotator?.hide();
  }


  private pushStateToStack(update: Partial<EditorState>) {
    const currentState = this.stack[this.stackIndex];

    const newState: EditorState = {
      ...currentState,
      ...update
    }


    // nothing has changed, so don't push to the stack
    if(deepEqual(currentState, newState)) {
      return;
    }

    // overwrite the stack from the current index, if the current index is not the last index
    if(this.stackIndex < this.stack.length - 1) {
      this.stack.splice(this.stackIndex + 1);
    }

    // push the new state to the stack, and update the stack index
    this.stack.push(newState);
    this.stackIndex = this.stack.length - 1;
  }

  private updateState() {
    const state = this.stack[this.stackIndex];

    // trigger other components to update based on the new state
    // should also cause a re-render
    rootScope.dispatchEvent('editor_update_state', state);
    this.handleStateUpdate(state);
  }

  private handleStateUpdate(update: EditorState) {
    const {imageSrc} = update
    if(imageSrc !== this.imageEl.src) {
      this.imageEl.src = imageSrc;
      this.drawCanvas();
    }

    if(this.cropOverlay.hasBeenResized) {
      this.cropOverlay.destroy();
      this.cropOverlay = new CropOverlay(this.imageContainer, this.canvas);
      this.cropOverlay.show();
    }
    // }
  }

  private save() {
    const combinedCanvas = document.createElement('canvas');
    const ctx = combinedCanvas.getContext('2d');

    combinedCanvas.width = this.canvas.width;
    combinedCanvas.height = this.canvas.height;

    // Draw the contents of the existing canvases onto the new canvas
    ctx.drawImage(this.canvas, 0, 0);
    ctx.drawImage(this.drawingCanvas, 0, 0);
    ctx.drawImage(this.captionCanvas, 0, 0);
    ctx.drawImage(this.stickerCanvas, 0, 0);

    // Convert the new canvas to a blob
    combinedCanvas.toBlob((blob) => {
      // Create a new file from the blob
      if(!blob) return;
      const fileType = this.fileParams.file.type ?? 'image/png';
      const file = new File([blob], this.fileParams.file.name, {type: fileType});

      const details: EditorSaveImageEventDetails = {file};
      rootScope.dispatchEvent(EditorSaveImageCustomEvent, details);
      this.destroy();
    });
  }

  private undo() {
    if(this.stackIndex === 0) {
      return;
    }

    this.stackIndex--;
    this.updateState();
  }

  private redo() {
    if(this.stackIndex === this.stack.length - 1) {
      return;
    }

    this.stackIndex++;
    this.updateState();
  }

  private cropImage() {
    if(this.currentTab !== 'aspectRatio') {
      return;
    }

    if(!this.cropOverlay.hasBeenResized) {
      return;
    }

    this.cropOverlay.getCroppedImage(this.imageEl).then((croppedImage) => {
      this.imageEl = croppedImage;
      this.drawCanvas();

      this.cropOverlay.destroy();
      this.cropOverlay = new CropOverlay(this.imageContainer, this.canvas);
      this.cropOverlay.show();
      this.pushStateToStack({...this.stack[this.stackIndex], imageSrc: croppedImage.src, requiresRedraw: true})
    })
  }

  private confirm() {
    if(this.currentTab !== 'draw') {
      if(this.cropOverlay.hasBeenResized) {
        // crop image if the context is appropriate, otherwise save the image
        this.cropImage();
        return;
      }
    }

    this.save();
  }
}
