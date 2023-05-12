import type {
  CompleteAttrs,
  CompleteBindKey,
  CompleteEventsList,
  CompleteOptionsObj,
  CompleteProps,
  ItemCompleteData,
  ListOfCompleteData,
  ReqCompleteAttrs
} from "../types";
import DomUtils from "./DomUtils";
import { getHeightForced, getTextWidth, round } from "../includes/utils";

/**
 * @version 1.0.4
 * @author awenn2015
 */
class Autocomplete {
  private readonly input: HTMLInputElement
  private readonly hints: HTMLUListElement
  private readonly helper: HTMLSpanElement
  private readonly attrs: ReqCompleteAttrs
  private readonly props: CompleteProps
  private readonly events: CompleteEventsList = { select: [] }
  private readonly classes
  private readonly usingKeys: CompleteBindKey[] = []
  private readonly uuid: string
  private readonly isStrict: boolean

  private options: CompleteOptionsObj[]
  private selected = ''
  private activeHint = { index: -1, value: '' }
  private isSelected = false
  private isInitialized = false
  private isMoving = false

  private readonly defaultOptions: ReqCompleteAttrs = {
    suggestions: [],
    isSortHints: true,
    hintsLimit: 30,
    baseClass: 'nb_autocomplete',
    selectFirstOnBlur: false,
    useHelperText: false,
    qtyDisplayHints: 10,
    isAdaptiveField: false,
    onSelect: undefined,
    minFieldWidth: undefined,
    isStrictMode: false,
    inputFieldProps: undefined,
    showHintsAfterSelect: true
  }

