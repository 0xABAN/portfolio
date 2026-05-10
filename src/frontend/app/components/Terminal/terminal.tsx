"use client"

import {
  Children,
  createContext,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type RefAttributes,
} from "react"
import {
  m as motion,
  useInView,
  type DOMMotionComponents,
  type HTMLMotionProps,
  type MotionProps,
} from "motion/react"

import { cn } from "@/lib/utils"

const IN_VIEW_OPTIONS = { amount: 0.3 } as const

interface SequenceContextValue {
  completeItem: (index: number) => void
  activeIndex: number
  sequenceStarted: boolean
  loopCount: number
}

const SequenceContext = createContext<SequenceContextValue | null>(null)

const useSequence = () => use(SequenceContext)

const ItemIndexContext = createContext<number | null>(null)
const useItemIndex = () => use(ItemIndexContext)

const motionElements = {
  article: motion.article,
  div: motion.div,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  h4: motion.h4,
  h5: motion.h5,
  h6: motion.h6,
  li: motion.li,
  p: motion.p,
  section: motion.section,
  span: motion.span,
} as const

type MotionElementType = Extract<
  keyof DOMMotionComponents,
  keyof typeof motionElements
>
type TerminalTypingMotionComponent = ComponentType<
  Omit<HTMLMotionProps<"span">, "ref"> & RefAttributes<HTMLElement>
>

interface AnimatedSpanProps extends MotionProps {
  children: React.ReactNode
  delay?: number
  className?: string
  startOnView?: boolean
}

