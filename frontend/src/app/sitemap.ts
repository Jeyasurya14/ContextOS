export default function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://contextos.com'
  
  const routes = [
    '',
    '/login',
    '/register',
    '/pricing',
    '/faq',
    '/blog',
    '/dashboard',
  ]

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' || route === '/blog' ? 'daily' : 'weekly' as const,
    priority: route === '' ? 1.0 : route === '/pricing' ? 0.9 : 0.8,
  }))
}
