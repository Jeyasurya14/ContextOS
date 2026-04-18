import Head from 'next/head'

interface SEOProps {
  title?: string
  description?: string
  keywords?: string
  ogImage?: string
  ogType?: string
  canonical?: string
  noindex?: boolean
  author?: string
  publishedTime?: string
  modifiedTime?: string
}

export function SEO({
  title = 'ContextOS - AI-Powered Project Intelligence',
  description = 'Connect GitHub, Notion, Slack, and VS Code into one intelligent AI assistant. Get answers grounded in your real project data. Start free with 25 AI queries/day.',
  keywords = 'AI developer tools, project context, GitHub integration, Notion AI, Slack bot, code assistant, developer productivity, AI assistant, team collaboration, knowledge base',
  ogImage = 'https://contextos.com/og-image.png',
  ogType = 'website',
  canonical,
  noindex = false,
  author = 'ContextOS',
  publishedTime,
  modifiedTime,
}: SEOProps) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://contextos.com'
  const fullTitle = title.includes('ContextOS') ? title : `${title} | ContextOS`
  const canonicalUrl = canonical || siteUrl

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      
      {/* Robots */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="ContextOS" />
      <meta property="og:locale" content="en_US" />
      
      {/* Article specific */}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:creator" content="@ContextOS" />
      <meta name="twitter:site" content="@ContextOS" />
      
      {/* Additional Meta Tags */}
      <meta name="theme-color" content="#6450ff" />
      <meta name="msapplication-TileColor" content="#6450ff" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      
      {/* Geo Tags */}
      <meta name="geo.region" content="US" />
      <meta name="geo.placename" content="United States" />
      
      {/* Language */}
      <meta httpEquiv="content-language" content="en-US" />
      <link rel="alternate" hrefLang="en" href={canonicalUrl} />
      
      {/* Preconnect to external domains */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    </Head>
  )
}

export default SEO
