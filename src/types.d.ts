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
  /** Авто выбор первого элемента при скрытии globalClick / blur */
  selectFirstOnBlur?: boolean
  /** Показывать текст подсказку при навигации когда введена часть символов */
  useHelperText?: boolean,
  /** Кол-во видимых подсказок в боксе */
  qtyDisplayHints?: number,
  /** Подстраивать размер поля ввода под текст? */
  isAdaptiveField?: boolean
  /** Строгий режим, всегда будет выбрано какое-то значение */
  isStrictMode?: boolean,
  /** Показывать подсказки даже после выбора элемента */
  showHintsAfterSelect?: boolean
} & MaybeCompleteAttrs

type ReqCompleteAttrs = Required<Omit<CompleteAttrs, keyof MaybeCompleteAttrs>> & MaybeCompleteAttrs

type EnumCompleteEvents = 'select'
type CompleteEventsList = Record<EnumCompleteEvents, ((value: string) => void)[]>
type CompleteBindKey = { key: string, callback: (ev: KeyboardEvent) => void }
type CompleteProps = Record<string, string> & { placeholder: string }