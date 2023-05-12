type DataKeys = 'value' | 'label'
type CompleteOptionsObj = Record<DataKeys, string>
type ItemCompleteData = string | CompleteOptionsObj

export type ListOfCompleteData = ItemCompleteData[]

type MaybeCompleteAttrs = {
  /** Событие выбора подсказки */
  onSelect?: ((value: string) => void) | undefined
  /** Минимальная ширина поля ввода, полезно при адаптивной ширине */
  minFieldWidth?: number | string | undefined
  /** Дополнительные пропсы для поля ввода */
  inputFieldProps?: Record<string, string> | undefined
}

export type CompleteAttrs = {
  suggestions: ListOfCompleteData
  /** Сортировать подсказки? */
  isSortHints?: boolean,
  /** Лимит вывода подсказок в боксе, поставьте -1 для отключения лимита */
  hintsLimit?: number,
  /** Базовый класс элементов плагина */
  baseClass?: string,
  /**
   * Авто выбор первого элемента при скрытии globalClick / blur при условии,
   * что в подсказках 1 элемент, если включен строгий режим то этот атрибут всегда будет true
   */
  selectFirstOnBlur?: boolean
  /** Показывать текст подсказку при навигации когда введена часть символов */
  useHelperText?: boolean,
  /** Кол-во видимых подсказок в боксе */
  qtyDisplayHints?: number,
  /** Подстраивать размер поля ввода под текст? */
  isAdaptiveField?: boolean
  /** Строгий режим, всегда будет выбрано какое-то значение */
  isStrictMode?: boolean,
  /** Не фильтровать и показывать подсказки даже после выбора элемента */
  showHintsAfterSelect?: boolean
  /** Показывать маркер совпадения в списке подсказок */
  isWithMatchMark?: boolean
} & MaybeCompleteAttrs

type ReqCompleteAttrs = Required<Omit<CompleteAttrs, keyof MaybeCompleteAttrs>> & MaybeCompleteAttrs

type EnumCompleteEvents = 'select'
type CompleteEventsList = Record<EnumCompleteEvents, ((value: string) => void)[]>
type CompleteBindKey = { key: string, callback: (ev: KeyboardEvent) => void }
type CompleteProps = Record<string, string> & { placeholder: string }