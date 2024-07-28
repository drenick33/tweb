import PopupElement, {addCancelButton, PopupOptions} from '.';
import {_tgico} from '../../helpers/tgico';
import {i18n} from '../../lib/langPack';
import Icon from '../icon';

const ACCOUNT_LIMIT = 3;

export default class PopupAccountLimitReached extends PopupElement {
  constructor(options: PopupOptions = {}) {
    super('popup-account-limit-reached', {
      body: true,
      overlayClosable: true,
      title: 'AccountLimit.Header',
      buttons: addCancelButton([
        {
          langKey: 'IncreaseLimit',
          iconRight: 'premium_addone',
          callback: () => {
          // @TODO
            alert('@TODO - let user upgrade after clicking this button')
          }
        }
      ]),
      //   withConfirm: 'Add',
      ...options
    })
    this.construct()
  }

  private async construct() {
    const setInfograph = () => {
      const createContainerElement = () => {
        const container = document.createElement('div');
        container.classList.add('infograph-container')
        return container;
      }

      const createIconElement = () => {
        const iconElement = document.createElement('div')
        iconElement.classList.add('iconContainer')

        // @ TODO - get a filled variant of this icon!!!!
        const icon = Icon('user_filled')

        iconElement.appendChild(icon)

        const otherText = document.createElement('span')
        otherText.textContent = ACCOUNT_LIMIT.toString()

        iconElement.append(otherText)

        return iconElement;
      }

      const createBarElement = () => {
        const container = document.createElement('div')
        container.classList.add('barContainer')

        const freeSection = document.createElement('div');
        freeSection.classList.add('barFreeSection');
        freeSection.append(i18n('LimitFree'))

        const premiumSection = document.createElement('div')
        premiumSection.classList.add('barPremiumSection')
        const premiumAccountLimitElement = document.createElement('span');
        premiumAccountLimitElement.textContent = (ACCOUNT_LIMIT + 1).toString()
        premiumSection.append(i18n('LimitPremium'), premiumAccountLimitElement)

        container.append(freeSection, premiumSection)

        return container
      }

      const container = createContainerElement()
      const icon = createIconElement()
      const bar = createBarElement()
      container.appendChild(icon)
      container.appendChild(bar)

      this.header.appendChild(container)
    }

    const setDescription = () => {
      const bodyDescription = i18n('AccountLimitReached', [ACCOUNT_LIMIT])
      bodyDescription.classList.add('description')
      this.body.append(bodyDescription)
    };


    setInfograph();
    setDescription();
  }
}
