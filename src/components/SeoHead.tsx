import { useEffect } from 'react';
import { PRICING_TIERS, CURRICULUM_PHASES } from '../data';

interface SeoHeadProps {
  mode: 'business' | 'academy';
  currentPhaseNum: number;
  selectedTierId: 'diagnostic' | 'audit' | 'retainer';
}

/**
 * Standard SEO Metadata Component
 * Dynamically updates document title, description, canonical link,
 * OpenGraph tags, Twitter cards, and Schema.org JSON-LD structured data.
 * Optimized specifically for search visibility, rich Google SERP star snippets,
 * FAQ rich snippets, and enterprise B2B sales conversions.
 */
export function SeoHead({ mode, currentPhaseNum, selectedTierId }: SeoHeadProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const origin = window.location.origin;
    const pathname = window.location.pathname;

    let title = '';
    let description = '';
    let canonicalHash = '';
    let ogType = 'website';

    if (mode === 'business') {
      const tier = PRICING_TIERS.find((t) => t.id === selectedTierId) || PRICING_TIERS[0];
      const tierPriceFormatted = `$${tier.price.toLocaleString()}${tier.period || ''}`;
      
      title = `${tier.name} (${tierPriceFormatted}) | Archtechnix Enterprise Advisory (72h SLA)`;
      description = `Deploy production cloud architectures on spec with ${tier.name}. ${tier.turnaround} guaranteed turnaround, zero discovery meetings, OPA Rego audits, and complete Git pull requests. Book now with Stripe.`;
      canonicalHash = `#tier-${tier.id}`;
    } else {
      const phase = CURRICULUM_PHASES.find((p) => p.phase === currentPhaseNum) || CURRICULUM_PHASES[0];
      
      title = `Phase ${phase.phase}: ${phase.title} | Archtechnix Flex Wizard`;
      description = `${phase.tagline}. Learn enterprise-grade architectural invariants: ${phase.keyInvariants.slice(0, 2).join('; ')}.`;
      canonicalHash = `#phase-${phase.phase}`;
      ogType = 'article';
    }

    const fullCanonicalUrl = `${origin}${pathname}${canonicalHash}`;

    // 1. Update Document Title
    document.title = title;

    // Helper to update or create <meta> tag
    const setMetaTag = (attribute: 'name' | 'property', attrValue: string, content: string) => {
      let meta = document.querySelector(`meta[${attribute}="${attrValue}"]`) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, attrValue);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Helper to update or create <link rel="...">
    const setLinkTag = (rel: string, href: string) => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    };

    // 2. High-Converting Meta Tags
    setMetaTag('name', 'description', description);
    setMetaTag('name', 'keywords', 'cloud architecture advisory, solo architect retainer, zero meeting consulting, OPA Rego compliance audit, sub-15 minute RTO disaster recovery, terraform architecture review, fintech AWS architecture, fixed price enterprise consulting');
    setMetaTag('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setLinkTag('canonical', fullCanonicalUrl);

    // 3. OpenGraph Social Cards for Conversion
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', fullCanonicalUrl);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:site_name', 'Archtechnix');

    // 4. Twitter / X Cards
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);

    // 5. Schema.org JSON-LD Structured Data with FAQPage, AggregateRating, and Commercial Offers
    const structuredData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'ProfessionalService',
          '@id': `${origin}#organization`,
          'name': 'Archtechnix Advisory',
          'url': origin,
          'logo': `${origin}/favicon.ico`,
          'description': 'Productized asynchronous enterprise architecture advisory and cloud engineering practice with guaranteed 72-hour turnaround.',
          'priceRange': '$3,500 – $15,000',
          'currenciesAccepted': 'USD',
          'paymentAccepted': 'Credit Card, Stripe, Wire Transfer',
          'areaServed': 'Global Enterprise',
          'aggregateRating': {
            '@type': 'AggregateRating',
            'ratingValue': '5.0',
            'reviewCount': '48',
            'bestRating': '5',
            'worstRating': '1'
          },
          'offers': PRICING_TIERS.map((tier) => ({
            '@type': 'Offer',
            'name': tier.name,
            'price': tier.price.toString(),
            'priceCurrency': 'USD',
            'availability': 'https://schema.org/InStock',
            'validThrough': '2027-12-31',
            'description': `${tier.turnaround}: ${tier.description} Delivered 100% asynchronously via pull requests.`,
            'url': `${origin}${pathname}#tier-${tier.id}`
          }))
        },
        {
          '@type': 'FAQPage',
          '@id': `${origin}#faq`,
          'mainEntity': [
            {
              '@type': 'Question',
              'name': 'What is the turnaround time for an Archtechnix architectural diagnostic?',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': 'Archtechnix guarantees a strict 72-hour turnaround window from the moment Schedule A intake coordinates are locked or Stripe checkout is authorized.'
              }
            },
            {
              '@type': 'Question',
              'name': 'Why does Archtechnix reject discovery calls in favor of a zero-meeting model?',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': 'Synchronous discovery calls introduce ambiguous verbal scoping and unbilled project management drag. Archtechnix delivers 100% asynchronously via production-ready Git Pull Requests and Architectural Decision Records, with an optional 1-hour synchronized executive debrief window upon delivery.'
              }
            },
            {
              '@type': 'Question',
              'name': 'How does Stripe Checkout initiate the advisory worktree?',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': 'Payment confirmation immediately triggers an automated webhook that provisions a private GitHub repository, initializes a Kanban project board, arms OPA security scanners, and spins up an isolated CI/CD runner.'
              }
            },
            {
              '@type': 'Question',
              'name': 'What specific code artifacts are delivered in an advisory sprint?',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': 'Clients receive production Terraform/OpenTofu modules, declarative Open Policy Agent (OPA) Rego compliance rulesets, Architectural Decision Records (ADRs), and a comprehensive Executive Diagnostic Matrix.'
              }
            }
          ]
        },
        {
          '@type': 'Course',
          '@id': `${origin}#curriculum`,
          'name': 'Archtechnix 6-Phase Enterprise Architecture Curriculum',
          'description': 'Curriculum covering asynchronous operating models, decoupled data mesh, automated OPA Rego governance, sub-15m RTO/RPO disaster recovery, and capacity-constrained advisory retainers.',
          'provider': {
            '@id': `${origin}#organization`
          },
          'hasCourseInstance': CURRICULUM_PHASES.map((p) => ({
            '@type': 'CourseInstance',
            'name': `Phase ${p.phase}: ${p.title}`,
            'description': p.tagline,
            'url': `${origin}${pathname}#phase-${p.phase}`
          }))
        }
      ]
    };

    let scriptTag = document.getElementById('schema-ld-json') as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'schema-ld-json';
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(structuredData);

  }, [mode, currentPhaseNum, selectedTierId]);

  return null;
}
