'use client'

import { Database } from 'lucide-react'

/* Real provider brand SVG marks — authentic brand look */

export function GitHubMark({ size = 20, color = '#f5f5f7' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M12 .5C5.73.5.7 5.53.7 11.81c0 5.02 3.23 9.27 7.72 10.78.56.11.77-.25.77-.55 0-.27-.01-1.17-.02-2.12-3.14.68-3.8-1.34-3.8-1.34-.51-1.3-1.25-1.64-1.25-1.64-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.94.1-.73.39-1.22.71-1.5-2.5-.29-5.13-1.25-5.13-5.57 0-1.23.44-2.24 1.16-3.03-.12-.28-.5-1.43.11-2.98 0 0 .94-.3 3.08 1.16.89-.25 1.85-.37 2.81-.37.95 0 1.91.12 2.81.37 2.14-1.46 3.08-1.16 3.08-1.16.61 1.55.23 2.7.11 2.98.72.79 1.16 1.8 1.16 3.03 0 4.33-2.64 5.28-5.15 5.56.4.35.76 1.03.76 2.08 0 1.5-.01 2.71-.01 3.08 0 .3.2.66.78.55 4.48-1.51 7.71-5.76 7.71-10.78C23.3 5.53 18.27.5 12 .5z" />
    </svg>
  )
}

export function NotionMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill="#fff" d="M4.46 3.49 15.1 2.7c1.31-.11 1.64-.04 2.47.56l3.4 2.39c.56.41.75.52.75.97v13.14c0 .82-.3 1.31-1.34 1.38l-12.36.75c-.78.04-1.16-.07-1.57-.6l-2.5-3.25c-.45-.6-.64-1.05-.64-1.57V4.8c0-.67.3-1.23 1.15-1.31z"/>
      <path fill="#000" fillRule="evenodd" clipRule="evenodd" d="M15.1 2.7 4.46 3.49c-.85.08-1.15.64-1.15 1.31v10.67c0 .52.19.97.64 1.57l2.5 3.25c.41.53.79.64 1.57.6l12.36-.75c1.04-.07 1.34-.56 1.34-1.38V6.62c0-.34-.15-.45-.59-.79l-3.56-2.57c-.83-.6-1.16-.67-2.47-.56zM7.86 5.63c-.98.07-1.22.08-1.78-.37L4.69 4.14c-.15-.15-.07-.34.3-.37l10.22-.75c.86-.07 1.31.22 1.64.49l1.72 1.25c.08.04.3.3.04.3L7.99 5.72l-.13-.09zm-.98 12.36V6.57c0-.52.15-.75.64-.79l11.75-.68c.45-.04.64.22.64.75v11.34c0 .53-.08.97-.79 1.01l-11.26.67c-.71.04-.98-.22-.98-.88zm11.15-11.26c.08.37 0 .75-.37.79l-.56.12v8.24c-.49.27-.94.41-1.31.41-.6 0-.75-.19-1.19-.75l-3.66-5.74v5.55l1.16.27s0 .68-.94.68l-2.6.15c-.08-.15 0-.56.26-.64l.68-.19V6.96l-.94-.08c-.08-.37.12-.9.71-.94l2.79-.19 3.82 5.85V6.39l-.97-.11c-.08-.45.26-.79.71-.82l2.41-.15z"/>
    </svg>
  )
}

export function SlackMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill="#E01E5A" d="M5.04 15.17a2.52 2.52 0 1 1-2.52-2.52h2.52v2.52zm1.27 0a2.52 2.52 0 0 1 5.04 0v6.31a2.52 2.52 0 1 1-5.04 0v-6.31z"/>
      <path fill="#36C5F0" d="M8.83 5.04a2.52 2.52 0 1 1 2.52-2.52v2.52H8.83zm0 1.27a2.52 2.52 0 0 1 0 5.04H2.52a2.52 2.52 0 1 1 0-5.04h6.31z"/>
      <path fill="#2EB67D" d="M18.96 8.83a2.52 2.52 0 1 1 2.52 2.52h-2.52V8.83zm-1.27 0a2.52 2.52 0 0 1-5.04 0V2.52a2.52 2.52 0 1 1 5.04 0v6.31z"/>
      <path fill="#ECB22E" d="M15.17 18.96a2.52 2.52 0 1 1-2.52 2.52v-2.52h2.52zm0-1.27a2.52 2.52 0 0 1 0-5.04h6.31a2.52 2.52 0 1 1 0 5.04h-6.31z"/>
    </svg>
  )
}

export function LinearMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id="linear-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9ca1ff"/>
          <stop offset="100%" stopColor="#5e6ad2"/>
        </linearGradient>
      </defs>
      <path fill="url(#linear-g)" d="M1 16.54 7.46 23A12 12 0 0 1 1 16.54zM1 12.14 11.86 23a12 12 0 0 0 2.9-.36L1.36 9.24A12 12 0 0 0 1 12.14zm1.22-4.35L16.2 21.78a12 12 0 0 0 2.33-1.5L3.72 5.47a12 12 0 0 0-1.5 2.32zm4.3-5.8a12 12 0 0 1 15.5 15.5L6.53 2Z"/>
    </svg>
  )
}

export function GoogleDriveMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill="#0066DA" d="M1.83 15.91 2.9 17.75a2.48 2.48 0 0 0 .9.9l3.8-6.58H0a2.48 2.48 0 0 0 .33 1.25l1.5 2.59z"/>
      <path fill="#00AC47" d="M12 5.93 8.2 -.65a2.48 2.48 0 0 0-.9.9L.33 10.08A2.48 2.48 0 0 0 0 11.33l7.6.74L12 5.93z"/>
      <path fill="#EA4335" d="m12 5.93 4.4 6.14h7.6a2.48 2.48 0 0 0-.33-1.25L16.7.25a2.48 2.48 0 0 0-.9-.9L12 5.93z"/>
      <path fill="#00832D" d="M16.4 12.07H7.6L3.8 18.65c.39.22.83.35 1.29.35h13.82a2.48 2.48 0 0 0 1.29-.35l-3.8-6.58z"/>
      <path fill="#2684FC" d="m20.15 12.5-3.45-5.82h-9.4L12 5.93l4.4 6.14h7.6c0-.46-.12-.93-.35-1.32l-3.5-6.25z"/>
      <path fill="#FFBA00" d="m20.17 12.48-3.47-6L12 12.07h8.8a2.48 2.48 0 0 0 1.05-.24l-1.68-1.35z"/>
    </svg>
  )
}

/* Dispatch */
export function BrandIcon({ provider, size = 20 }: { provider: string; size?: number }) {
  const key = provider.toLowerCase()
  if (key === 'github') return <GitHubMark size={size} />
  if (key === 'notion') return <NotionMark size={size} />
  if (key === 'slack') return <SlackMark size={size} />
  if (key === 'linear') return <LinearMark size={size} />
  if (key === 'google_drive' || key === 'google' || key === 'googledrive') return <GoogleDriveMark size={size} />
  return <Database size={size} style={{ color: 'var(--text-secondary)' }} />
}
