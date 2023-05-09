function setStyle(el: HTMLElement, list: Record<string, string>) {
  for (const prop in list)
    el.style.setProperty(prop, list[prop]!)
}

function round(n: number, q = 1) {
  return Math.round(n * 10 ** 1) / 10 ** q
}

function getHeight(el?: HTMLElement) {
  return round(el?.getBoundingClientRect().height || 0)
}

/* Utils functions */

type DataKeys = 'value' | 'label'
type CompleteOptionsObj = Record<DataKeys, string>
type ItemCompleteData = string | CompleteOptionsObj
type ListOfCompleteData = ItemCompleteData[]

type MaybeCompleteAttrs = {
  /** Событие выбора подсказки */
  onSelect?: (value: string) => void
}

type CompleteAttrs = {
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
} & MaybeCompleteAttrs

type ReqCompleteAttrs = Required<Omit<CompleteAttrs, 'onSelect'>> & MaybeCompleteAttrs

/**
 * TODO: Разделить логику комплита для blur и click/enter/arrowRight
 *
 * @version 1.0.0
 * @author awenn2015
 */
class NbAutocomplete {
  private readonly input: HTMLInputElement
  private readonly hints: HTMLUListElement
  private readonly helper: HTMLSpanElement
  private readonly options: CompleteOptionsObj[]
  private readonly attrs: ReqCompleteAttrs
  private readonly classes
  private readonly props: { placeholder: string }

  private activeHint = { index: -1, value: '' }
  private isSelected = false
  private isInitialized = false

  private readonly defaultOptions: ReqCompleteAttrs = {
    limit: 30,
    baseClass: 'nb_autocomplete',
    selectFirstOnBlur: true,
    useHelperText: true,
    qtyDisplayHints: 10,
  }

  constructor(
    input: HTMLInputElement,
    data: ListOfCompleteData,
    options?: CompleteAttrs,
    initialize = false,
  ) {
    this.attrs = this.mergeOptions(options)
    this.options = this.sortOptions(data)

    this.classes = {
      wrapper: this.attrs.baseClass,
      field: this.attrs.baseClass + '__field',
      hints: this.attrs.baseClass + '__hints',
      float: this.attrs.baseClass + '__float',
    }

    this.input = input
    this.props = { placeholder: input?.placeholder || '' }
    this.hints = this.renderHints()
    this.helper = this.renderHelper()

    if (initialize) this.init()
  }

  public init() {
    if (this.isInitialized)
      throw new Error('Невозможно повторно инициализировать плагин!')

    this.render()
    this.events()

    this.isInitialized = true
  }

  /* ======== Private methods ======== */

  private render() {
    const parent = this.input.parentElement!
    const wrapper = document.createElement('div')

    this.input.classList.add(this.classes.field)
    wrapper.classList.add(this.classes.wrapper)

    wrapper.append(this.input)
    parent.append(wrapper)

    this.input.after(this.hints)

    setStyle(this.hints, {
      'max-height': `${(32.8 * this.attrs.qtyDisplayHints) + 2}px`,
    })

    if (this.attrs.useHelperText)
      wrapper.append(this.helper)
  }

  private events() {
    this.input.addEventListener('focus', this.onInputFocus.bind(this))
    this.input.addEventListener('blur', this.onInputBlur.bind(this))
    this.input.addEventListener('input', this.onInputText.bind(this))
    this.input.addEventListener('keydown', this.onInputKeyDown.bind(this))

    this.hints.addEventListener('click', this.onHintClick.bind(this))
    this.hints.addEventListener('mouseover', this.onHintOver.bind(this))
    this.hints.addEventListener('mouseout', this.onHintOut.bind(this))

    document.addEventListener('click', this.onGlobalClick.bind(this))
  }

  private renderHints(): HTMLUListElement {
    const hints = document.createElement('ul')

    hints.classList.add(this.classes.hints)
    hints.style.setProperty('display', 'none')
    hints.append(...this.buildHints())

    return hints
  }

  private renderHelper() {
    const div = document.createElement('div')
    const span1 = document.createElement('span')
    const span2 = document.createElement('span')

    div.classList.add(this.classes.float)
    setStyle(div, { 'display': 'none' })
    div.append(span1, span2)

    return div
  }

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

  private completeValueHint(i = 0, whenOne = true) {
    if (!this.attrs.selectFirstOnBlur) return

    const items = this.getHintItems()
    const label = items[i]?.innerText || ''
    const value = items[i]?.dataset?.['value'] || label

    if (!(label && (whenOne ? items.length === 1 : true)))
      return

    this.input.value = label
    this.setHintsVisible(false)
    this.setPlaceholder()
    this.hideHelperText()
    this.input.blur()
    this.isSelected = true

    if (this.attrs?.onSelect !== undefined)
      this.attrs.onSelect(value)
  }

  private showHelperText(i: number) {
    const qty = this.input.value.length
    const text = this.getHintItem(i)?.innerText || ''
    const parts = this.helper.querySelectorAll('span')

    parts[0]!.innerText = text.slice(0, qty)
    parts[1]!.innerText = text.slice(qty)

    this.helper.style.setProperty('display', 'block')
  }

  private hideHelperText() {
    this.helper.querySelectorAll('span').forEach((it) => {
      it.innerText = ''
    })

    this.helper.style.setProperty('display', 'none')
  }

