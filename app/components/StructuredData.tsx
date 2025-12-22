import Script from 'next/script';

export function StructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'TimeSeal - Cryptographic Time-Locked Vault',
    applicationCategory: 'SecurityApplication',
    operatingSystem: 'Web',
    url: 'https://timeseal.dev',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Cryptographically enforced time-locked vault with dead man\'s switch. Create encrypted messages that unlock automatically at a future date or after inactivity. Zero-trust, edge-native AES-GCM encryption.',
    featureList: [
      'Time-locked encryption with AES-GCM-256',
      'Dead man\'s switch with pulse mechanism',
      'Zero-trust split-key architecture',
      'Edge-native on Cloudflare Workers',
      'D1 database encrypted storage',
      'Cryptographic receipts with HMAC',
      'Rate limiting and bot protection',
      'Audit logging for compliance',
    ],
    screenshot: 'https://timeseal.dev/explainerimage.png',
    author: {
      '@type': 'Organization',
      name: 'TimeSeal',
      url: 'https://timeseal.dev'
    },
    datePublished: '2024-01-01',
    softwareVersion: '0.5.3',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5',
      ratingCount: '1',
    },
  };

  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://timeseal.dev'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'How It Works',
        item: 'https://timeseal.dev/how-it-works'
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Security',
        item: 'https://timeseal.dev/security'
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: 'FAQ',
        item: 'https://timeseal.dev/faq'
      }
    ]
  };

  return (
    <>
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Script
        id="breadcrumb-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
    </>
  );
}