  constructor(input: HTMLInputElement, attrs: CompleteAttrs, initialize = false) {
    this.attrs = this.mergeAttributes(attrs)
    this.options = this.sortOptions(this.attrs.suggestions)

    this.isStrict = this.attrs.isStrictMode

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
      ...this.attrs.inputFieldProps,
    }
  }

  public init() {
    if (this.isInitialized)
      throw new Error('Невозможно повторно инициализировать плагин!')

    if (this.isStrict)
      this.attrs.selectFirstOnBlur = true

    this.doRender()
    this.doEvents()
    this.setAdaptiveWidth()

    this.isInitialized = true
  }

  /*
   * ======== Getters ========
   */

  /** Выбранная подсказка */
  get value() {
    return this.selected
  }

  set value(value: string) {
    this.selected = value
  }

  /** Значение в поле ввода */
  get label() {
    return this.input.value
  }

  set label(value: string) {
    this.input.value = value
  }

  /*
   * ======== Methods ========
   */

  private setAdaptiveWidth(text?: string, def = 40) {
    if (!this.attrs.isAdaptiveField) return

    const value = text || this.label || this.input.placeholder
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

    if (this.attrs.inputFieldProps) {
      for (const k in this.attrs.inputFieldProps)
        this.input.setAttribute(k, this.attrs.inputFieldProps[k]!)
    }

    if (this.attrs.useHelperText)
      wrapper.append(this.helper)

    this.selectFirstHint(this.isStrict)
  }

  private doEvents() {
    this.input.addEventListener('click', this.onFieldClick.bind(this))
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
  private updateHints() {
    if (this.attrs.showHintsAfterSelect) return

    const list = this.filterHintItems()
    const out = this.buildHints(list)

    this.hints.innerHTML = ''
    this.hints.append(...out)
  }

  private buildHints(options?: CompleteOptionsObj[]): HTMLLIElement[] {
    options = options || this.options

    const slice = this.attrs.hintsLimit !== -1
      ? options.slice(0, this.attrs.hintsLimit)
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
    const isHasHints = this.getCountHints() > 0
    const showAfterClick = this.attrs.showHintsAfterSelect ? true : !this.isSelected
    if (isHasHints && showAfterClick) this.setHintsVisible(true)
  }

  private selectHintValue(i = 0) {
    i = i === -1 ? 0 : i

    const label = this.getHintData(i, 'label')
    const value = this.getHintData(i, 'value')

    if (!label || !value) return

    this.label = label
    this.value = value

    this.toHideHintsBox()
    this.updateHints()

    // if (!this.attrs.showHintsAfterSelect) this.input.blur()

    this.isSelected = true
    this.notifySelect()
  }

  private notifySelect(value?: string) {
    this.events.select.forEach((cb) => cb(value ?? this.value))
  }

  private showHelperText(i: number) {
    const qty = this.label.length
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

  /**
   * Навигация по списку подсказок
   */
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

    if (this.label) this.showHelperText(safe)
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

  /**
   * Установить активный элемент подсказки
   */
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
    this.setPlaceholder(null)
    this.hideHelperText()
    this.setAdaptiveWidth()

    if (!this.attrs.showHintsAfterSelect)
      this.setActiveHint(-1)
  }

  private selectFirstHint(force = false) {
    const isNoNeed = [
      !this.attrs.selectFirstOnBlur,
      (force ? false : this.getCountHints() > 1),
      this.isSelected
    ]

    if (isNoNeed.some(Boolean)) return

    const search = (label: string): CompleteOptionsObj => {
      const list = this.filterHintItems(label)
      if (list.length) return list[0]!
      return search(label.slice(0, -1))
    }

    const { value, label } = !this.label.length
      ? this.options[0]! : search(this.label)

    this.label = label
    this.value = value

    this.isSelected = true

    this.setAdaptiveWidth(label)
    this.notifySelect()
  }

  /*
   * ======== Handlers ========
   */

  public onSelect(callback: (value: string) => void) {
    this.events.select.push(callback)
  }

  public updateSuggestions(suggestions: ListOfCompleteData) {
    this.options = this.sortOptions(suggestions)

    this.isSelected = false
    this.value = ''
    this.label = ''
    this.activeHint = { index: -1, value: '' }

    this.updateHints()
    this.selectFirstHint(true)
  }

  public bindKeyPress(keyCode: string, callback: CompleteBindKey['callback']) {
    this.usingKeys.push({ key: keyCode, callback })
  }

  /*
   * ======== Events ========
   */

  private onFieldClick() {
    this.toShowHintsBox()
  }

  private onFieldBlur() {
    this.selectFirstHint(this.isStrict)

    setTimeout(() => {
      this.toHideHintsBox()
    }, 150)
  }

  private onFieldPress(e: KeyboardEvent) {
    const usingKeys = [
      'ArrowRight', 'Enter', 'ArrowDown', 'ArrowUp', 'Escape', 'Space',
    ]

    if (![...usingKeys, ...this.usingKeys.map(it => it.key)].includes(e.code)) return
    if (!this.attrs.showHintsAfterSelect && this.isSelected) return

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
        const { display } = this.hints.style
        if (display === 'none') this.input.blur()
        else this.toHideHintsBox()
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
    const isShow = this.getCountHints() > 0

    this.updateHints()
    this.setHintsVisible(isShow)
    this.hideHelperText()

    this.value = ''
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

    this.selectFirstHint(this.isStrict)
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

  private setHintsVisible(show: boolean) {
    DomUtils.css(this.hints, { display: show ? 'block' : 'none' })
    if (!this.attrs.showHintsAfterSelect) this.hints.scrollTo(0, 0)
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
        return el?.innerText ?? null
      case 'value':
        return el?.dataset?.[key] ?? null
    }
  }

  /*
   * ======== Utils ========
   */

  private randomId() {
    return Math.floor(Math.random() * Date.now()).toString(36)
  }

  private filterHintItems(label?: string) {
    label = (label ?? this.label).toLowerCase()

    return this.options.filter((it) => {
      return it.label.toLowerCase().startsWith(label!)
    })
  }

  private mergeAttributes(options?: CompleteAttrs): ReqCompleteAttrs {
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