import { Workflow } from './types'
import { BigNumber } from 'ethers'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function stringifyBigNumber(key: any, value: any): string {
  if (value instanceof BigNumber) {
    return value.toString()
  }
  return value
}

function indent(n: number) {
  let rv = ''
  for (let i = 0; i < n; ++i) {
    rv += ' '
  }
  return rv
}

// <blockquote>
//   <details>
//     <summary>Hello</summary>
//     <blockquote>
//       <details>
//         <summary>World</summary>
//         <blockquote>:smile:</blockquote>
//       </details>
//     </blockquote>
//   </details>
// </blockquote>

export function toHtml(element: any, label: string, i = 0) {
  if (element === null || null === undefined) {
    console.log('wtf')
  }
  const hasChildren = typeof element !== 'string' && Object.keys(element).length > 0
  let html = indent(i) + '<blockquote>\n'
  i += 2
  if (hasChildren) {
    html += indent(i) + '<details>\n'
    i += 2
    html += indent(i) + '<summary>\n'
    i += 2
  }
  html += indent(i) + label
  if (!hasChildren) {
    html += ': ' + element.toString()
  }
  html += '\n'
  i -= 2
  if (hasChildren) {
    html += indent(i) + '</summary>\n'
    i -= 2

    for (const key in element) {
      const obj = element[key]
      html += toHtml(obj, key, i + 2)
    }

    html += indent(i) + '</details>\n'
    i -= 2
  }
  html += indent(i) + '</blockquote>\n'
  i -= 2

  return html
}

// const obj = {
//   a: ['a', 'b', 'cc'],
//   // b: {
//   //   c: 2,
//   // },
// }

// const x = toHtml(obj, 'root', 0)
// console.log(x)