import Script from "next/script";

export function StructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "TimeSeal - Cryptographic Time-Locked Vault",
    applicationCategory: "SecurityApplication",
    operatingSystem: "Web",
    url: "https://timeseal.dev",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Cryptographically enforced time-locked vault with dead man's switch. Create encrypted messages that unlock automatically at a future date or after inactivity. Zero-trust, edge-native AES-GCM encryption.",
    featureList: [
      "Time-locked encryption with AES-GCM-256",
      "Dead man's switch with pulse mechanism",
      "Zero-trust split-key architecture",
      "Edge-native on Cloudflare Workers",
      "D1 database encrypted storage",
      "Cryptographic receipts with HMAC",
      "Rate limiting and bot protection",
      "Audit logging for compliance",
      "Ephemeral seals with self-destruct",
      "Privacy-preserving analytics",
    ],
    screenshot: "https://timeseal.dev/explainerimage.png",
    author: {
      "@type": "Organization",
      name: "TimeSeal",
      url: "https://timeseal.dev",
    },
    datePublished: "2024-01-01",
    dateModified: "2024-12-20",
    softwareVersion: "0.9.0",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5",
      ratingCount: "1",
    },
  };

  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How does TimeSeal prevent early access?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "TimeSeal uses split-key architecture where Key A stays in your browser (URL hash) and Key B is held by the server. The server refuses to release Key B until the unlock time, making early decryption mathematically impossible.",
        },
      },
      {
        "@type": "Question",
        name: "Can I change my computer clock to unlock early?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. The unlock time is checked on Cloudflare's NTP-synchronized servers, not your local computer. Your local clock is completely irrelevant.",
        },
      },
      {
        "@type": "Question",
        name: "What happens if I lose the vault link?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Lost forever. Key A is in the URL hash and without it, decryption is impossible. No recovery mechanism exists by design. Save vault links in a password manager.",
        },
      },
      {
        "@type": "Question",
        name: "How does Dead Man's Switch work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You set a pulse interval (e.g., 7 days) and must check in before it expires. If you fail to pulse, the seal automatically unlocks for the recipient. Perfect for estate planning and whistleblower protection.",
        },
      },
      {
        "@type": "Question",
        name: "What encryption does TimeSeal use?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "AES-GCM-256 encryption with split-key architecture. Client-side encryption in browser, server-side key encryption with master key, and triple-layer security in D1 database storage.",
        },
      },
    ],
  };

  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "TimeSeal",
    url: "https://timeseal.dev",
    logo: "https://timeseal.dev/favicon.svg",
    description: "Zero-trust cryptographic time-locked vault and dead man's switch platform",
    sameAs: [
      "https://github.com/teycir/timeseal",
    ],
  };

  return (
    <>
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Script
        id="faq-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }}
      />
      <Script
        id="organization-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
      />
    </>
  );
}
