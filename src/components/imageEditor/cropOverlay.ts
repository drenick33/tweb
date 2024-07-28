

export class CropOverlay {
  private root: HTMLElement;
  private maxWidth: number;
  private maxHeight: number;
  public hasBeenResized: boolean = false;
  private canvas: HTMLCanvasElement;
  private overlay: HTMLDivElement;
  private isResizing: boolean = false;

  private currentHandle: HTMLElement | null = null;
  private minimumSize: number = 20;
  private originalWidth: number = 0;
  private originalHeight: number = 0;
  private originalX: number = 0;
  private originalY: number = 0;
  private originalMouseX: number = 0;
  private originalMouseY: number = 0;

  constructor(root: HTMLElement, canvas: HTMLCanvasElement) {
    this.root = root;
    this.canvas = canvas;

    window.addEventListener('resize', (e) => this.updateDimensions())

    this.construct()
  }

  construct() {
    const resizeOverlay = document.createElement('div');
    resizeOverlay.classList.add('editor-resize-overlay');

    // create overlay edges
    const edgeHandles = ['top', 'right', 'bottom', 'left'];
    edgeHandles.forEach((handle) => {
      const handleEl = document.createElement('div');
      handleEl.classList.add('editor-resize-handle', handle);
      resizeOverlay.appendChild(handleEl);
    })

    // create overlay corners
    const cornerHandles = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    cornerHandles.forEach((handle) => {
      const handleEl = document.createElement('div');
      handleEl.classList.add('editor-resize-handle', handle);
      resizeOverlay.appendChild(handleEl);
    });

    // create overlay guide lines
    const lineDirections = ['horizontal', 'vertical'];
    const lineNumbers = ['first', 'second'];
    lineDirections.forEach((direction) => {
      lineNumbers.forEach((number) => {
        const lineEl = document.createElement('div');
        lineEl.classList.add('editor-resize-line', direction, number);
        resizeOverlay.appendChild(lineEl);
      });
    });

    resizeOverlay.addEventListener('mousedown', this.onMouseDown);

    this.overlay = resizeOverlay;

    this.updateDimensions();
    this.root.appendChild(resizeOverlay);
    this.hide()
  }

  public updateCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  public updateDimensions() {
    const rect = this.canvas.getBoundingClientRect();

    const maxWidth = rect.width;
    const maxHeight = rect.height;

    if(!this.hasBeenResized) {
      // get the top and left values based on the canvas position
      const {top: canvasTop, left: canvasLeft} = this.canvas.getBoundingClientRect();
      const top =  canvasTop - 16;
      const left = canvasLeft - 16;
      // if the overlay hasn't been resized yet, set it to the canvas size
      this.resize(maxWidth, maxHeight, top, left);
    }

    this.maxHeight = maxHeight;
    this.maxWidth = maxWidth;
  }

  public isVisible() {
    return this.overlay.style.display === 'block';
  }

  public show() {
    this.overlay.style.display = 'block';
  }

  public hide() {
    this.overlay.style.display = 'none';
  }

  public destroy() {
    this.overlay.remove();
    this.cleanupDarkenEffect();
  }

  public resize(width: number, height: number, top: number, left: number) {
    width = Math.min(width, this.maxWidth);
    height = Math.min(height, this.maxHeight);

    this.overlay.style.width = `${width}px`;
    this.overlay.style.height = `${height}px`;
    this.overlay.style.top = `${top}px`;
    this.overlay.style.left = `${left}px`;

    this.hasBeenResized = true;
  }

