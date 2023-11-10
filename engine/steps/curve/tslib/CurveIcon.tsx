import * as React from 'react'

export default function CurveIcon() {
  return (
    <img
      src="data:image/png;base64,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"
      alt=""
    />
  )
}
