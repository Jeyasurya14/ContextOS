import DOMPurify from 'isomorphic-dompurify'

export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] })
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

export const validateUserData = (data: {
  full_name?: string
  email?: string
  plan?: string
}): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {}
  
  if (data.full_name !== undefined) {
    const sanitized = sanitizeInput(data.full_name)
    if (sanitized.length < 1 || sanitized.length > 255) {
      errors.full_name = 'Name must be between 1 and 255 characters'
    }
  }
  
  if (data.email !== undefined && !validateEmail(data.email)) {
    errors.email = 'Invalid email format'
  }
  
  if (data.plan !== undefined) {
    const validPlans = ['free', 'pro', 'team']
    if (!validPlans.includes(data.plan)) {
      errors.plan = 'Invalid plan type'
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

export const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}
