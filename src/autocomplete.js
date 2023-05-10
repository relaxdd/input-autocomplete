"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function round(n, q = 1) {
    return Math.round(n * (Math.pow(10, q))) / (Math.pow(10, q));
}
function trim(str, char) {
    let whitespace = [
        ' ', '\n', '\r', '\t', '\f', '\x0b', '\xa0', '\u2000', '\u2001', '\u2002', '\u2003', '\u2004',
        '\u2005', '\u2006', '\u2007', '\u2008', '\u2009', '\u200a', '\u200b', '\u2028', '\u2029', '\u3000',
    ].join('');
    let l = 0;
    let i = 0;
    str += '';
    if (char) {
        whitespace = (char + '').replace(/([[\]().?/*{}+$^:])/g, '$1');
    }
    l = str.length;
    for (i = 0; i < l; i++) {
        if (whitespace.indexOf(str.charAt(i)) === -1) {
            str = str.substring(i);
            break;
        }
    }
    l = str.length;
    for (i = l - 1; i >= 0; i--) {
        if (whitespace.indexOf(str.charAt(i)) === -1) {
            str = str.substring(0, i + 1);
            break;
        }
    }
    return whitespace.indexOf(str.charAt(0)) === -1 ? str : '';
}
function getHeightForced(el) {
    const clone = el.cloneNode(true);
    const width = el.getBoundingClientRect().width;
    clone.style.cssText = 'position:fixed;top:0;left:0;overflow:auto;visibility:hidden;' +
        'pointer-events:none;height:unset;max-height:unset;width:' + width + 'px';
    document.body.append(clone);
    const height = clone.getBoundingClientRect().height;
    clone.remove();
    return height;
}
function getTextWidth(str) {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;top:0;left:0;overflow:auto;visibility:hidden;' +
        'pointer-events:none;height:unset;max-height:unset;width:unset;max-width:unset;white-space: nowrap;';
    div.innerText = str;
    document.body.append(div);
    const { width } = div.getBoundingClientRect();
    div.remove();
    return width !== null && width !== void 0 ? width : 0;
}
class DomUtils {
    static css(el, list) {
        for (const k in list) {
            el.style.setProperty(DomUtils.format(k), list[k]);
        }
    }
    static height(el) {
        return round((el === null || el === void 0 ? void 0 : el.getBoundingClientRect().height) || 0);
    }
    static style(el, names) {
        return names.map(it => {
            const name = DomUtils.format(it);
            return window.getComputedStyle(el).getPropertyValue(name);
        });
    }
    static format(str) {
        const f = (m) => '-' + m.toLowerCase();
        return trim(str.replace(/[A-Z]/g, f), '-');
    }
}
class Autocomplete {
    constructor(input, attrs, initialize = false) {
        var _a;
        this.events = { select: [] };
        this.activeHint = { index: -1, value: '' };
        this.isSelected = false;
        this.isInitialized = false;
        this.isMoving = false;
        this.defaultOptions = {
            suggestions: [],
            limit: 30,
            baseClass: 'nb_autocomplete',
            selectFirstOnBlur: false,
            useHelperText: true,
            qtyDisplayHints: 10,
            isAdaptiveField: false,
            onSelect: undefined,
        };
        this.attrs = this.mergeOptions(attrs);
        this.options = this.sortOptions(this.attrs.suggestions);
        this.classes = {
            wrapper: this.attrs.baseClass,
            field: this.attrs.baseClass + '__field',
            hints: this.attrs.baseClass + '__hints',
            float: this.attrs.baseClass + '__float',
        };
        this.input = input;
        this.props = { placeholder: (input === null || input === void 0 ? void 0 : input.placeholder) || '' };
        this.hints = this.renderHints();
        this.helper = this.renderHelper();
        if ((_a = this.attrs) === null || _a === void 0 ? void 0 : _a.onSelect)
            this.events.select.push(this.attrs.onSelect);
        if (initialize)
            this.init();
    }
    init() {
        if (this.isInitialized)
            throw new Error('Невозможно повторно инициализировать плагин!');
        this.doRender();
        this.doEvents();
        if (this.attrs.isAdaptiveField)
            this.setAdaptiveWidth();
        this.isInitialized = true;
    }
    onSelect(callback) {
        this.events.select.push(callback);
    }
    updateSuggestions(suggestions) {
        this.options.splice(0);
        this.options.push(...this.sortOptions(suggestions));
        this.updateHints(false);
    }
    setAdaptiveWidth(text) {
        const value = text || this.input.value || this.input.placeholder;
        const width = getTextWidth(value) + 4;
        const padding = DomUtils.style(this.input, ['paddingLeft', 'paddingRight']);
        const vertical = padding.map(it => parseFloat(it)).reduce((n, it) => n + it, 0);
        const total = width + vertical;
        DomUtils.css(this.input, { maxWidth: `${round(total)}px` });
    }
    doRender() {
        const parent = this.input.parentElement;
        const wrapper = document.createElement('div');
        this.input.classList.add(this.classes.field);
        wrapper.classList.add(this.classes.wrapper);
        wrapper.append(this.input);
        parent.append(wrapper);
        this.input.after(this.hints);
        const border = 2;
        const qtyHints = this.attrs.qtyDisplayHints;
        const hintHeight = getHeightForced(this.hints) - border;
        const itemHeight = round(hintHeight / 24);
        const visibleHeight = (itemHeight * qtyHints) + border;
        DomUtils.css(this.hints, { maxHeight: `${visibleHeight}px` });
        if (this.attrs.useHelperText)
            wrapper.append(this.helper);
    }
    doEvents() {
        this.input.addEventListener('focus', this.onFieldFocus.bind(this));
        this.input.addEventListener('blur', this.onFieldBlur.bind(this));
        this.input.addEventListener('input', this.onFieldInput.bind(this));
        this.input.addEventListener('keydown', this.onFieldPress.bind(this));
        this.hints.addEventListener('click', this.onHintClick.bind(this));
        this.hints.addEventListener('mouseover', this.onHintOver.bind(this));
        this.hints.addEventListener('mousemove', this.onHintMove.bind(this));
        document.addEventListener('click', this.onGlobalClick.bind(this));
    }
    renderHints() {
        const hints = document.createElement('ul');
        hints.classList.add(this.classes.hints);
        DomUtils.css(hints, { display: 'none' });
        hints.append(...this.buildHints());
        return hints;
    }
    renderHelper() {
        const div = document.createElement('div');
        const span1 = document.createElement('span');
        const span2 = document.createElement('span');
        div.classList.add(this.classes.float);
        DomUtils.css(div, { display: 'none' });
        div.append(span1, span2);
        return div;
    }
    updateHints(show = true) {
        const list = this.filterHintItems();
        const out = this.buildHints(list);
        this.hints.innerHTML = '';
        this.hints.append(...out);
        if (show)
            this.setHintsVisible(out.length !== 0);
    }
    buildHints(options) {
        options = options || this.options;
        const slice = this.attrs.limit !== -1
            ? options.slice(0, this.attrs.limit)
            : options;
        const renderItem = (it, i) => {
            const li = document.createElement('li');
            li.innerText = it.label;
            li.setAttribute('data-index', String(i));
            li.setAttribute('data-value', it.value);
            return li;
        };
        return slice.map(renderItem);
    }
    toShowHintsBox() {
        if (this.getCountHints() > 0 && !this.isSelected)
            this.setHintsVisible(true);
    }
    selectHintValue(i = 0) {
        i = i === -1 ? 0 : i;
        const label = this.getHintData(i, 'label');
        const value = this.getHintData(i, 'value');
        if (!label || !value)
            return;
        this.input.value = label;
        this.toHideHintsBox();
        this.updateHints(false);
        this.input.blur();
        this.isSelected = true;
        this.events.select.forEach((callback) => {
            callback(value);
        });
    }
    showHelperText(i) {
        var _a;
        const qty = this.input.value.length;
        const text = ((_a = this.getHintItem(i)) === null || _a === void 0 ? void 0 : _a.innerText) || '';
        const parts = this.helper.querySelectorAll('span');
        parts[0].innerText = text.slice(0, qty);
        parts[1].innerText = text.slice(qty);
        DomUtils.css(this.helper, { display: 'block' });
    }
    hideHelperText() {
        this.helper.querySelectorAll('span').forEach((it) => {
            it.innerText = '';
        });
        DomUtils.css(this.helper, { display: 'none' });
    }
    moveByHintItems(isDown) {
        var _a;
        const list = this.getHintItems();
        const count = list.length;
        const next = this.activeHint.index === -1
            ? isDown ? 0 : count - 1
            : this.activeHint.index + (isDown ? 1 : -1);
        const safe = (() => {
            if (next >= count)
                return 0;
            else if (next < 0)
                return count - 1;
            else
                return next;
        })();
        const activeText = (_a = list === null || list === void 0 ? void 0 : list[safe]) === null || _a === void 0 ? void 0 : _a.innerText;
        this.setActiveHint(safe);
        this.setPlaceholder(activeText || null);
        if (this.input.value)
            this.showHelperText(safe);
        if (count <= this.attrs.qtyDisplayHints)
            return;
        const hintHeight = DomUtils.height(this.hints) - 2;
        const itemHeight = DomUtils.height(this.getHintItem(0));
        const progress = round(itemHeight * safe);
        const scroll = this.hints.scrollTop;
        const after = scroll + hintHeight - itemHeight;
        const isVisible = progress >= scroll && progress < after;
        if (isVisible)
            return;
        this.isMoving = true;
        if (!isDown)
            this.hints.scrollTo(0, safe * itemHeight);
        else {
            const scroll = (safe + 1) - this.attrs.qtyDisplayHints;
            this.hints.scrollTo(0, scroll * itemHeight);
        }
    }
    setActiveHint(index = -1) {
        var _a, _b;
        const item = this.getHintItem(index);
        const value = (_b = (_a = item === null || item === void 0 ? void 0 : item.dataset) === null || _a === void 0 ? void 0 : _a['value']) !== null && _b !== void 0 ? _b : '';
        this.getHintItems().forEach((it) => {
            it.classList.remove('active');
        });
        this.activeHint = { index, value };
        item === null || item === void 0 ? void 0 : item.classList.add('active');
    }
    toHideHintsBox() {
        this.setHintsVisible(false);
        this.setActiveHint(-1);
        this.setPlaceholder(null);
        this.hideHelperText();
        if (this.attrs.isAdaptiveField)
            this.setAdaptiveWidth();
    }
    selectFirstHint() {
        if (!this.attrs.selectFirstOnBlur
            || this.getCountHints() > 1)
            return;
        this.input.value = this.getHintData(0, 'label');
        this.isSelected = true;
    }
    onFieldFocus() {
        this.toShowHintsBox();
    }
    onFieldBlur() {
        this.selectFirstHint();
        setTimeout(() => {
            this.toHideHintsBox();
        }, 150);
    }
    onFieldPress(e) {
        const usingKeys = ['ArrowRight', 'Enter', 'ArrowDown', 'ArrowUp', 'Escape', 'Space'];
        if (!usingKeys.includes(e.code))
            return;
        if (this.isSelected)
            return;
        switch (e.code) {
            case 'ArrowRight':
                const { selectionStart, value } = this.input;
                if (selectionStart !== value.length)
                    break;
            case 'Enter':
                const index = this.activeHint.index;
                this.selectHintValue(index);
                break;
            case 'ArrowDown':
            case 'ArrowUp':
                e.preventDefault();
                const isDown = e.code === 'ArrowDown';
                this.moveByHintItems(isDown);
                break;
            case 'Escape':
                this.toHideHintsBox();
                break;
            case 'Space':
                if (!e.ctrlKey)
                    return;
                this.toShowHintsBox();
                break;
        }
    }
    onFieldInput() {
        this.updateHints();
        this.hideHelperText();
        this.isSelected = false;
        this.activeHint = { index: -1, value: '' };
    }
    onHintClick(e) {
        if (e.target === this.hints)
            return;
        const index = this.getHintIndex(e.target);
        this.selectHintValue(index);
    }
    onHintOver(e) {
        if (this.hints === e.target || this.isMoving)
            return;
        const li = e.target;
        const index = this.getHintIndex(li);
        this.setActiveHint(index);
        this.setPlaceholder(li.innerText || this.props.placeholder);
    }
    onHintMove() {
        if (!this.isMoving)
            return;
        this.isMoving = false;
    }
    onGlobalClick(e) {
        e.stopPropagation();
        const isHints = e.composedPath().includes(this.hints);
        const isInput = e.target === this.input;
        if (isHints || isInput)
            return;
        this.selectFirstHint();
        this.toHideHintsBox();
    }
    getHintItems() {
        return [...this.hints.querySelectorAll('li')];
    }
    getHintItem(index) {
        var _a;
        return (_a = this.getHintItems()) === null || _a === void 0 ? void 0 : _a[index];
    }
    getCountHints() {
        return this.getHintItems().length;
    }
    setHintsVisible(s) {
        DomUtils.css(this.hints, { display: s ? 'block' : 'none' });
        this.hints.scrollTo(0, 0);
    }
    setPlaceholder(text) {
        const k = 'placeholder';
        this.input.setAttribute(k, text || this.props[k]);
    }
    getHintIndex(el) {
        var _a, _b;
        return +((_b = (_a = el === null || el === void 0 ? void 0 : el.dataset) === null || _a === void 0 ? void 0 : _a['index']) !== null && _b !== void 0 ? _b : -1);
    }
    getHintData(index, key) {
        var _a, _b, _c;
        const el = this.getHintItem(index);
        switch (key) {
            case 'label':
                return (_a = el === null || el === void 0 ? void 0 : el.innerText) !== null && _a !== void 0 ? _a : '';
            case 'value':
                return (_c = (_b = el === null || el === void 0 ? void 0 : el.dataset) === null || _b === void 0 ? void 0 : _b[key]) !== null && _c !== void 0 ? _c : '';
        }
    }
    randomId() {
        Math.floor(Math.random() * Date.now()).toString(36);
    }
    filterHintItems() {
        const value = this.input.value.toLowerCase();
        return this.options.filter((it) => {
            return it.label.toLowerCase().startsWith(value);
        });
    }
    mergeOptions(options) {
        if (!options || !Object.keys(options).length)
            return this.defaultOptions;
        function merge(obj, def) {
            return Object.keys(def).reduce((acc, k) => {
                acc[k] = k in obj ? obj[k] : def[k];
                return acc;
            }, {});
        }
        return merge(options, this.defaultOptions);
    }
    sortOptions(list) {
        const oneView = (it) => {
            return typeof it === 'object' ? it : { value: it, label: it };
        };
        const uniqList = (acc, it) => {
            if (!acc.find(n => n.label === it.label))
                acc.push(it);
            return acc;
        };
        const data = list.map(oneView).reduce(uniqList, []);
        return data.sort((a, b) => a.label.localeCompare(b.label));
    }
}
function initDemoAutocomplete() {
    const data = [
        'Москва', 'Санкт-Петербург', 'Астана', 'Новосибирск', 'Екатеринбург', 'Казань', 'Мурманск', 'Нижний Новгород',
        'Ижевск', 'Красноярск', 'Челябинск', 'Чебоксары', 'Набережные Челны', 'Омск', 'Иркутск', 'Самара', 'Тюмень',
        'Уфа', 'Ульяновск', 'Владимир', 'Суздаль', 'Алматы', 'Киров', 'Вологда', 'Барнаул', 'Урюпинск',
    ];
    const config = {
        suggestions: data,
        useHelperText: false,
        isAdaptiveField: true,
        qtyDisplayHints: 8,
        selectFirstOnBlur: true,
        limit: 30,
        baseClass: 'nb_autocomplete',
        onSelect: (value) => {
            console.log(value);
        },
    };
    const input = document.querySelector('#input');
    const complete = new Autocomplete(input, config);
    complete.init();
}
initDemoAutocomplete();
