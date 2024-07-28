import {EditorState} from '.';
import deepEqual from '../../helpers/object/deepEqual';
import {AppManagers} from '../../lib/appManagers/managers';
import {_i18n} from '../../lib/langPack';
import rootScope from '../../lib/rootScope';
import {ImageEditorTabBase} from './imageEditorTabBase';

type SliderType = 'Enhance' | 'Brightness' | 'Contrast' | 'Saturation' | 'Warmth' | 'Fade' | 'Highlights' | 'Shadows' | 'Vignette' | 'Grain' | 'Sharpen';

interface SliderValues {
  min: number;
  max: number;
  initial: number;
}

interface TriggerFilterRecomputationValues {
  Enhance: number;
  Brightness: number;
  Contrast: number;
  Saturation: number;
  Warmth: number;
  Shadows: number;
  Sharpen: number;
  Highlights: number;
}

export type SliderMap = Map<SliderType, number>;

const defaultSliderValues: Record<SliderType, SliderValues> = {
  Enhance: {min: -100, max: 100, initial: 0},
  Brightness: {min: -100, max: 100, initial: 0},
  Contrast: {min: -100, max: 100, initial: 0},
  Saturation: {min: -100, max: 100, initial: 0},
  Warmth: {min: -100, max: 100, initial: 0},
  Fade: {min: 0, max: 100, initial: 0},
  Highlights: {min: -100, max: 100, initial: 0},
  Shadows: {min: -100, max: 100, initial: 0},
  Vignette: {min: 0, max: 100, initial: 0},
  Grain: {min: 0, max: 100, initial: 0},
  Sharpen: {min: 0, max: 100, initial: 0}
};

const sliderNames: SliderType[] = [
  'Enhance', 'Brightness', 'Contrast',
  'Saturation', 'Warmth', 'Fade',
  'Highlights', 'Shadows', 'Vignette',
  'Grain', 'Sharpen'
]


export const initialSliderMap: SliderMap = new Map(sliderNames.map((name) => [name, defaultSliderValues[name as SliderType].initial]));


export class FilterSlidersTabContent extends ImageEditorTabBase {
  private sliderValues: SliderMap = new Map(sliderNames.map((name) => [name, defaultSliderValues[name as SliderType].initial]));
  private sliderTextElements: Record<SliderType, HTMLElement>;
  private sliderInputElements: Record<SliderType, HTMLInputElement>;

  // cached image data for sharpening, which is an expensive operation
  // recalculate only when relevant sliders are changed
  private cachedProcessedImageData: ImageData | null = null;
  private cachedTriggerRecomputationValues: TriggerFilterRecomputationValues | null = null;


  constructor(root: HTMLElement, canvas: HTMLCanvasElement, imageEl: HTMLImageElement, managers: AppManagers) {
    super(root, canvas, imageEl, managers);
  }

  protected construct() {
    this.sliderTextElements = {} as Record<SliderType, HTMLElement>;
    this.sliderInputElements = {} as Record<SliderType, HTMLInputElement>;

    rootScope.addEventListener('editor_update_state', this.handleStateUpdate.bind(this));


    const container = document.createElement('div');
    container.classList.add('editor-tab-container');
    this.container = container;


    for(const name of sliderNames) {
      const slider = document.createElement('div');
      const sliderHeader = document.createElement('div');
      sliderHeader.classList.add('editor-slider-header');
      const label = document.createElement('label');
      _i18n(label, name);
      const defaultSliderValue = defaultSliderValues[name as SliderType].initial.toString();

      const value = document.createElement('span');
      value.textContent = defaultSliderValue;
      sliderHeader.append(label, value);

      this.sliderTextElements[name] = value;


      slider.classList.add('editor-slider');
      const input = document.createElement('input');
      input.classList.add('editor-slider-input');
      input.id = `${name}-slider`;
      input.type = 'range';
      input.min = defaultSliderValues[name as SliderType].min.toString();
      input.max = defaultSliderValues[name as SliderType].max.toString();
      input.value = defaultSliderValue
      input.step = '1';

      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        value.textContent = target.value;

        this.sliderValues.set(name as SliderType, parseInt(value.textContent));

        rootScope.dispatchEvent('editor_redraw_canvas');

        if(value.textContent !== defaultSliderValue) {
          value.classList.add('changed')
          return;
        }

        value.classList.remove('changed');
      });

      this.sliderInputElements[name as SliderType] = input;

