import {
  initialState,
  useViewModel,
} from '@component/CrossChainDepositLayout/useViewModel'
import { ComponentStory, ComponentMeta } from '@storybook/react'
import { useAnimationControls } from 'framer-motion'
import { useRef } from 'react'

import { GenericExpandingSelector as Component } from './GenericExpandingSelector'

export default {
  title: 'Example/GenericExpandingSelector',
  component: Component,
} as ComponentMeta<typeof Component>

export const GenericExpandingSelector: ComponentStory<
  typeof Component
> = () => {
  const vm = useViewModel(initialState)
  const { formEditingMode, tokenSearchValue, dispatch } = vm
  const chainSelectorButtonControls = useAnimationControls()
  const tokenSelectorButtonControls = useAnimationControls()

  const chainSelectorRef = useRef<HTMLButtonElement>(null)
  const tokenSelectorRef = useRef<HTMLButtonElement>(null)
  const tokenSearchRef = useRef<HTMLInputElement>(null)
  const chainSelectorContainerRef = useRef<HTMLDivElement>(null)
  const chainSearchRef = useRef<HTMLInputElement>(null)
  const chainSelectorResultsContainerRef = useRef<HTMLDivElement>(null)

  return (
    <Component
      {...{ formEditingMode, tokenSearchValue, dispatch }}
      refs={{
        clickableArea: chainSelectorRef,
        nextClickableArea: tokenSelectorRef,
        container: chainSelectorContainerRef,
        input: chainSearchRef,
        resultsContainer: chainSelectorResultsContainerRef,
      }}
      controls={{
        selector: chainSelectorButtonControls,
      }}
      nextSelector={{
        refs: {
          clickableArea: tokenSelectorRef,
          input: tokenSearchRef,
        },
        controls: tokenSelectorButtonControls,
      }}
    />
  )
}

GenericExpandingSelector.args = {}
