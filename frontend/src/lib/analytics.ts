// Google Analytics 4 tracking helper

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || ''

// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID, {
      page_path: url,
    })
  }
}

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const event = ({ action, category, label, value }: {
  action: string
  category: string
  label?: string
  value?: number
}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  }
}

// Track conversions
export const trackSignup = () => {
  event({
    action: 'sign_up',
    category: 'engagement',
    label: 'User Registration',
  })
}

export const trackLogin = () => {
  event({
    action: 'login',
    category: 'engagement',
    label: 'User Login',
  })
}

export const trackUpgrade = (plan: string) => {
  event({
    action: 'purchase',
    category: 'ecommerce',
    label: plan,
  })
}

export const trackIntegrationConnect = (provider: string) => {
  event({
    action: 'integration_connect',
    category: 'engagement',
    label: provider,
  })
}

export const trackQuery = () => {
  event({
    action: 'ai_query',
    category: 'engagement',
    label: 'AI Query Sent',
  })
}

// Declare gtag on window
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event',
      targetId: string,
      config?: Record<string, any>
    ) => void
  }
}