  public cropToRatio(widthRatio: number, heightRatio: number) {
    this.updateDimensions();
    const maxWidth = this.maxWidth;
    const maxHeight = this.maxHeight;
    let newWidth: number;
    let newHeight: number;

    if(maxWidth / maxHeight > widthRatio / heightRatio) {
      // width is larger than desired ratio
      newHeight = maxHeight;
      newWidth = maxHeight * (widthRatio / heightRatio);
    } else {
      // height is larger than desired ratio
      newWidth = maxWidth;
      newHeight = maxWidth * (heightRatio / widthRatio);
    }

    // get the top and left values based on the canvas position
    // get the top and left values to center the overlay within the canvas
    const {top: canvasTop, left: canvasLeft, width: canvasWidth, height: canvasHeight} = this.canvas.getBoundingClientRect();
    const topOfCanvas = canvasTop - 16;
    const leftOfCanvas = canvasLeft - 16;

    const top = topOfCanvas + (canvasHeight - newHeight) / 2;
    const left = leftOfCanvas + (canvasWidth - newWidth) / 2;


    this.resize(newWidth, newHeight, top, left);
    this.updateDarkenEffect();
    this.makeDarkenEffectDarker();
  }

  public restoreToMax() {
    this.updateDimensions();

    // get the top and left values based on the canvas position
    const {top: canvasTop, left: canvasLeft} = this.canvas.getBoundingClientRect();
    const top =  canvasTop - 16;
    const left = canvasLeft - 16

    this.resize(this.maxWidth, this.maxHeight, top, left);
    this.hasBeenResized = false;
    this.updateDarkenEffect();
  }

