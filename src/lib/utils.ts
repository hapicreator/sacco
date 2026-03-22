// FILE: src/lib/utils.ts
// ACTION: REPLACE

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Merge Tailwind classes safely
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format number as Ugandan Shillings
export function formatUGX(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format ISO date string to readable date
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-UG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Format ISO date string to date + time
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-UG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Get 2-letter initials from a full name
// e.g. "Amina Nakato" → "AN"
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Truncate long text with ellipsis
export function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}