export const AnimatedSpan = ({
  children,
  delay = 0,
  className,
  startOnView = false,
  ...props
}: AnimatedSpanProps) => {
  const elementRef = useRef<HTMLDivElement | null>(null)
  const isInView = useInView(elementRef as React.RefObject<Element>, IN_VIEW_OPTIONS)

  const sequence = useSequence()
  const itemIndex = useItemIndex()
  const [hasStarted, setHasStarted] = useState(false)
  const loopCount = sequence?.loopCount ?? 0
  useEffect(() => { setHasStarted(false) }, [loopCount])
  useEffect(() => {
    if (!sequence || itemIndex === null) return
    if (!sequence.sequenceStarted) return
    if (hasStarted) return
    if (sequence.activeIndex === itemIndex) {
      setHasStarted(true)
    }
  }, [sequence, hasStarted, itemIndex])

  const shouldAnimate = sequence ? hasStarted : startOnView ? isInView : true

  return (
    <motion.div
      ref={elementRef}
      initial={{ opacity: 0, y: -5 }}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 0, y: -5 }}
      transition={{ duration: 0.3, delay: sequence ? 0 : delay / 1000 }}
      className={cn("grid text-sm font-normal tracking-tight", className)}
      onAnimationComplete={() => {
        if (!sequence) return
        if (itemIndex === null) return
        sequence.completeItem(itemIndex)
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface TypingAnimationProps extends Omit<MotionProps, "children"> {
  children: string
  className?: string
  duration?: number
  delay?: number
  as?: MotionElementType
  startOnView?: boolean
}

export const TypingAnimation = ({
  children,
  className,
  duration = 60,
  delay = 0,
  as: Component = "span",
  startOnView = true,
  ...props
}: TypingAnimationProps) => {
  if (typeof children !== "string") {
    throw new Error("TypingAnimation: children must be a string. Received:")
  }

  const MotionComponent = motionElements[
    Component
  ] as TerminalTypingMotionComponent

  const [displayedText, setDisplayedText] = useState<string>("")
  const [started, setStarted] = useState(false)
  const elementRef = useRef<HTMLElement | null>(null)
  const isInView = useInView(elementRef as React.RefObject<Element>, IN_VIEW_OPTIONS)

  const sequence = useSequence()
  const itemIndex = useItemIndex()
  const hasSequence = sequence !== null
  const sequenceStarted = sequence?.sequenceStarted ?? false
  const sequenceActiveIndex = sequence?.activeIndex ?? null
  const loopCount = sequence?.loopCount ?? 0
  useEffect(() => { setStarted(false); setDisplayedText("") }, [loopCount])
  const sequenceCompleteItemRef = useRef<
    SequenceContextValue["completeItem"] | null
  >(null)
  const sequenceItemIndexRef = useRef<number | null>(null)

  useEffect(() => {
    sequenceCompleteItemRef.current = sequence?.completeItem ?? null
    sequenceItemIndexRef.current = itemIndex
  }, [sequence?.completeItem, itemIndex])

  useEffect(() => {
    let startTimeout: ReturnType<typeof setTimeout> | null = null

    if (hasSequence && itemIndex !== null) {
      if (sequenceStarted && !started && sequenceActiveIndex === itemIndex) {
        setStarted(true)
      }
    } else if (!startOnView || isInView) {
      startTimeout = setTimeout(() => setStarted(true), delay)
    }

    return () => {
      if (startTimeout !== null) {
        clearTimeout(startTimeout)
      }
    }
  }, [
    delay,
    startOnView,
    isInView,
    started,
    hasSequence,
    sequenceActiveIndex,
    sequenceStarted,
    itemIndex,
  ])

  useEffect(() => {
    let typingEffect: ReturnType<typeof setInterval> | null = null

    if (started) {
      let i = 0
      typingEffect = setInterval(() => {
        if (i < children.length) {
          setDisplayedText(children.substring(0, i + 1))
          i++
        } else {
          if (typingEffect !== null) {
            clearInterval(typingEffect)
          }
          const completeItem = sequenceCompleteItemRef.current
          const currentItemIndex = sequenceItemIndexRef.current
          if (completeItem && currentItemIndex !== null) {
            completeItem(currentItemIndex)
          }
        }
      }, duration)
    }

    return () => {
      if (typingEffect !== null) {
        clearInterval(typingEffect)
      }
    }
  }, [children, duration, started])

  return (
    <MotionComponent
      ref={elementRef}
      className={cn("text-sm font-normal tracking-tight", className)}
      {...props}
    >
      {displayedText}
    </MotionComponent>
  )
}

interface TerminalProps {
  children: React.ReactNode
  className?: string
  sequence?: boolean
  startOnView?: boolean
  loop?: boolean
  loopDelay?: number
}

export const Terminal = ({
  children,
  className,
  sequence = true,
  startOnView = true,
  loop = false,
  loopDelay = 1500,
}: TerminalProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isInView = useInView(containerRef as React.RefObject<Element>, IN_VIEW_OPTIONS)

  const [activeIndex, setActiveIndex] = useState(0)
  const [loopCount, setLoopCount] = useState(0)
  const sequenceHasStarted = sequence ? !startOnView || isInView : false
  const loopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (loopTimeoutRef.current !== null) clearTimeout(loopTimeoutRef.current)
  }, [])

  useEffect(() => {
    if (!isInView && loopTimeoutRef.current !== null) {
      clearTimeout(loopTimeoutRef.current)
      loopTimeoutRef.current = null
    }
  }, [isInView])

  const childrenArray = useMemo(() => Children.toArray(children), [children])
  const childCount = childrenArray.length

  const contextValue = useMemo<SequenceContextValue | null>(() => {
    if (!sequence) return null
    return {
      completeItem: (index: number) => {
        if (index !== activeIndex) return
        const next = activeIndex + 1
        setActiveIndex(next)
        if (loop && next >= childCount) {
          loopTimeoutRef.current = setTimeout(() => {
            setActiveIndex(0)
            setLoopCount((c) => c + 1)
          }, loopDelay)
        }
      },
      activeIndex,
      sequenceStarted: sequenceHasStarted,
      loopCount,
    }
  }, [sequence, activeIndex, sequenceHasStarted, loop, loopDelay, childCount, loopCount])

  const wrappedChildren = useMemo(() => {
    if (!sequence) return children
    return childrenArray.map((child, index) => (
      <ItemIndexContext.Provider key={`item-${index}`} value={index}>
        {child as React.ReactNode}
      </ItemIndexContext.Provider>
    ))
  }, [childrenArray, sequence, children])

  const content = (
    <div
      ref={containerRef}
      className={cn(
        "border-border bg-background z-0 h-full max-h-100 w-full max-w-lg rounded-xl border",
        className
      )}
    >
      <div className="border-border flex flex-col gap-y-2 border-b p-4">
        <div className="flex flex-row gap-x-2">
          <div className="size-2 rounded-full bg-red-500"></div>
          <div className="size-2 rounded-full bg-yellow-500"></div>
          <div className="size-2 rounded-full bg-green-500"></div>
        </div>
      </div>
      <pre className="p-4 text-white">
        <code className="grid gap-y-1 overflow-auto">{wrappedChildren}</code>
      </pre>
    </div>
  )

  if (!sequence) return content

  return (
    <SequenceContext.Provider value={contextValue}>
      {content}
    </SequenceContext.Provider>
  )
}