      slider.onmouseup = (e) => {
        const updatedSliderValues = new Map(this.sliderValues);
        const update: Partial<EditorState> = {sliderValues: updatedSliderValues, requiresRedraw: true, valueChanged: 'sliderValues'};
        rootScope.dispatchEvent('editor_push_stack', update);
      },

      slider.append(sliderHeader, input);
      container.appendChild(slider);
    }

    this.hide();
    this.root.appendChild(container)
  }


  private handleStateUpdate(state: EditorState) {
    this.sliderValues = new Map(state.sliderValues);

    rootScope.dispatchEvent('editor_redraw_canvas');


    for(const [key, value] of this.sliderValues) {
      const textElement = this.sliderTextElements[key as SliderType];
      const inputElement = this.sliderInputElements[key as SliderType];

      textElement.textContent = value.toString();
      inputElement.value = value.toString();

      if(value !== 50) {
        textElement.classList.add('changed');
        continue;
      } else {
        textElement.classList.remove('changed');
      }
    }
  }

  public processFilters(image: HTMLImageElement) {
    // Clear the canvas before drawing
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply filters and draw the image
    this.applyCTXFilters();
    this.ctx.drawImage(image, 0, 0);


    // Restore the canvas state to ensure filters don't affect other drawings
    this.ctx.restore();
    this.resetFilters();

    // Apply expensive filters if necessary
    if(this.shouldRecalculateExpensiveFilters()) {
      this.cacheFilterValues();
      this.applyHighlightsFilter();
      this.applyShadowsFilter();
      this.applySharpenFilter();
    } else {
      this.applyCachedImageData();
    }

    this.applyGrainFilter();
    this.applyVignetteFilter();
    this.applyFadeFilter();
  }

  private applyCTXFilters() {
    const enhanceValue = this.sliderValues.get('Enhance') ?? 0;
    const brightnessValue = this.sliderValues.get('Brightness') ?? 0;
    const contrastValue = this.sliderValues.get('Contrast') ?? 0;
    const saturationValue = this.sliderValues.get('Saturation') ?? 0;
    const warmthValue = this.sliderValues.get('Warmth') ?? 0;


    const brightnessPercentage = brightnessValue + (enhanceValue / 4) + 100;
    const contrastPercentage = contrastValue + (enhanceValue / 2) + 100;
    const saturationPercentage = saturationValue + (enhanceValue / 2) + 100;
    const hueRotationDeg = warmthValue * -0.5 // range from -50 to 50 degrees

    const brightnessFilterValue = `brightness(${brightnessPercentage}%)`
    const contrastFilterValue = `contrast(${contrastPercentage}%)`
    const saturationFilterValue = `saturate(${saturationPercentage}%)`
    const warmthFilterValue = `hue-rotate(${hueRotationDeg}deg)`
    const fadeFilterValue = `sepia(${this.sliderValues.get('Fade')}%)`

    this.ctx.filter = `${brightnessFilterValue} ${contrastFilterValue} ${saturationFilterValue} ${fadeFilterValue} ${warmthFilterValue}`;
  }

  private shouldRecalculateExpensiveFilters() {
    const highlightValue = this.sliderValues.get('Highlights') ?? 0;
    const shadowValue = this.sliderValues.get('Shadows') ?? 0;
    const sharpenValue = this.sliderValues.get('Sharpen') ?? 0;

    // We never cached the processed image data, and no filters have been applied
    if(!this.cachedProcessedImageData && (!highlightValue && !shadowValue && !sharpenValue)) {
      return false;
    }


    // we have values, but they haven't been cached yet
    if(!this.cachedTriggerRecomputationValues) {
      return true;
    }

    const newTriggerRecomputationValues: TriggerFilterRecomputationValues = {
      Enhance: this.sliderValues.get('Enhance') ?? 0,
      Brightness: this.sliderValues.get('Brightness') ?? 0,
      Contrast: this.sliderValues.get('Contrast') ?? 0,
      Saturation: this.sliderValues.get('Saturation') ?? 0,
      Warmth: this.sliderValues.get('Warmth') ?? 0,
      Shadows: shadowValue,
      Sharpen: sharpenValue,
      Highlights: highlightValue
    }

    // If the new values are different from the cached values, recalculate the expensive filters
    return !deepEqual(this.cachedTriggerRecomputationValues, newTriggerRecomputationValues);
  }

  private applyCachedImageData() {
    if(!this.cachedProcessedImageData) {
      return;
    }

    this.ctx.putImageData(this.cachedProcessedImageData, 0, 0);
  }

  private cacheFilterValues() {
    const newTriggerSharpenFilterValues: TriggerFilterRecomputationValues = {
      Enhance: this.sliderValues.get('Enhance') ?? 0,
      Brightness: this.sliderValues.get('Brightness') ?? 0,
      Contrast: this.sliderValues.get('Contrast') ?? 0,
      Saturation: this.sliderValues.get('Saturation') ?? 0,
      Warmth: this.sliderValues.get('Warmth') ?? 0,
      Shadows: this.sliderValues.get('Shadows') ?? 0,
      Sharpen: this.sliderValues.get('Sharpen') ?? 0,
      Highlights: this.sliderValues.get('Highlights') ?? 0
    }
    this.cachedTriggerRecomputationValues = newTriggerSharpenFilterValues;
  }

  private applyShadowsFilter() {
    const shadowValue = this.sliderValues.get('Shadows') ?? 0;
    if(!shadowValue) return;

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    const data = imageData.data;

    // Adjust shadows based on the slider value
    const shadowsFactor = -shadowValue / 100;

    for(let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Convert RGB to luminance
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

      // Apply a non-linear transformation to increase brightness in shadows
      const adjustment = Math.pow(luminance / 255, 1 - shadowsFactor) * 255 - luminance;

      data[i] = Math.min(255, Math.max(0, r + adjustment));
      data[i + 1] = Math.min(255, Math.max(0, g + adjustment));
      data[i + 2] = Math.min(255, Math.max(0, b + adjustment));
    }

    // Put the result back into the canvas
    this.cachedProcessedImageData = imageData;
    this.ctx.putImageData(imageData, 0, 0);
  }

  private applyHighlightsFilter() {
    const highlightValue = this.sliderValues.get('Highlights') ?? 0;
    if(!highlightValue) return;

    const highlightsFactor = highlightValue / 100;


    const width = this.canvas.width;
    const height = this.canvas.height;

    const imageData = this.ctx.getImageData(0, 0, width, height);
    const data = imageData.data;


    for(let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Convert RGB to luminance
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

      // Apply a non-linear transformation to decrease brightness in highlights
      const adjustment = luminance + (255 - luminance) * highlightsFactor - luminance;

      data[i] = Math.min(255, Math.max(0, r + adjustment));
      data[i + 1] = Math.min(255, Math.max(0, g + adjustment));
      data[i + 2] = Math.min(255, Math.max(0, b + adjustment));
    }

    // Put the result back into the canvas
    this.cachedProcessedImageData = imageData;
    this.ctx.putImageData(imageData, 0, 0);
  }

  private applySharpenFilterSoftwareFallback() {
    const sharpenValue = this.sliderValues.get('Sharpen') ?? 0;
    if(!sharpenValue) return;
    const width = this.canvas.width;
    const height = this.canvas.height;

    const imageData = this.ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Sharpening kernel
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];

    // Apply the sharpening kernel based on the slider value
    const factor = sharpenValue / 100;

    // Create a copy of the image data to store the result
    const output = new Uint8ClampedArray(data);

    // Precompute the kernel and pixel indices
    const kernelSize = 3;
    const halfKernelSize = Math.floor(kernelSize / 2);

    for(let y = halfKernelSize; y < height - halfKernelSize; y++) {
      for(let x = halfKernelSize; x < width - halfKernelSize; x++) {
        for(let channel = 0; channel < 3; channel++) {
          let sum = 0;
          for(let ky = -halfKernelSize; ky <= halfKernelSize; ky++) {
            for(let kx = -halfKernelSize; kx <= halfKernelSize; kx++) {
              const pixelIndex = ((y + ky) * width + (x + kx)) * 4 + channel;
              const kernelIndex = (ky + halfKernelSize) * kernelSize + (kx + halfKernelSize);
              sum += data[pixelIndex] * kernel[kernelIndex];
            }
          }
          const resultIndex = (y * width + x) * 4 + channel;
          output[resultIndex] = Math.min(Math.max(data[resultIndex] + sum * factor, 0), 255);
        }
      }
    }

    // Copy the alpha channel
    for(let i = 3; i < data.length; i += 4) {
      output[i] = data[i];
    }

    const processedImageData = new ImageData(output, width, height);
    this.cachedProcessedImageData = processedImageData;
    // this.sharpnessProcessedImageData = new ImageData(output, width, height);

    // Put the result back into the canvas
    this.ctx.putImageData(processedImageData, 0, 0);
  }

  private applySharpenFilter() {
    const sharpenValue = this.sliderValues.get('Sharpen') ?? 0;
    if(!sharpenValue) return;

    const newTriggerSharpenFilterValues: TriggerFilterRecomputationValues = {
      Enhance: this.sliderValues.get('Enhance') ?? 0,
      Brightness: this.sliderValues.get('Brightness') ?? 0,
      Contrast: this.sliderValues.get('Contrast') ?? 0,
      Saturation: this.sliderValues.get('Saturation') ?? 0,
      Warmth: this.sliderValues.get('Warmth') ?? 0,
      Shadows: this.sliderValues.get('Shadows') ?? 0,
      Sharpen: sharpenValue,
      Highlights: this.sliderValues.get('Highlights') ?? 0
    }
    this.cachedTriggerRecomputationValues = newTriggerSharpenFilterValues;

    const canvas = this.canvas;
    const gl = canvas.getContext('webgl');
    if(!gl) {
      return this.applySharpenFilterSoftwareFallback();
    }

    const vertexShaderSource = `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_texCoord;
        }
    `;

    const fragmentShaderSource = `
        precision mediump float;
        varying vec2 v_texCoord;
        uniform sampler2D u_image;
        uniform float u_sharpenValue;
        void main() {
            float kernel[9];
            kernel[0] = 0.0; kernel[1] = -1.0; kernel[2] = 0.0;
            kernel[3] = -1.0; kernel[4] = 5.0; kernel[5] = -1.0;
            kernel[6] = 0.0; kernel[7] = -1.0; kernel[8] = 0.0;
            
            float factor = u_sharpenValue / 100.0;

            vec2 tex_offset = vec2(1.0) / vec2(textureSize(u_image, 0)); // gets size of single texel
            vec3 result = vec3(0.0);
            
            for(int i = -1; i <= 1; i++) {
                for(int j = -1; j <= 1; j++) {
                    vec2 offset = vec2(float(i), float(j)) * tex_offset;
                    result += texture2D(u_image, v_texCoord + offset).rgb * kernel[(i+1)*3 + (j+1)];
                }
            }
            
            gl_FragColor = vec4(result * factor + texture2D(u_image, v_texCoord).rgb, 1.0);
        }
    `;

    function createShader(gl: WebGLRenderingContext, type: number, source: string) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
      if(success) {
        return shader;
      }
      gl.deleteShader(shader);
    }

    function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
      const program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      const success = gl.getProgramParameter(program, gl.LINK_STATUS);
      if(success) {
        return program;
      }
      gl.deleteProgram(program);
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(gl, vertexShader, fragmentShader);

    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
    const texCoordAttributeLocation = gl.getAttribLocation(program, 'a_texCoord');
    const sharpenValueLocation = gl.getUniformLocation(program, 'u_sharpenValue');

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
      -1, -1,
      1, -1,
      -1,  1,
      -1,  1,
      1, -1,
      1,  1
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    const texCoords = [
      0, 0,
      1, 0,
      0, 1,
      0, 1,
      1, 0,
      1, 1
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const imageData = this.ctx.getImageData(0, 0, canvas.width, canvas.height);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, imageData.data);
    gl.generateMipmap(gl.TEXTURE_2D);

    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(texCoordAttributeLocation);
    gl.vertexAttribPointer(texCoordAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1f(sharpenValueLocation, sharpenValue);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    const processedImageData = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, processedImageData);

    const processedImage = new ImageData(new Uint8ClampedArray(processedImageData), canvas.width, canvas.height);
    this.cachedProcessedImageData = processedImage;

    this.ctx.putImageData(processedImage, 0, 0);
  }

  private applyGrainFilter() {
    const grainValue = this.sliderValues.get('Grain') ?? 0;
    if(!grainValue) return;

    const grainAmount = grainValue / 100;

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    for(let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 255 * grainAmount;
      data[i] += noise;     // Red
      data[i + 1] += noise; // Green
      data[i + 2] += noise; // Blue
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  private applyVignetteFilter() {
    const vignetteValue = this.sliderValues.get('Vignette') ?? 0;
    if(!vignetteValue) return;

    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 2 * (1 - vignetteValue / 100),
      this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 2
    );

    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${vignetteValue / 100})`);

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private applyFadeFilter() {
    // needs to be separate, draws a transparent white image over the canvas
    const fadeValue = this.sliderValues.get('Fade') ?? 0;
    if(!fadeValue) return;

    const fadeAmount = fadeValue / 100;

    const transparency = fadeAmount > 0.9 ? 0.9 : fadeAmount;

    this.ctx.fillStyle = `rgba(255, 255, 255, ${transparency})`;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private resetFilters() {
    this.ctx.filter = 'none';
  }
};
