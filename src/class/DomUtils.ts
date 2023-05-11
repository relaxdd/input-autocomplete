import { round, trim } from "../includes/utils";

class DomUtils {
  public static css(el: HTMLElement, list: Record<string, string>) {
    for (const k in list) {
      el.style.setProperty(DomUtils.format(k), list[k]!)
    }
  }

  public static height(el?: HTMLElement) {
    return round(el?.getBoundingClientRect().height || 0)
  }

  /**
   * Получить computedStyle элемента
   */
  public static style(el: HTMLElement, names: string[]) {
    return names.map(it => {
      const name = DomUtils.format(it)
      return window.getComputedStyle(el).getPropertyValue(name)
    })
  }

  /**
   * Форматирование названий css свойств
   */
  public static format(str: string) {
    const f = (m: string) => '-' + m.toLowerCase()
    return trim(str.replace(/[A-Z]/g, f), '-')
  }
}

export default DomUtils