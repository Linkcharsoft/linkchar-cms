'use client'
import './CustomButton.sass'
import Link from 'next/link'
import { Button } from 'primereact/button'
import { Tooltip } from 'primereact/tooltip'
import { classNames } from 'primereact/utils'
import { useRef } from 'react'
import type { Route } from 'next'
import type { ButtonProps as OriginalButtonProps } from 'primereact/button'
import type { HTMLAttributeAnchorTarget, ReactElement, ReactNode, RefObject } from 'react'

export type CustomButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost'
export type CustomButtonSize = 'xs' | 'sm' | 'md' | 'lg'

interface SharedProps {
  variant?: CustomButtonVariant
  size?: CustomButtonSize
  iconOnly?: boolean
  disabled?: boolean
  className?: string
  children?: ReactNode
  // Shown on hover and focus, also while disabled (to say why).
  tooltip?: string
  'aria-label'?: string
  'data-tour'?: string
}

interface LinkButtonProps extends SharedProps {
  href: string
  replace?: boolean
  target?: HTMLAttributeAnchorTarget
  rel?: string
  // Props that are silently dropped on the Link branch — TS will block them at the call site.
  onClick?: never
  type?: never
  loading?: never
  loadingIcon?: never
  icon?: never
  iconPos?: never
  badge?: never
  severity?: never
  outlined?: never
  text?: never
  raised?: never
  rounded?: never
  plain?: never
  label?: never
}

interface ActionButtonProps extends SharedProps, Omit<OriginalButtonProps, 'size' | 'tooltip' | keyof SharedProps> {
  href?: never
  replace?: never
  target?: never
  rel?: never
}

export type CustomButtonProps = LinkButtonProps | ActionButtonProps

const VARIANT_CLASSES: Record<CustomButtonVariant, string> = {
  primary: 'CustomButton--Primary',
  secondary: 'CustomButton--Secondary',
  ghost: 'CustomButton--Ghost',
  danger: 'CustomButton--Danger',
  'danger-ghost': 'CustomButton--DangerGhost'
}

const SIZE_CLASSES: Record<CustomButtonSize, string> = {
  xs: 'CustomButton--Xs', // 32px
  sm: 'CustomButton--Sm', // 36px
  md: 'CustomButton--Md', // 44px
  lg: 'CustomButton--Lg' // 52px
}

const CustomButton = ({
  className,
  variant = 'primary',
  size = 'md',
  iconOnly = false,
  href,
  replace,
  target,
  rel,
  onClick,
  disabled = false,
  tooltip,
  children,
  ...props
}: CustomButtonProps) => {
  const host = useRef<HTMLSpanElement>(null)
  const classes = classNames(
    'CustomButton',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    { 'CustomButton--IconOnly': iconOnly, 'CustomButton--Disabled': disabled },
    className
  )

  // PrimeReact's Tooltip alters its target's DOM: bound to a span React owns, unmounting the button stays safe.
  const withTooltip = (element: ReactElement) => (tooltip
    ? (
      <>
        <span ref={host} className='inline-flex'>{element}</span>
        <Tooltip target={host as RefObject<HTMLElement>} content={tooltip} position='bottom' />
      </>
    )
    : element)

  if (href) {
    return withTooltip(
      <Link
        href={(disabled ? '#' : href) as Route}
        replace={replace}
        target={target}
        rel={rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined)}
        className={classes}
        aria-disabled={disabled}
        aria-label={props['aria-label']}
        data-tour={props['data-tour']}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
      >
        { children }
      </Link>
    )
  }

  return withTooltip(
    <Button
      className={classes}
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled}
      disabled={disabled}
      {...props}
    >
      { children }
    </Button>
  )
}

export default CustomButton
