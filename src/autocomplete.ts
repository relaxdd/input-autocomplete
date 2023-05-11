function round(n: number, q = 1) {
  return Math.round(n * (10 ** q)) / (10 ** q)
}

function trim(str: string, char: string) {
  let whitespace = [
    ' ', '\n', '\r', '\t', '\f', '\x0b', '\xa0', '\u2000', '\u2001', '\u2002', '\u2003', '\u2004',
    '\u2005', '\u2006', '\u2007', '\u2008', '\u2009', '\u200a', '\u200b', '\u2028', '\u2029', '\u3000',
  ].join('')
  let l = 0
  let i = 0
  str += ''
  if (char) {
    whitespace = (char + '').replace(/([[\]().?/*{}+$^:])/g, '$1')
  }
  l = str.length
  for (i = 0; i < l; i++) {
    if (whitespace.indexOf(str.charAt(i)) === -1) {
      str = str.substring(i)
      break
    }
  }
  l = str.length
  for (i = l - 1; i >= 0; i--) {
    if (whitespace.indexOf(str.charAt(i)) === -1) {
      str = str.substring(0, i + 1)
      break
    }
  }
  return whitespace.indexOf(str.charAt(0)) === -1 ? str : ''
}

function getHeightForced(el: HTMLElement) {
  const clone = el.cloneNode(true) as HTMLElement
  const width = el.getBoundingClientRect().width
  clone.style.cssText = 'position:fixed;top:0;left:0;overflow:auto;visibility:hidden;' +
    'pointer-events:none;height:unset;max-height:unset;width:' + width + 'px'
  document.body.append(clone)
  const height = clone.getBoundingClientRect().height
  clone.remove()
  return height
}

function getTextWidth(str: string, css?: Record<string, string>) {
  const build = (k: string) => css![k] ? `${DomUtils.format(k)}:${css![k]}` : ''
  const style = css !== undefined ? Object.keys(css).map(build).join('') : ''

  const div = document.createElement('div')
  div.style.cssText = 'position:fixed;top:0;left:0;overflow:auto;visibility:hidden;pointer-events:none;' +
    'height:unset;max-height:unset;width:unset;max-width:unset;white-space:nowrap;' + style
  div.innerText = str
  document.body.append(div)
  const { width } = div.getBoundingClientRect()
  div.remove()
  return width ?? 0
}

/* ========== End utils functions ========== */

class DomUtils {
  public static css(el: HTMLElement, list: Record<string, string>) {
    for (const k in list) {
      el.style.setProperty(DomUtils.format(k), list[k]!)
    }
  }

  public static height(el?: HTMLElement) {
    return round(el?.getBoundingClientRect().height || 0)
  }

  /** Получить computedStyle элемента */
  public static style(el: HTMLElement, names: string[]) {
    return names.map(it => {
      const name = DomUtils.format(it)
      return window.getComputedStyle(el).getPropertyValue(name)
    })
  }

  /** Форматирование название css свойств */
  public static format(str: string) {
    const f = (m: string) => '-' + m.toLowerCase()
    return trim(str.replace(/[A-Z]/g, f), '-')
  }
}

/* ========== End dom utils class ========== */

type DataKeys = 'value' | 'label'
type CompleteOptionsObj = Record<DataKeys, string>
type ItemCompleteData = string | CompleteOptionsObj
export type ListOfCompleteData = ItemCompleteData[]

type MaybeCompleteAttrs = {
  /** Событие выбора подсказки */
  onSelect?: ((value: string) => void) | undefined
  /** Минимальная ширина поля ввода */
  minFieldWidth?: string | undefined
  /** Дополнительные пропсы для поля ввода */
  fieldProps?: Record<string, string> | undefined
}

export type CompleteAttrs = {
  suggestions: ListOfCompleteData
  /** Сортировать подсказки? */
  isSortHints?: boolean,
  /** Лимит вывода подсказок в боксе, поставьте -1 для отключения лимита */
  limit?: number,
  /** Базовый класс элементов плагина */
  baseClass?: string,
  /** Авто выбор первого элемента при скрытии  */
  selectFirstOnBlur?: boolean
  /** Показывать текст подсказку при навигации */
  useHelperText?: boolean,
  /** Кол-во видимых подсказок */
  qtyDisplayHints?: number,
  /** Подстраивать размер поля ввода под текст? */
  isAdaptiveField?: boolean
  /** Строгий режим */
  isStrictMode?: boolean,
} & MaybeCompleteAttrs

type ReqCompleteAttrs = Required<Omit<CompleteAttrs, 'onSelect'>> & MaybeCompleteAttrs

type EnumCompleteEvents = 'select'
type CompleteEventsList = Record<EnumCompleteEvents, ((value: string) => void)[]>
type CompleteBindKey = { key: string, callback: (ev: KeyboardEvent) => void }
type CompleteProps = Record<string, string> & { placeholder: string }

/**
 * @version 1.0.3
 * @author awenn2015
 */
class Autocomplete {
  private readonly input: HTMLInputElement
  private readonly hints: HTMLUListElement
  private readonly helper: HTMLSpanElement
  private readonly options: CompleteOptionsObj[]
  private readonly attrs: ReqCompleteAttrs
  private readonly props: CompleteProps
  private readonly events: CompleteEventsList = { select: [] }
  private readonly classes
  private readonly usingKeys: CompleteBindKey[] = []
  private readonly uuid: string

  private selected = ''
  private activeHint = { index: -1, value: '' }
  private isSelected = false
  private isInitialized = false
  private isMoving = false

  private readonly defaultOptions: ReqCompleteAttrs = {
    suggestions: [],
    isSortHints: true,
    limit: 30,
    baseClass: 'nb_autocomplete',
    selectFirstOnBlur: false,
    useHelperText: false,
    qtyDisplayHints: 10,
    isAdaptiveField: false,
    onSelect: undefined,
    minFieldWidth: undefined,
    isStrictMode: false,
    fieldProps: undefined,
  }

  constructor(input: HTMLInputElement, attrs: CompleteAttrs, initialize = false) {
    this.attrs = this.mergeOptions(attrs)
    this.options = this.sortOptions(this.attrs.suggestions)

    this.classes = {
      wrapper: this.attrs.baseClass,
      field: this.attrs.baseClass + '__field',
      hints: this.attrs.baseClass + '__hints',
      float: this.attrs.baseClass + '__float',
    }

    this.input = input

    this.uuid = this.randomId()
    this.props = this.mergeFieldProps()
    this.hints = this.renderHints()
    this.helper = this.renderHelper()

    if (this.attrs?.onSelect)
      this.events.select.push(this.attrs.onSelect)

    if (initialize) this.init()
  }

  private mergeFieldProps(): CompleteProps {
    return {
      placeholder: this.input?.placeholder || '',
      ...this.attrs.fieldProps,
    }
  }

  public init() {
    if (this.isInitialized)
      throw new Error('Невозможно повторно инициализировать плагин!')

    if (this.attrs.isStrictMode)
      this.attrs.selectFirstOnBlur = true

    this.doRender()
    this.doEvents()

    if (this.attrs.isAdaptiveField)
      this.setAdaptiveWidth()

    this.isInitialized = true
  }

  /*
   * ======== Getters ========
   */

  get value() {
    return this.selected
  }

  /*
   * ======== Methods ========
   */

  private setAdaptiveWidth(text?: string, def = 40) {
    const value = text || this.input.value || this.input.placeholder
    const fonts = DomUtils.style(this.input, ['font'])[0]!
    const width = getTextWidth(value, { font: fonts })
    const style = ['paddingLeft', 'paddingRight', 'borderRightWidth', 'borderLeftWidth']
    const sizes = DomUtils.style(this.input, style)
    const plus = sizes.map(it => it ? parseFloat(it) : 0).reduce((n, it) => n + it, 0)
    const total = width + (plus || def) + 2 // 1px запас на всякий случай
    const minWidth = this.attrs?.minFieldWidth

    DomUtils.css(this.input, { width: minWidth && total < parseFloat(minWidth) ? minWidth : `${round(total)}px` })
  }

  private doRender() {
    const parent = this.input.parentElement!
    const wrapper = document.createElement('div')

    this.input.classList.add(this.classes.field)
    this.input.setAttribute('data-uuid', this.uuid)
    wrapper.classList.add(this.classes.wrapper)

    wrapper.append(this.input)
    parent.append(wrapper)

    this.input.after(this.hints)

    const border = 2
    const qtyHints = this.attrs.qtyDisplayHints
    const hintHeight = getHeightForced(this.hints) - border
    const itemHeight = round(hintHeight / this.getCountHints())
    const visibleHeight = (itemHeight * qtyHints) + border

    DomUtils.css(this.hints, { maxHeight: `${visibleHeight}px` })

    if (this.attrs.fieldProps) {
      for (const k in this.attrs.fieldProps)
        this.input.setAttribute(k, this.attrs.fieldProps[k]!)
    }

    if (this.attrs.useHelperText)
      wrapper.append(this.helper)

    this.selectFirstHint(this.attrs.isStrictMode)
  }

  private doEvents() {
    this.input.addEventListener('focus', this.onFieldFocus.bind(this))
    this.input.addEventListener('blur', this.onFieldBlur.bind(this))
    this.input.addEventListener('input', this.onFieldInput.bind(this))
    this.input.addEventListener('keydown', this.onFieldPress.bind(this))

    this.hints.addEventListener('click', this.onHintClick.bind(this))
    this.hints.addEventListener('mouseover', this.onHintOver.bind(this))
    this.hints.addEventListener('mousemove', this.onHintMove.bind(this))

    document.addEventListener('click', this.onGlobalClick.bind(this))
  }

  private renderHints(): HTMLUListElement {
    const hints = document.createElement('ul')

    hints.classList.add(this.classes.hints)
    hints.setAttribute('data-uuid', this.uuid)
    DomUtils.css(hints, { display: 'none' })
    hints.append(...this.buildHints())

    return hints
  }

  private renderHelper() {
    const div = document.createElement('div')
    const span1 = document.createElement('span')
    const span2 = document.createElement('span')

    div.classList.add(this.classes.float)
    DomUtils.css(div, { display: 'none' })
    div.append(span1, span2)

    return div
  }

  /**
   * Обновить список подсказок
   */
  private updateHints(show = true) {
    const list = this.filterHintItems()
    const out = this.buildHints(list)

    this.hints.innerHTML = ''
    this.hints.append(...out)

    if (show)
      this.setHintsVisible(out.length !== 0)
  }

  private buildHints(options?: CompleteOptionsObj[]): HTMLLIElement[] {
    options = options || this.options

    const slice = this.attrs.limit !== -1
      ? options.slice(0, this.attrs.limit)
      : options

    const renderItem = (it: CompleteOptionsObj, i: number) => {
      const li = document.createElement('li')

      li.innerText = it.label
      li.setAttribute('data-index', String(i))
      li.setAttribute('data-value', it.value)

      return li
    }

    return slice.map(renderItem)
  }

  private toShowHintsBox() {
    if (this.getCountHints() > 0 && !this.isSelected)
      this.setHintsVisible(true)
  }

  private selectHintValue(i = 0) {
    i = i === -1 ? 0 : i

    const label = this.getHintData(i, 'label')
    const value = this.getHintData(i, 'value')

    if (!label || !value) return

    this.input.value = label
    this.selected = value

    this.toHideHintsBox()
    this.updateHints(false)

    this.input.blur()
    this.isSelected = true

    this.notifySelect()
  }

  private notifySelect(value?: string) {
    this.events.select.forEach((cb) => cb(value ?? this.selected))
  }

  private showHelperText(i: number) {
    const qty = this.input.value.length
    const text = this.getHintItem(i)?.innerText || ''
    const parts = this.helper.querySelectorAll('span')

    parts[0]!.innerText = text.slice(0, qty)
    parts[1]!.innerText = text.slice(qty)

    DomUtils.css(this.helper, { display: 'block' })
  }

  private hideHelperText() {
    this.helper.querySelectorAll('span').forEach((it) => {
      it.innerText = ''
    })

    DomUtils.css(this.helper, { display: 'none' })
  }

  private moveByHintItems(isDown: boolean) {
    const list = this.getHintItems()
    const count = list.length

    const next = this.activeHint.index === -1
      ? isDown ? 0 : count - 1
      : this.activeHint.index + (isDown ? 1 : -1)

    const safe = ((): number => {
      if (next >= count) return 0
      else if (next < 0) return count - 1
      else return next
    })()

    const activeText = list?.[safe]?.innerText

    this.setActiveHint(safe)
    this.setPlaceholder(activeText || null)

    if (this.input.value) this.showHelperText(safe)
    if (count <= this.attrs.qtyDisplayHints) return

    const hintHeight = DomUtils.height(this.hints) - 2
    const itemHeight = DomUtils.height(this.getHintItem(0))
    const progress = round(itemHeight * safe)
    const scroll = this.hints.scrollTop
    const after = scroll + hintHeight - itemHeight
    const isVisible = progress >= scroll && progress < after

    if (isVisible) return

    this.isMoving = true

    if (!isDown)
      this.hints.scrollTo(0, safe * itemHeight)
    else {
      const scroll = (safe + 1) - this.attrs.qtyDisplayHints
      this.hints.scrollTo(0, scroll * itemHeight)
    }
  }

  private setActiveHint(index = -1) {
    const item = this.getHintItem(index)
    const value = item?.dataset?.['value'] ?? ''

    this.getHintItems().forEach((it) => {
      it.classList.remove('active')
    })

    this.activeHint = { index, value }
    item?.classList.add('active')
  }

  private toHideHintsBox() {
    this.setHintsVisible(false)
    this.setActiveHint(-1)
    this.setPlaceholder(null)
    this.hideHelperText()

    if (this.attrs.isAdaptiveField)
      this.setAdaptiveWidth()
  }

  private selectFirstHint(force = false) {
    if (!this.attrs.selectFirstOnBlur
      || (force ? false : this.getCountHints() > 1)) return

    const label = this.getHintData(0, 'label')
    const value = this.getHintData(0, 'value')

    this.input.value = label
    this.selected = value
    this.isSelected = true

    this.notifySelect()
  }

  /*
   * ======== Handlers ========
   */

  public onSelect(callback: (value: string) => void) {
    this.events.select.push(callback)
  }

  public updateSuggestions(suggestions: ListOfCompleteData) {
    this.options.splice(0)
    this.options.push(...this.sortOptions(suggestions))
    this.updateHints(false)
  }

  public bindKeyPress(keyCode: string, callback: CompleteBindKey['callback']) {
    this.usingKeys.push({ key: keyCode, callback })
  }

  /*
   * ======== Events ========
   */

  private onFieldFocus() {
    this.toShowHintsBox()
  }

  private onFieldBlur() {
    this.selectFirstHint(this.attrs.isStrictMode)

    setTimeout(() => {
      this.toHideHintsBox()
    }, 150)
  }

  private onFieldPress(e: KeyboardEvent) {
    const usingKeys = [
      'ArrowRight', 'Enter', 'ArrowDown', 'ArrowUp', 'Escape', 'Space',
    ]

    if (![...usingKeys, ...this.usingKeys.map(it => it.key)].includes(e.code)) return
    if (this.isSelected) return

    switch (e.code) {
      // @ts-ignore
      case 'ArrowRight':
        const { selectionStart, value } = this.input
        if (selectionStart !== value.length) break
      case 'Enter':
        const index = this.activeHint.index
        this.selectHintValue(index)
        break
      case 'ArrowDown':
      case 'ArrowUp':
        e.preventDefault()
        const isDown = e.code === 'ArrowDown'
        this.moveByHintItems(isDown)
        break
      case 'Escape':
        this.toHideHintsBox()
        break
      case 'Space':
        if (!e.ctrlKey) return
        this.toShowHintsBox()
        break
    }

    if (!this.usingKeys.length) return

    for (const { key, callback } of this.usingKeys) {
      if (e.code === key) {
        callback(e)
        break
      }
    }
  }

  private onFieldInput() {
    this.updateHints()
    this.hideHelperText()

    this.selected = ''
    this.isSelected = false
    this.activeHint = { index: -1, value: '' }
  }

  private onHintClick(e: Event) {
    if (e.target === this.hints) return
    const index = this.getHintIndex(e.target)
    this.selectHintValue(index)
  }

  private onHintOver(e: Event) {
    if (this.hints === e.target || this.isMoving)
      return

    const li = e.target as HTMLLIElement
    const index = this.getHintIndex(li)

    this.setActiveHint(index)
    this.setPlaceholder(li.innerText || this.props.placeholder)
  }

  private onHintMove() {
    if (!this.isMoving) return
    this.isMoving = false
  }

  private onGlobalClick(e: Event) {
    e.stopPropagation()

    const isHints = e.composedPath().includes(this.hints)
    const isInput = e.target === this.input
    const othersList = [...document.querySelectorAll(`.${this.classes.field}`)]
    const isSimilar = othersList.some((it) => it === this.input)

    if ([isHints, isInput, isSimilar].some(Boolean))
      return

    this.selectFirstHint(this.attrs.isStrictMode)
    this.toHideHintsBox()
  }

  /*
   * ======== Helpers ========
   */

  private getHintItems() {
    return [...this.hints.querySelectorAll('li')]
  }

  private getHintItem(index: number) {
    return this.getHintItems()?.[index]
  }

  private getCountHints() {
    return this.getHintItems().length
  }

  private setHintsVisible(s: boolean) {
    DomUtils.css(this.hints, { display: s ? 'block' : 'none' })
    this.hints.scrollTo(0, 0)
  }

  private setPlaceholder(text: string | null) {
    const k = 'placeholder'
    this.input.setAttribute(k, text || this.props[k])
  }

  private getHintIndex(el?: HTMLLIElement | EventTarget | null) {
    return +((el as HTMLElement)?.dataset?.['index'] ?? -1)
  }

  private getHintData(index: number, key: 'value' | 'label') {
    const el = this.getHintItem(index)

    switch (key) {
      case 'label':
        return el?.innerText ?? ''
      case 'value':
        return el?.dataset?.[key] ?? ''
    }
  }

  /*
   * ======== Utils ========
   */

  private randomId() {
    return Math.floor(Math.random() * Date.now()).toString(36)
  }

  private filterHintItems() {
    const value = this.input.value.toLowerCase()

    return this.options.filter((it) => {
      return it.label.toLowerCase().startsWith(value)
    })
  }

  private mergeOptions(options?: CompleteAttrs): ReqCompleteAttrs {
    if (!options || !Object.keys(options).length)
      return this.defaultOptions

    function merge<T extends Object>(obj: Partial<T>, def: T) {
      return (Object.keys(def) as (keyof T)[]).reduce<T>((acc, k) => {
        acc[k] = k in obj ? obj[k]! : def[k]!
        return acc
      }, {} as T)
    }

    return merge(options, this.defaultOptions)
  }

  private sortOptions(list: ListOfCompleteData): CompleteOptionsObj[] {
    const oneView = (it: ItemCompleteData) => {
      return typeof it === 'object' ? it : { value: it, label: it }
    }

    const uniqList = <T extends CompleteOptionsObj>(acc: T[], it: T) => {
      if (!acc.find(n => n.label === it.label)) acc.push(it)
      return acc
    }

    const data = list.map(oneView).reduce<CompleteOptionsObj[]>(uniqList, [])
    return this.attrs.isSortHints ? data.sort((a, b) => a.label.localeCompare(b.label)) : data
  }
}

export default Autocomplete

/* ======== Demo initialize plugin  ======== */

function initDemoAutocomplete() {
  const data = [
    'Москва', 'Санкт-Петербург', 'Астана', 'Новосибирск', 'Екатеринбург', 'Казань', 'Мурманск', 'Нижний Новгород',
    'Ижевск', 'Красноярск', 'Челябинск', 'Чебоксары', 'Набережные Челны', 'Омск', 'Иркутск', 'Самара', 'Тюмень',
    'Уфа', 'Ульяновск', 'Владимир', 'Суздаль', 'Алматы', 'Киров', 'Вологда', 'Барнаул', 'Урюпинск', 'Дзержинск'
  ]

  /*
   * Параметры автокомплита
   */
  const config: CompleteAttrs = {
    suggestions: data,
    useHelperText: false,
    isAdaptiveField: true,
    qtyDisplayHints: 8,
    selectFirstOnBlur: true,
    limit: 30,
    baseClass: 'nb_autocomplete',
    onSelect: (value) => {
      console.log(value)
    },
  }

  const input = document.querySelector<HTMLInputElement>('#input')
  const cmpl = new Autocomplete(input!, config, true)

  // cmpl.init()

  // cmpl.bindKeyPress('Digit2', (ev) => {
  //   ev.preventDefault()
  //   console.log(ev)
  // })

  // cmpl.onSelect((value) => {
  //   console.log(value)
  // })
}

initDemoAutocomplete()