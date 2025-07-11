/**
 * Theme system type definitions for centralized styling
 */

export type StatusVariant = 'info' | 'warning' | 'success' | 'error'

export type BadgeVariant =
  | 'badge-info'
  | 'badge-warning'
  | 'badge-success'
  | 'badge-error'

export type IconContainerVariant = 'icon-container' | 'icon-container-sm'

export type LayoutVariant =
  | 'layout-card-header'
  | 'layout-card-content'
  | 'layout-flex-between'
  | 'layout-flex-center'
  | 'layout-flex-start'

export type TypographyVariant =
  | 'text-card-title'
  | 'text-card-description'
  | 'text-meta'
  | 'text-meta-bold'

export type SpacingVariant = 'space-content' | 'space-tight' | 'space-loose'

export type SkeletonVariant =
  | 'skeleton-base'
  | 'skeleton-text'
  | 'skeleton-title'
  | 'skeleton-icon'
  | 'skeleton-button'

export type CardVariant = 'card-interactive' | 'card-active' | 'card-layout'

export type MotionVariant = 'motion-card' | 'motion-hover'

export type FocusVariant = 'focus-ring'

/**
 * Centralized theme class mappings for consistent styling
 */
export const themeClasses = {
  // Status badges
  badge: {
    info: 'badge-info',
    warning: 'badge-warning',
    success: 'badge-success',
    error: 'badge-error',
  },

  // Icon containers
  icon: {
    container: 'icon-container',
    containerSm: 'icon-container-sm',
  },

  // Layout patterns
  layout: {
    cardHeader: 'layout-card-header',
    cardContent: 'layout-card-content',
    flexBetween: 'layout-flex-between',
    flexCenter: 'layout-flex-center',
    flexStart: 'layout-flex-start',
  },

  // Typography
  text: {
    cardTitle: 'text-card-title',
    cardDescription: 'text-card-description',
    meta: 'text-meta',
    metaBold: 'text-meta-bold',
  },

  // Spacing
  spacing: {
    content: 'space-content',
    tight: 'space-tight',
    loose: 'space-loose',
  },

  // Skeleton states
  skeleton: {
    base: 'skeleton-base',
    text: 'skeleton-text',
    title: 'skeleton-title',
    icon: 'skeleton-icon',
    button: 'skeleton-button',
  },

  // Card states
  card: {
    interactive: 'card-interactive',
    active: 'card-active',
    layout: 'card-layout',
  },

  // Motion
  motion: {
    card: 'motion-card',
    hover: 'motion-hover',
  },

  // Focus
  focus: {
    ring: 'focus-ring',
  },
} as const

/**
 * Status color mappings for consistent theming
 */
export const statusColors = {
  info: {
    bg: 'bg-status-info',
    text: 'text-status-info-foreground',
  },
  warning: {
    bg: 'bg-status-warning',
    text: 'text-status-warning-foreground',
  },
  success: {
    bg: 'bg-status-success',
    text: 'text-status-success-foreground',
  },
  error: {
    bg: 'bg-status-error',
    text: 'text-status-error-foreground',
  },
} as const