  private onMouseDown = (e: MouseEvent) => {
    e.preventDefault();

    const target = e.target as HTMLElement;

    if(!(target.classList.contains('editor-resize-handle') || target.classList.contains('editor-resize-overlay'))) {
      return;
    }

    this.isResizing = true;
    this.currentHandle = target;
    this.originalWidth = parseFloat(getComputedStyle(this.overlay, null).getPropertyValue('width').replace('px', ''));
    this.originalHeight = parseFloat(getComputedStyle(this.overlay, null).getPropertyValue('height').replace('px', ''));
    this.originalX = this.overlay.getBoundingClientRect().left - 16
    this.originalY = this.overlay.getBoundingClientRect().top - 16
    this.originalMouseX = e.clientX
    this.originalMouseY = e.clientY

    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  private onMouseMove = (e: MouseEvent) => {
    const handle = this.currentHandle;
    if(!this.isResizing || !this.currentHandle) {
      return;
    }

    let newWidth = this.originalWidth;
    let newHeight = this.originalHeight;
    let newTop = this.originalY;
    let newLeft = this.originalX;

    if(handle.classList.contains('bottom-right')) {
      const width = this.originalWidth + (e.pageX - this.originalMouseX);
      const height = this.originalHeight + (e.pageY - this.originalMouseY);
      if(width > this.minimumSize) {
        newWidth = width
        newLeft = this.originalX   // + (e.pageX - this.originalMouseX)
      }
      if(height > this.minimumSize) {
        newHeight = height
      }
    }
    if(handle.classList.contains('bottom-left')) {
      const height = this.originalHeight + (e.pageY - this.originalMouseY);
      const width = this.originalWidth - (e.pageX - this.originalMouseX);
      if(height > this.minimumSize) {
        newHeight = height
      }
      if(width > this.minimumSize) {
        newWidth = width
        newLeft = this.originalX + (e.pageX - this.originalMouseX)
      }
    }
    if(handle.classList.contains('top-right')) {
      const width = this.originalWidth + (e.pageX - this.originalMouseX);
      const height = this.originalHeight - (e.pageY - this.originalMouseY);
      if(width > this.minimumSize) {
        newWidth = width
        newLeft = this.originalX  // + (e.pageX - this.originalMouseX)
      }
      if(height > this.minimumSize) {
        newHeight = height
        newTop = this.originalY + (e.pageY - this.originalMouseY)
      }
    }
    if(handle.classList.contains('top-left')) {
      const width = this.originalWidth - (e.pageX - this.originalMouseX);
      const height = this.originalHeight - (e.pageY - this.originalMouseY);
      if(width > this.minimumSize) {
        newWidth = width
        newLeft = this.originalX + (e.pageX - this.originalMouseX)
      }
      if(height > this.minimumSize) {
        newHeight = height
        newTop = this.originalY + (e.pageY - this.originalMouseY)
      }
    }
    if(handle.classList.contains('top')) {
      const height = this.originalHeight - (e.pageY - this.originalMouseY);
      if(height > this.minimumSize) {
        newHeight = height
        newTop = this.originalY + (e.pageY - this.originalMouseY)
      }
    }
    if(handle.classList.contains('right')) {
      const width = this.originalWidth + (e.pageX - this.originalMouseX);
      if(width > this.minimumSize) {
        newWidth = width
        newLeft = this.originalX  // + (e.pageX - this.originalMouseX)
      }
    }
    if(handle.classList.contains('bottom')) {
      const height = this.originalHeight + (e.pageY - this.originalMouseY);
      if(height > this.minimumSize) {
        newHeight = height
        newTop = this.originalY  // + (e.pageY - this.originalMouseY)
      }
    }
    if(handle.classList.contains('left')) {
      const width = this.originalWidth - (e.pageX - this.originalMouseX);
      if(width > this.minimumSize) {
        newWidth = width
        newLeft = this.originalX + (e.pageX - this.originalMouseX)
      }
    }
    if(handle.classList.contains('editor-resize-overlay')) {
      const top = this.originalY + (e.pageY - this.originalMouseY);
      const left = this.originalX + (e.pageX - this.originalMouseX);
      newTop = top
      newLeft = left
    }

    const {height: canvasHeight, width: canvasWidth, top: canvasY, left: canvasX} = this.canvas.getBoundingClientRect()
    // includes padding
    const topOfCanvas =  canvasY - 16;
    const leftOfCanvas = canvasX - 16;


    // make sure overlay stays within canvas bounds
    // top and left;
    newLeft = Math.max(leftOfCanvas, newLeft);
    newTop = Math.max(topOfCanvas, newTop);


    // make sure canvas doesn't go off the bottom of the canvas
    const overlayTopRelativeToCanvas = newTop - topOfCanvas;
    const maxHeight = canvasHeight - overlayTopRelativeToCanvas;
    const maxWidth = canvasWidth - newLeft;

    newHeight = Math.min(newHeight, maxHeight);
    newWidth = Math.min(newWidth, maxWidth);


    // cap width/height/top/left if moving the overlay, so it doesn't shrink
    const spaceToRightRemaining = canvasWidth -( newLeft + newWidth - leftOfCanvas);
    const spaceToBottomRemaining = canvasHeight - (newTop + newHeight - topOfCanvas)
    if(!spaceToRightRemaining && handle.classList.contains('editor-resize-overlay')) {
      newWidth = this.originalWidth
      newLeft = canvasWidth - newWidth + leftOfCanvas // this.originalX
    }

    if(!spaceToBottomRemaining && handle.classList.contains('editor-resize-overlay')) {
      newHeight = this.originalHeight
      newTop = canvasHeight - newHeight + topOfCanvas // this.originalY
      // newTop = this.originalY //
    }

    this.resize(newWidth, newHeight, newTop, newLeft);
    this.updateDarkenEffect();
  }

  private onMouseUp = (e: Event) => {
    this.isResizing = false;
    this.currentHandle = null;
    this.makeDarkenEffectDarker();
    document.removeEventListener('mousemove', this.onMouseMove);
  }

  private updateDarkenEffect() {
    this.cleanupDarkenEffect();
    if(!this.hasBeenResized) {
      return;
    }
    // creates 4 rectangles around the overlay to darken the rest of the canvas

    const overlayRect = this.overlay.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();

    // left
    const leftRect = document.createElement('div');
    leftRect.classList.add('editor-darken-effect');
    leftRect.style.top = '0';
    leftRect.style.left = '0';
    leftRect.style.width = `${overlayRect.left - 16}px`;
    leftRect.style.height = `100%`;
    this.root.appendChild(leftRect);

    // right
    const rightRect = document.createElement('div');
    rightRect.classList.add('editor-darken-effect');
    rightRect.style.top = '0';
    rightRect.style.left = `${overlayRect.right - 16}px`;
    rightRect.style.width = `${canvasRect.right - overlayRect.right}px`;
    rightRect.style.height = `100%`;
    this.root.appendChild(rightRect);

    // top
    const topRect = document.createElement('div');
    topRect.classList.add('editor-darken-effect');
    topRect.style.top = '0';
    topRect.style.left = `${overlayRect.left - 16}px`;
    topRect.style.width = `${overlayRect.width}px`;
    topRect.style.height = `${overlayRect.top - 16}px`;
    this.root.appendChild(topRect);

    // bottom
    const bottomRect = document.createElement('div');
    bottomRect.classList.add('editor-darken-effect');
    bottomRect.style.top = `${overlayRect.bottom - 16}px`;
    bottomRect.style.left = `${overlayRect.left - 16}px`;
    bottomRect.style.width = `${overlayRect.width}px`;
    bottomRect.style.height = `${canvasRect.bottom - overlayRect.bottom}px`;
    this.root.appendChild(bottomRect);
  }

  private cleanupDarkenEffect() {
    const darkenElements = document.querySelectorAll('.editor-darken-effect');
    darkenElements.forEach((el) => el.remove());
  }

  private makeDarkenEffectDarker() {
    const darkenElements = document.querySelectorAll('.editor-darken-effect');
    darkenElements.forEach((el) => el.classList.add('darker'));
  }

  public resizeCanvasToOverlay() {
    const overlayRect = this.overlay.getBoundingClientRect();
    const {top: overlayTop, left: overlayLeft, width: overlayWidth, height: overlayHeight} = overlayRect;

    // Adjust the canvas size to match the overlay
    this.canvas.width = overlayWidth;
    this.canvas.height = overlayHeight;

    // Adjust the canvas position to match the overlay
    const canvasStyle = this.canvas.style;
    canvasStyle.position = 'absolute';
    canvasStyle.top = `${overlayTop}px`;
    canvasStyle.left = `${overlayLeft}px`;

    // Update dimensions after resizing
    this.updateDimensions();
  }

  public getCroppedImage(fullImage: HTMLImageElement): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      // Get the overlay dimensions and position
      const overlayRect = this.overlay.getBoundingClientRect();
      const {top: overlayTop, left: overlayLeft, width: overlayWidth, height: overlayHeight} = overlayRect;

      // Get the canvas dimensions and position
      const canvasRect = this.canvas.getBoundingClientRect();
      const {top: canvasTop, left: canvasLeft, width: canvasWidth, height: canvasHeight} = canvasRect;

      // Calculate the crop area relative to the image
      const cropX = (overlayLeft - canvasLeft) * (fullImage.width / canvasWidth);
      const cropY = (overlayTop - canvasTop) * (fullImage.height / canvasHeight);
      const cropWidth = overlayWidth * (fullImage.width / canvasWidth);
      const cropHeight = overlayHeight * (fullImage.height / canvasHeight);

      const context = this.canvas.getContext('2d');
      if(!context) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Create an off-screen canvas for cropping
      const offScreenCanvas = document.createElement('canvas');
      offScreenCanvas.width = cropWidth;
      offScreenCanvas.height = cropHeight;
      const offScreenContext = offScreenCanvas.getContext('2d');
      if(!offScreenContext) {
        reject(new Error('Failed to get off-screen canvas context'));
        return;
      }

      // Load the image
      const image = new Image();
      image.src = fullImage.src;
      image.onload = () => {
        // Draw the image onto the off-screen canvas, cropping it
        offScreenContext.drawImage(
          image,
          cropX, cropY, cropWidth, cropHeight, // Source rectangle
          0, 0, cropWidth, cropHeight          // Destination rectangle
        );

        // Convert the cropped area to a Blob
        offScreenCanvas.toBlob((blob) => {
          if(blob) {
            // Create a new image element with the cropped image data
            const croppedImage = new Image();
            const url = URL.createObjectURL(blob);
            croppedImage.src = url;
            croppedImage.onload = () => {
              this.hasBeenResized = false;
              resolve(croppedImage);
            };
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        });
      };

      image.onerror = (e) => {
        reject(new Error('Failed to load image'));
      };
    });
  }
}
