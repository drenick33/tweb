import Button from '../button';
import ColorPicker from '../colorPicker';


const defaultColors: string[] = [
  '#ffffff', // white
  '#FE4438', // red
  '#FF8901', // orange
  '#FFC100', // yellow
  '#33C759', // green
  '#62E5E0', // cyan
  '#0A84FF', // blue
  '#BD5CF3' // purple
]

// this reuses the ColorPicker component, given more time it
// would be nice to rework that so it can better support
// the tab interface, to match the Figma designs better
export class ImageEditorColorSelector {
  private colorHexCode: string
  public container: HTMLElement
  private colorPicker: ColorPicker;

  public onChange: (color: ReturnType<ImageEditorColorSelector['getCurrentColor']>) => void;


  constructor() {
    const container = document.createElement('div');
    container.classList.add('draw-tab-color-section');
    this.container = container;
    this.colorHexCode = defaultColors[0]; // fallback to white

    const colorPickerRow = document.createElement('div');
    colorPickerRow.classList.add('draw-tab-color-picker-row');
    defaultColors.forEach((color) => {
      const colorButton = Button('draw-tab-color-button');
      colorButton.style.backgroundColor = color;
      colorButton.dataset.color = color;

      colorButton.onclick = () => {
        if(this.colorPicker.container.parentElement) {
          this.container.removeChild(this.colorPicker.container);
        }
        this.setColorHexCode(color);
      }

      colorPickerRow.appendChild(colorButton);
    });

    const moreColorsButton = Button('draw-tab-more-colors-button');
    moreColorsButton.onclick = () => {this.selectMoreColorsButton()}
    colorPickerRow.appendChild(moreColorsButton);

    container.appendChild(colorPickerRow);
    const advancedColorPicker = new ColorPicker();
    this.colorPicker = advancedColorPicker;
    advancedColorPicker.onChange = (color) => {
      this.setColorHexCode(color.hex);
    }
  }

  public getCurrentColor(): string {
    return this.colorHexCode
  }

  public setColorHexCode(color: string): void {
    this.colorHexCode = color
    if(this.onChange) {
      this.onChange(color);
    }
  }

  private selectMoreColorsButton() {
    if(this.colorPicker.container.parentElement) {
      return
    }
    this.container.appendChild(this.colorPicker.container);
  }
}
