import {_i18n} from '../../lib/langPack';


export class SizeSlider {
  public container: HTMLElement;
  private sizeLabel: HTMLElement;
  private sizeSlider: HTMLInputElement;
  private sizeValue: number;
  public onChange: (size: ReturnType<SizeSlider['getCurrentSize']>) => void;

  constructor(min: number, max: number, step: number, initialValue: number) {
    this.sizeValue = initialValue;

    const container = document.createElement('div');
    container.classList.add('draw-tab-size-slider-container');
    this.container = container;

    const sizeSliderHeader = document.createElement('div');
    sizeSliderHeader.classList.add('draw-tab-section-header');
    const sizeSliderHeaderText = document.createElement('span');
    sizeSliderHeader.classList.add('draw-tab-section-text');
    _i18n(sizeSliderHeaderText, 'Size');
    const sizeLabel = document.createElement('span');
    sizeLabel.classList.add('draw-tab-section-text');
    sizeLabel.innerText = this.sizeValue.toString();
    this.sizeLabel = sizeLabel;
    sizeSliderHeader.appendChild(sizeSliderHeaderText);
    sizeSliderHeader.appendChild(sizeLabel);
    container.appendChild(sizeSliderHeader);


    const sizeSlider = document.createElement('input');
    sizeSlider.type = 'range';
    sizeSlider.min = min.toString();
    sizeSlider.max = max.toString();
    sizeSlider.value = initialValue.toString();
    sizeSlider.step = step.toString();
    sizeSlider.classList.add('draw-tab-size-slider');
    this.sizeSlider = sizeSlider;

    this.handleSliderChange({target: sizeSlider} as unknown as Event);
    this.sizeSlider.addEventListener('input', this.handleSliderChange.bind(this));

    container.appendChild(sizeSlider);
  }

  public getCurrentSize(): number {
    return this.sizeValue;
  }

  public handleSliderChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const value = this.sizeValue = parseInt(target.value);
    this.sizeLabel.innerText = this.sizeValue.toString();

    const max = this.sizeSlider.max;
    const percentage = (Number(value) / Number(max)) * 100;
    this.sizeSlider.style.setProperty('--slider-value', `${percentage}%`);

    if(this.onChange) {
      this.onChange(value);
    }
  }
}
