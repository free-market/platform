import type { IconProps } from '@freemarket/step-sdk'
import * as React from 'react'
import type { SVGProps } from 'react'
const ChainBranchIcon = (props: SVGProps<SVGSVGElement> & IconProps) => {
  const { fill, stroke, color } = props
  const { dark, ...rest } = props
  const f = fill || color || 'currentColor'
  const s = stroke || color || 'currentColor'
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlSpace="preserve"
      width="24px"
      height="24px"
      viewBox="0 0 31.891 31.891"
      {...rest}
      style={{ fill: f, stroke: s }}
    >
      <path d="m30.543 5.74-4.078-4.035c-1.805-1.777-4.736-1.789-6.545-.02l-4.525 4.414a4.486 4.486 0 0 0-.02 6.424l2.586-2.484c-.262-.791.061-1.697.701-2.324l2.879-2.807a2.346 2.346 0 0 1 3.275.01l2.449 2.42c.9.891.896 2.326-.01 3.213l-2.879 2.809c-.609.594-1.609.92-2.385.711l-2.533 2.486a4.688 4.688 0 0 0 6.545.02l4.52-4.41a4.482 4.482 0 0 0 .02-6.427zM13.975 21.894c.215.773-.129 1.773-.752 2.381l-2.689 2.627c-.922.9-2.414.895-3.332-.012l-2.498-2.461a2.29 2.29 0 0 1 .012-3.275l2.691-2.627c.656-.637 1.598-.961 2.42-.689l2.594-2.57c-1.836-1.811-4.824-1.82-6.668-.02l-4.363 4.26a4.574 4.574 0 0 0-.02 6.549l4.154 4.107c1.834 1.809 4.82 1.818 6.668.018l4.363-4.26a4.576 4.576 0 0 0 .02-6.547l-2.6 2.519z" />
      <path d="M11.139 20.722a1.581 1.581 0 0 0 2.234.008l7.455-7.416a1.576 1.576 0 0 0 .008-2.234 1.58 1.58 0 0 0-2.23-.006l-7.457 7.414a1.58 1.58 0 0 0-.01 2.234z" />
    </svg>
  )
}
export default ChainBranchIcon
