import { ArrowRightIcon } from '@heroicons/react/20/solid'
import cx from 'classnames'
import { motion } from 'framer-motion'

export const CrossChainJobCard = (props: {
  status?: 'completed' | 'sending'
  transactionView?: 'tall' | 'compact' | 'compact-cols'
  spinnerLocation?: 'status' | 'transaction'
  pulseBehavior?: 'gradient' | 'pulse'
}): JSX.Element => {
  const {
    status = 'completed',
    transactionView = 'compact',
    spinnerLocation = 'transaction',
    pulseBehavior = 'pulse',
  } = props

  return (
    <>
      <div className="bg-stone-600 rounded-xl shadow-md text-stone-200 font-medium p-2 max-w-xs mx-auto space-y-2 overflow-hidden">
        <div className="text-lg leading-none">Cross-chain bridge</div>

        <div className="flex items-stretch gap-2">
          <div className="basis-1/2 space-y-2 flex flex-col">
            <div className="text-xs font-light leading-none">STATUS</div>

            <div className="grow flex items-end h-3 leading-none">
              {status === 'completed' ? (
                status
              ) : (
                <>
                  {spinnerLocation === 'status' && (
                    <div className="inline-flex items-center">
                      <svg
                        className="inline m-1 mr-2 w-3 h-3 text-transparent animate-spin fill-stone-200"
                        viewBox="0 0 100 101"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                          fill="currentColor"
                        />
                        <path
                          d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                          fill="currentFill"
                        />
                      </svg>
                      <span className="sr-only">Loading...</span>
                    </div>
                  )}
                  <div>sending...</div>
                </>
              )}
            </div>
          </div>

          <div className="basis-1/2 space-y-2">
            <div className="text-xs font-light leading-none">TRANSACTION</div>
            <div className="flex flex-col justify-end gap-1">
              {transactionView === 'tall' && (
                <div className="flex items-stretch gap-2">
                  <div className="">
                    <div className="rounded bg-stone-500 flex flex-col items-center gap-1 justify-center p-2">
                      <div className="text-stone-300">1/2</div>
                      <div className="relative rounded-full w-10 h-10 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full bg-stone-400 z-10" />

                        <div>
                          <div className="w-8 h-8 relative z-20">
                            <motion.img
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1, transition: { delay: 1 } }}
                              className="w-full h-full"
                              src="https://app.aave.com/icons/networks/ethereum.svg"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="inline-flex items-center">
                    <div className="text-stone-400 leading-none text-3xl">
                      <ArrowRightIcon className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="">
                    <div className="flex flex-col items-center gap-1 justify-center p-2">
                      <div className="text-stone-400">2/2</div>
                      <div className="relative rounded-full w-10 h-10 flex items-center justify-center">
                        <div>
                          <div className="w-8 h-8 relative z-20">
                            <motion.img
                              initial={{ opacity: 0 }}
                              animate={{
                                opacity: 1,
                                transition: { delay: 1.3 },
                              }}
                              className="w-full h-full"
                              src="https://app.aave.com/icons/networks/avalanche.svg"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(transactionView === 'compact' ||
                transactionView === 'compact-cols') && (
                <>
                  <div
                    className={cx(
                      'flex',
                      transactionView === 'compact-cols'
                        ? 'gap-2'
                        : 'flex-col gap-1',
                    )}
                  >
                    <div
                      className="rounded bg-[#E84142] w-[calc(100%-2rem)] h-4 flex justify-between relative overflow-hidden border border-stone-600 hover:border-stone-300"
                      style={{}}
                    >
                      {spinnerLocation === 'transaction' && (
                        <div className="inline-flex items-center relative z-30">
                          <svg
                            className="inline mx-1 w-3 h-3 text-transparent animate-spin fill-stone-600"
                            viewBox="0 0 100 101"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                              fill="currentColor"
                            />
                            <path
                              d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                              fill="currentFill"
                            />
                          </svg>
                          <span className="sr-only">Loading...</span>
                        </div>
                      )}

                      <div className="">
                        <div className="h-4 mx-4 overflow-hidden">
                          <div className="w-8 h-8 relative -translate-y-2">
                            <motion.img
                              initial={{ opacity: 0 }}
                              animate={{
                                opacity: 1,
                                transition: { delay: 1.3 },
                              }}
                              className="w-full h-full"
                              src="https://app.aave.com/icons/networks/avalanche.svg"
                            />
                          </div>
                        </div>
                      </div>

                      {pulseBehavior === 'gradient' && (
                        <motion.div
                          className="absolute -inset-4 rounded z-20 opacity-75"
                          initial={
                            { '--rotate': '0deg' } as Record<string, unknown>
                          }
                          animate={{
                            ['--rotate' as string]: '359deg',
                            transition: {
                              repeat: Infinity,
                              repeatType: 'loop',
                              duration: 3,
                            },
                          }}
                          style={{
                            backgroundImage:
                              'linear-gradient(var(--rotate), #5ddcff99, #3c67e399 43%, #4e00c299)',
                            backgroundPosition: '0 -10px',
                          }}
                        ></motion.div>
                      )}

                      {pulseBehavior === 'pulse' && (
                        <motion.div
                          initial={{
                            opacity: 0.1,
                          }}
                          animate={{
                            opacity: 1,
                            transition: {
                              repeat: Infinity,
                              repeatType: 'reverse',
                              duration: 1,
                            },
                          }}
                          className="absolute -inset-4 rounded z-20 bg-stone-200/50"
                        ></motion.div>
                      )}
                    </div>

                    <div className="rounded bg-[#627eea] w-[calc(100%-2rem)] h-4 flex justify-between relative overflow-hidden border border-stone-600 hover:border-stone-300">
                      <div />

                      <div className="">
                        <div className="h-4 mx-4 overflow-hidden">
                          <div className="w-8 h-8 relative -translate-y-2">
                            <motion.img
                              initial={{ opacity: 0 }}
                              animate={{
                                opacity: 1,
                                transition: { delay: 1.3 },
                              }}
                              className="w-full h-full"
                              src="https://app.aave.com/icons/networks/ethereum.svg"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