  private moveByHintItems(isDown: boolean) {
    const list = this.getHintItems()
    const count = list.length

    const next = this.activeHint.index === -1
      ? isDown ? 0 : count - 1
      : this.activeHint.index + (isDown ? 1 : -1)

    const safe = ((): number => {
      if (next >= count)
        return 0
      else if (next < 0)
        return count - 1
      else
        return next
    })()

    const activeText = list?.[safe]?.innerText

    this.setActiveHint(safe)
    this.setPlaceholder(activeText)

    if (this.input.value)
      this.showHelperText(safe)

    if (count <= this.attrs.qtyDisplayHints)
      return

    const hintHeight = getHeight(this.hints) - 2
    const itemHeight = getHeight(this.getHintItem(0))
    const progress = round(itemHeight * safe)
    const scroll = this.hints.scrollTop
    const after = scroll + hintHeight
    const isVisible = progress >= scroll && progress < after

    console.clear()
    console.log('scroll', scroll)
    console.log('progress', progress)
    console.log('after', after)

    if (isVisible) return

    if (!isDown)
      this.hints.scrollTo(0, safe * itemHeight)
    else {
      const scroll = (safe + 1) - this.attrs.qtyDisplayHints
      this.hints.scrollTo(0, scroll * itemHeight)
    }
  }

  /** @deprecated */
  private changeActiveHintsPage(index: number, isDown: boolean) {
    // const itemHeight = getHeight(this.getHintItem(0))
    // const offsetHeight = getHeight(this.hints)
    const innerHeight = this.hints.clientHeight
    const nextPage = Math.ceil((index + 1) / this.attrs.qtyDisplayHints)
    const nextScroll = innerHeight * nextPage - innerHeight

    this.hints.scrollTo(0, nextScroll)

    // const canTogglePage = innerHeight * nextPage < itemHeight * this.getCountHints()
    // if (isDown) {
    // 	if (canTogglePage)
    // 		this.hints.scrollTo(0, nextScroll)
    // 	else
    // 		this.hints.scrollBy(0, itemHeight)
    // } else {
    // 	this.hints.scrollTo(0, nextScroll)
    // }
  }

  private setActiveHint(index = -1) {
    const item = this.getHintItem(index)
    const value = item?.dataset?.['value'] || ''

    this.getHintItems().forEach(it => {
      it.classList.remove('active')
    })

    this.activeHint = { index, value }
    item?.classList.add('active')
  }

  /* ======== Events ======== */

  private onInputFocus() {
    if (this.getCountHints() < 2) return
    this.setHintsVisible(true)
  }

  private onInputBlur() {
    this.completeValueHint()
    this.hideHelperText()
    this.setPlaceholder()

    setTimeout(() => {
      this.setHintsVisible(false)
      this.setActiveHint()
    }, 150)
  }

  private onInputKeyDown(e: KeyboardEvent) {
    const usingKeys = ['ArrowRight', 'Enter', 'ArrowDown', 'ArrowUp']

    if (!usingKeys.includes(e.code)) return
    if (this.isSelected) return

    switch (e.code) {
      case 'ArrowRight':
      case 'Enter':
        const index = this.activeHint.index
        this.completeValueHint(index, false)
        break
      case 'ArrowDown':
      case 'ArrowUp':
        e.preventDefault()
        const isDown = e.code === 'ArrowDown'
        this.moveByHintItems(isDown)
        break
    }
  }

  private onInputText() {
    this.updateHints()
    this.hideHelperText()

    this.isSelected = false
    this.activeHint = { index: -1, value: '' }
  }

  private onHintClick(e: Event) {
    if (e.target === this.hints)
      return

    this.input.value = (e.target as HTMLLIElement).innerText
    this.isSelected = true

    this.setHintsVisible(false)
    this.updateHints(false)
  }

  private onHintOver(e: Event) {
    if (this.hints === e.target) return
    const li = e.target as HTMLLIElement

    this.setActiveHint(+(li?.dataset?.['index'] || -1))
    this.setPlaceholder(li.innerText || this.props.placeholder)
  }

  private onHintOut(e: Event) {
    if (this.hints === e.target)
      return

    // this.setPlaceholder()
  }

  private onGlobalClick(e: Event) {
    e.stopPropagation()

    const isHints = e.composedPath().includes(this.hints)
    const isInput = e.target === this.input

    if (isHints || isInput)
      return

    this.setHintsVisible(false)
    this.setActiveHint()
    this.setPlaceholder()
  }

  /* ======== Helpers ======== */

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
    this.hints.style.setProperty('display', s ? 'block' : 'none')
    this.hints.scrollTo(0, 0)
  }

  private setPlaceholder(text?: string) {
    const k = 'placeholder'
    this.input.setAttribute(k, text || this.props[k])
  }

  /* ======== Utils ======== */

  private filterHintItems() {
    const value = this.input.value.toLowerCase()

    return this.options.filter((it) => {
      return it.label.toLowerCase().startsWith(value)
    })
  }

  private mergeOptions(options?: CompleteAttrs): ReqCompleteAttrs {
    if (!options) return this.defaultOptions
    const def = this.defaultOptions

    return {
      limit: options?.limit || def.limit,
      baseClass: options?.baseClass || def.baseClass,
      selectFirstOnBlur: options?.selectFirstOnBlur || def.selectFirstOnBlur,
      useHelperText: options?.useHelperText || def.useHelperText,
      qtyDisplayHints: options?.qtyDisplayHints || def.qtyDisplayHints,
      onSelect: options?.onSelect,
    }
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
    return data.sort((a, b) => a.label.localeCompare(b.label))
  }
}

export default NbAutocomplete