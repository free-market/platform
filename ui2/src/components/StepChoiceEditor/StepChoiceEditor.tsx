import { useCore } from '@component/CoreProvider'
import cx from 'classnames'
import StepChoiceEditorCard from '@component/StepChoiceEditorCard'
import { ChevronLeftIcon } from '@heroicons/react/20/solid'
import { motion } from 'framer-motion'

const variantsNoTransform = {
  visible: { y: 0, opacity: 1 },
  hidden: { y: 0, opacity: 0 },
}

export const StepChoiceEditor = (props: {
  stepChoiceEditorCard?: React.ReactNode
  stepChoiceBreadCrumbs?: React.ReactNode
  fadeIn?: 'instant' | 'slow'
  invisible?: boolean
  layoutId?: string
}): JSX.Element => {
  const core = useCore()

  const {
    stepChoiceEditorCard = <StepChoiceEditorCard />,

    stepChoiceBreadCrumbs = (
      <div className="flex items-center text-sm text-zinc-500/75 pt-2 group-hover:text-zinc-500 cursor-pointer">
        <ChevronLeftIcon className="w-5 h-5 mx-2" />
        <div>Curve</div>
        <ChevronLeftIcon className="w-5 h-5 mx-2" />
        <div>Swap</div>
      </div>
    ),
    fadeIn = 'slow',
    invisible = false,
    layoutId = `${core.selectedActionGroup?.name}:${
      !core.selectedStepChoice?.recentlyClosed && core.selectedStepChoice?.index
    }:secondary=false`,
  } = props

  // TODO: use memoized callbacks: https://beta.reactjs.org/apis/react/useCallback
  const deselect = () => {
    if (core.selectedStepChoice == null) {
      core.selectActionGroup(null)
    } else {
      core.selectStepChoice(null)
    }
  }

  const stepChoiceShadow = (
    <motion.div
      transition={{ duration: fadeIn === 'instant' ? 0 : undefined }}
      className="bg-zinc-800/75 absolute top-0 right-0 left-0 bottom-0 z-20 p-2 group cursor-pointer"
      onClick={deselect}
      variants={variantsNoTransform}
      initial="hidden"
      animate="visible"
      exit="hidden"
    >
      {stepChoiceBreadCrumbs}
    </motion.div>
  )

  return (
    <motion.div className={cx('absolute top-0 right-0 left-0 bottom-0 z-20 !m-0', { invisible })}>
      {stepChoiceShadow}
      <div className="absolute top-0 right-0 left-0 bottom-0 flex items-center justify-center">
        <motion.div layoutId={layoutId} className="flex items-center flex-col content-end space-y-5 z-30">
          {stepChoiceEditorCard}
        </motion.div>
      </div>
    </motion.div>
  )
}
