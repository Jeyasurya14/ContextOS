export interface StructuredDataProps {
  type: 'Organization' | 'WebSite' | 'SoftwareApplication' | 'Product' | 'FAQPage' | 'HowTo' | 'Article'
  data: any
}

export function generateStructuredData(props: StructuredDataProps): string {
  const baseContext = 'https://schema.org'
  
  switch (props.type) {
    case 'Organization':
      return JSON.stringify({
        '@context': baseContext,
        '@type': 'Organization',
        name: 'ContextOS',
        url: 'https://contextos.com',
        logo: 'https://contextos.com/logo.png',
        description: 'AI-powered project intelligence platform that connects GitHub, Notion, Slack, and VS Code',
        foundingDate: '2024',
        sameAs: [
          'https://twitter.com/ContextOS',
          'https://linkedin.com/company/contextos',
          'https://github.com/contextos',
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'Customer Support',
          email: 'support@contextos.com',
        },
        ...props.data,
      })
    
    case 'WebSite':
      return JSON.stringify({
        '@context': baseContext,
        '@type': 'WebSite',
        name: 'ContextOS',
        url: 'https://contextos.com',
        description: 'AI-powered project intelligence platform',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://contextos.com/search?q={search_term_string}',
          },
          'query-input': 'required name=search_term_string',
        },
        ...props.data,
      })
    
    case 'SoftwareApplication':
      return JSON.stringify({
        '@context': baseContext,
        '@type': 'SoftwareApplication',
        name: 'ContextOS',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Web, Windows, macOS, Linux',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          ratingCount: '127',
          bestRating: '5',
          worstRating: '1',
        },
        description: 'Connect GitHub, Notion, Slack, and VS Code into one intelligent AI assistant',
        screenshot: 'https://contextos.com/screenshot.png',
        softwareVersion: '1.0',
        ...props.data,
      })
    
    case 'Product':
      return JSON.stringify({
        '@context': baseContext,
        '@type': 'Product',
        name: props.data.name || 'ContextOS Pro',
        description: props.data.description || 'Professional plan with unlimited AI queries',
        brand: {
          '@type': 'Brand',
          name: 'ContextOS',
        },
        offers: {
          '@type': 'Offer',
          price: props.data.price || '19',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          priceValidUntil: '2025-12-31',
          url: 'https://contextos.com/pricing',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          reviewCount: '127',
        },
      })
    
    case 'FAQPage':
      return JSON.stringify({
        '@context': baseContext,
        '@type': 'FAQPage',
        mainEntity: props.data.questions.map((q: { question: string; answer: string }) => ({
          '@type': 'Question',
          name: q.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: q.answer,
          },
        })),
      })
    
    case 'HowTo':
      return JSON.stringify({
        '@context': baseContext,
        '@type': 'HowTo',
        name: props.data.name,
        description: props.data.description,
        step: props.data.steps.map((step: { name: string; text: string }, index: number) => ({
          '@type': 'HowToStep',
          position: index + 1,
          name: step.name,
          text: step.text,
        })),
      })
    
    case 'Article':
      return JSON.stringify({
        '@context': baseContext,
        '@type': 'Article',
        headline: props.data.title,
        description: props.data.description,
        author: {
          '@type': 'Organization',
          name: 'ContextOS',
        },
        publisher: {
          '@type': 'Organization',
          name: 'ContextOS',
          logo: {
            '@type': 'ImageObject',
            url: 'https://contextos.com/logo.png',
          },
        },
        datePublished: props.data.publishedTime,
        dateModified: props.data.modifiedTime || props.data.publishedTime,
        image: props.data.image || 'https://contextos.com/og-image.png',
        ...props.data,
      })
    
    default:
      return ''
  }
}

// Use this in your page components like:
// <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: generateStructuredData({ type: 'Organization', data: {} }) }} />
