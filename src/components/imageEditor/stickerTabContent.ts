import {EditorState} from '.';
import {AppManagers} from '../../lib/appManagers/managers';
import rootScope from '../../lib/rootScope';
import {EmoticonsDropdown, EMOTICONSSTICKERGROUP} from '../emoticonsDropdown';
import EmoticonsTabC from '../emoticonsDropdown/tab';
import StickersTab from '../emoticonsDropdown/tabs/stickers';
import SuperStickerRenderer from '../emoticonsDropdown/tabs/SuperStickerRenderer';
import {ImageEditorTabBase} from './imageEditorTabBase';

// this class is still a bit of a mess
export class StickerTabContent extends ImageEditorTabBase {
  private selectedSticker: HTMLImageElement;
  private placingSticker: boolean

  constructor(root: HTMLElement, canvas: HTMLCanvasElement, imageEl: HTMLImageElement, managers: AppManagers) {
    super(root, canvas, imageEl, managers);
  }

  protected async construct() {
    const container = document.createElement('div');
    container.classList.add('editor-tab-container', 'stickers-tab-container');
    this.container = container;
    const title = document.createElement('div');
    const scrollable = container;
    this.placingSticker = false;

    rootScope.addEventListener('editor_update_state', this.handleStateUpdate.bind(this));

    const dropdown = new EmoticonsDropdown();

    const emoticonsTabC = new EmoticonsTabC({managers: this.managers})
    emoticonsTabC.init();
    emoticonsTabC.emoticonsDropdown = dropdown;

    const all = await this.managers.appStickersManager.getAllStickers()

    const height = this.root.getBoundingClientRect().height

    const stickersTab = new StickersTab(this.managers);
    stickersTab.emoticonsDropdown = emoticonsTabC.emoticonsDropdown;
    stickersTab.init()

    const stickerRenderer = stickersTab.createStickerRenderer()

    // override the onMedia click method to have it select the sticker
    // instead of sending to the active chat
    dropdown.onMediaClick = async(e: {target: Element | EventTarget}) => {
      const target = e.target
      if(!target || !(target instanceof HTMLImageElement)) return false;

      this.selectedSticker = target;
    }

    const middleware = emoticonsTabC.middlewareHelper.get();

    const superStickerRenderer = new SuperStickerRenderer({
      managers: this.managers,
      group: EMOTICONSSTICKERGROUP,
      regularLazyLoadQueue: dropdown.lazyLoadQueue,
      intersectionObserverInit: dropdown.intersectionOptions
    })

    dropdown.addLazyLoadQueueRepeat(stickerRenderer.lazyLoadQueue, superStickerRenderer.processInvisible, middleware);

    stickersTab.container.style.height = height + 'px';
    stickersTab.content.style.height =  height + 'px';


    this.container.appendChild(stickersTab.container);

    stickersTab.onOpened()

    all.sets.forEach((set) => {
      StickersTab.renderStickerSet(stickersTab, superStickerRenderer, set)
    })

    this.root.appendChild(container);
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

  private attachCanvasEvents() {
    // the last canvas blocks all click events, so we'll just attach the event to it
    const canvasWrapper = this.canvas.parentElement;
    const allCanvases = canvasWrapper.getElementsByTagName('canvas')
    const lastCanvas = allCanvases[allCanvases.length - 1];

    lastCanvas.addEventListener('click', this.handleCanvasClick.bind(this));
  }

  private detachCanvasEvents() {
    const canvasWrapper = this.canvas.parentElement;
    const allCanvases = canvasWrapper.getElementsByTagName('canvas')
    const lastCanvas = allCanvases[allCanvases.length - 1];

    lastCanvas.removeEventListener('click', this.handleCanvasClick.bind(this));
  }


  private isVisible() {
    return this.container.style.display !== 'none';
  }

  public show(): void {
    super.show();
    this.selectedSticker = null;
    this.attachCanvasEvents();
  }

  public hide(): void {
    super.hide();
    this.selectedSticker = null;
    this.detachCanvasEvents();
  }


  private handleCanvasClick(e: MouseEvent) {
    if(this.placingSticker || !this.isVisible()) return;
    this.placingSticker = true;
    if(!this.selectedSticker) return;

    const {x: canvasX, y: canvasY} = this.getCanvasCoordinates(e)

    const img = new Image();
    img.src = this.selectedSticker.src;


    this.ctx.drawImage(img, canvasX - 200 / 2, canvasY - 200 / 2, 200, 200);

    this.pushToStack();
    this.placingSticker = false;
  }

  private pushToStack() {
    const dataUrl = this.canvas.toDataURL();

    const update: Partial<EditorState> = {
      stickerCanvasSrc: dataUrl,
      requiresRedraw: true,
      valueChanged: 'stickerCanvasSrc'
    }

    rootScope.dispatchEvent('editor_push_stack', update);
  }

  private handleStateUpdate(state: EditorState) {
    if(!state.requiresRedraw || !state.stickerCanvasSrc) return;

    const img = new Image();
    img.src = state.stickerCanvasSrc;
    img.onload = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0);
    }
    img.src = state.stickerCanvasSrc;
  }
}
