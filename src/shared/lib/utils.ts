import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function anchorNameFromId(id: string) {
  return `--${id.replace(/[^a-zA-Z0-9_-]/g, '_')}`
}

export function parseAriaShortcuts(
  shortcutsString: string | null | undefined,
): string[][] {
  if (!shortcutsString?.trim()) return []

  return shortcutsString
    .trim()
    .split(/\s+/)
    .map((shortcut) => shortcut.split('+'))
}
