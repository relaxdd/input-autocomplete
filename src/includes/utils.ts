import DomUtils from "../class/DomUtils";

export function round(n: number, q = 1) {
  return Math.round(n * (10 ** q)) / (10 ** q)
}

export function trim(str: string, char: string) {
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

export function getHeightForced(el: HTMLElement) {
  const clone = el.cloneNode(true) as HTMLElement
  const width = el.getBoundingClientRect().width
  clone.style.cssText = 'position:fixed;top:0;left:0;overflow:auto;visibility:hidden;' +
    'pointer-events:none;height:unset;max-height:unset;width:' + width + 'px'
  document.body.append(clone)
  const height = clone.getBoundingClientRect().height
  clone.remove()
  return height
}

export function getTextWidth(str: string, css?: Record<string, string>) {
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

export function getOffsetBottom(el: HTMLElement) {
  const { top, height } = el.getBoundingClientRect()
  return window.innerHeight - (top + height)
}