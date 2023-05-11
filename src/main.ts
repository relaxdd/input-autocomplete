import { CompleteAttrs } from "./types";
import Autocomplete from "./autocomplete";

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
    isAdaptiveField: false,
    qtyDisplayHints: 8,
    selectFirstOnBlur: true,
    limit: 30,
    baseClass: 'nb_autocomplete',
    onSelect: (value) => {
      console.log(value)
    },
  }

  const input = document.querySelector<HTMLInputElement>('#input')
  new Autocomplete(input!, config, true)

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