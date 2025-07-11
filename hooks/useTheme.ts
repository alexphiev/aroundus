import {
  themeClasses,
  statusColors,
  type StatusVariant,
} from '@/types/theme.types'
import { cn } from '@/lib/utils'

/**
 * Hook for using the centralized theme system
 */
export function useTheme() {
  /**
   * Get badge class for a specific status variant
   */
  const getBadgeClass = (
    variant: StatusVariant,
    additionalClasses?: string
  ) => {
    return cn(themeClasses.badge[variant], additionalClasses)
  }

  /**
   * Get status colors for a specific variant
   */
  const getStatusColors = (variant: StatusVariant) => {
    return statusColors[variant]
  }

  /**
   * Get icon container class
   */
  const getIconContainerClass = (
    small?: boolean,
    additionalClasses?: string
  ) => {
    return cn(
      small ? themeClasses.icon.containerSm : themeClasses.icon.container,
      additionalClasses
    )
  }

  /**
   * Get card classes with optional active state
   */
  const getCardClasses = (isActive?: boolean, additionalClasses?: string) => {
    return cn(
      themeClasses.card.interactive,
      themeClasses.card.layout,
      isActive && themeClasses.card.active,
      additionalClasses
    )
  }

  /**
   * Get skeleton class for a specific variant
   */
  const getSkeletonClass = (
    variant: keyof typeof themeClasses.skeleton,
    additionalClasses?: string
  ) => {
    return cn(themeClasses.skeleton[variant], additionalClasses)
  }

  /**
   * Get layout class for a specific variant
   */
  const getLayoutClass = (
    variant: keyof typeof themeClasses.layout,
    additionalClasses?: string
  ) => {
    return cn(themeClasses.layout[variant], additionalClasses)
  }

  /**
   * Get typography class for a specific variant
   */
  const getTextClass = (
    variant: keyof typeof themeClasses.text,
    additionalClasses?: string
  ) => {
    return cn(themeClasses.text[variant], additionalClasses)
  }

  /**
   * Get spacing class for a specific variant
   */
  const getSpacingClass = (
    variant: keyof typeof themeClasses.spacing,
    additionalClasses?: string
  ) => {
    return cn(themeClasses.spacing[variant], additionalClasses)
  }

  /**
   * Get motion class for a specific variant
   */
  const getMotionClass = (
    variant: keyof typeof themeClasses.motion,
    additionalClasses?: string
  ) => {
    return cn(themeClasses.motion[variant], additionalClasses)
  }

  return {
    // Direct access to theme classes
    classes: themeClasses,
    colors: statusColors,

    // Utility functions
    getBadgeClass,
    getStatusColors,
    getIconContainerClass,
    getCardClasses,
    getSkeletonClass,
    getLayoutClass,
    getTextClass,
    getSpacingClass,
    getMotionClass,
  }
}
