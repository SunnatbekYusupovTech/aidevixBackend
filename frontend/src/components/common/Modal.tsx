import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from 'gsap'
import { IoClose } from 'react-icons/io5'
import clsx from 'clsx'

/**
 * Animated Modal component using GSAP
 * Props:
 *   isOpen    {boolean}
 *   onClose   {function}
 *   title     {string}
 *   size      {sm|md|lg|xl|full}
 *   children  {ReactNode}
 */

// Bir vaqtning o'zida ochiq modallar sonini hisoblab, body scroll-ni boshqaramiz.
// (Aks holda bir modal yopilganda boshqasi hali ochiq turgan bo'lsa scroll ochilib ketadi.)
let openModalCount = 0

export default function Modal({ isOpen, onClose, title, size = 'md', children, className }) {
  const sizes = {
    sm:   'max-w-sm',
    md:   'max-w-md',
    lg:   'max-w-lg',
    xl:   'max-w-2xl',
    full: 'max-w-5xl',
  }

  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    openModalCount += 1
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    previouslyFocusedRef.current = (document.activeElement as HTMLElement) || null
    requestAnimationFrame(() => {
      const node = dialogRef.current
      if (!node) return
      const focusable = node.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      ;(focusable || node).focus()
    })

    gsap.fromTo(
      '#modal-content',
      { opacity: 0, scale: 0.9, y: 20 },
      { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'back.out(1.4)' },
    )

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose?.()
      }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)
      openModalCount = Math.max(0, openModalCount - 1)
      if (openModalCount === 0) {
        document.body.style.overflow = prevOverflow
      }
      previouslyFocusedRef.current?.focus?.()
    }
  }, [isOpen, onClose])

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-2 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={handleBackdrop}
      role="presentation"
    >
      <div
        id="modal-content"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
        tabIndex={-1}
        className={clsx(
          'glass-card relative max-h-[92vh] w-full overflow-y-auto p-4 outline-none sm:max-h-[88vh] sm:p-6',
          sizes[size],
          className,
        )}
      >
        {/* Header */}
        {title && (
          <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
            <h3 className="min-w-0 flex-1 truncate text-base font-bold text-white sm:text-lg">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Yopish"
              className="btn btn-ghost btn-sm btn-circle shrink-0"
            >
              <IoClose className="text-xl" />
            </button>
          </div>
        )}

        {/* Close button (no title) */}
        {!title && (
          <button
            onClick={onClose}
            aria-label="Yopish"
            className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3 sm:right-4 sm:top-4"
          >
            <IoClose className="text-xl" />
          </button>
        )}

        {children}
      </div>
    </div>,
    document.body,
  )
}
