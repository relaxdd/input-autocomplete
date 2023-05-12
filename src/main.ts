import { CompleteAttrs } from "./types";
import Autocomplete from "./class/Autocomplete";

/*
 * В плагине доступны следующие клавиши:
 *
 * Enter / RightArrow = выбрать подсказку
 * Escape = скрыть бокс с подсказками, после снять фокус с поля ввода
 * Ctrl + Space = показать бокс с подсказками
 *
 * Публичные методы плагина:
 *
 * Инициализация плагина
 * autocomplete.init()
 *
 * Отслеживать нажатия клавиши
 *
 * autocomplete.onKeyPress('Digit2', (ev) => {
 *   ev.preventDefault()
 *   console.log(ev)
 * })
 */
function initDemoAutocomplete() {
  const example = [
    'Москва', 'Санкт-Петербург', 'Астана', 'Новосибирск', 'Екатеринбург', 'Казань', 'Мурманск', 'Нижний Новгород',
    'Ижевск', 'Красноярск', 'Челябинск', 'Чебоксары', 'Набережные Челны', 'Омск', 'Иркутск', 'Самара', 'Тюмень',
    'Уфа', 'Ульяновск', 'Владимир', 'Суздаль', 'Алматы', 'Киров', 'Вологда', 'Барнаул', 'Урюпинск', 'Дзержинск',
    'Димитровград', 'Нижний Тагил', 'Тольятти', 'Сызрань', 'Сочи', 'Краснодар', 'Хабаровск', 'Якутск', 'Новороссийск',
    'Владивосток', 'Томск', 'Нижнекамск', 'Симферополь'
  ]

  /*
   * Параметры автозаполнения
   */
  const config: CompleteAttrs = {
    suggestions: example,
    useHelperText: false,
    isAdaptiveField: false,
    qtyDisplayHints: 10,
    selectFirstOnBlur: true,
    hintsLimit: -1,
    isStrictMode: false,
    baseClass: 'nb_autocomplete',
    isSortHints: true,
    inputFieldProps: { required: '' },
    minFieldWidth: undefined,
    showHintsAfterSelect: false,
    isWithMatchMark: true
  }

  const input = document.querySelector<HTMLInputElement>('#input')
  new Autocomplete(input!, config, true)


  // autocomplete.onSelect((value) => {
  //   console.log(value)
  // })
}

initDemoAutocomplete()