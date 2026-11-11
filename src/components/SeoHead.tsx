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
      
      title = `${tier.name} (${tierPriceFormatted}) | Architechnix & OmniOps Systems`;
      description = `${tier.turnaround || 'Productized advisory'}: ${tier.description} Includes complete SDLC specifications, ISO 27001, SOC 2, and zero-meeting async delivery.`;
      canonicalHash = `#tier-${tier.id}`;
    } else {
      const phase = CURRICULUM_PHASES.find((p) => p.phase === currentPhaseNum) || CURRICULUM_PHASES[0];
      
      title = `Phase ${phase.phase}: ${phase.title} | OmniOps Flex Wizard`;
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

    // 2. Standard Metadata
    setMetaTag('name', 'description', description);
    setLinkTag('canonical', fullCanonicalUrl);

    // 3. OpenGraph Social Cards
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', fullCanonicalUrl);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:site_name', 'OmniOps Systems {∞} & Architechnix');

    // 4. Twitter / X Cards
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);

    // 5. Schema.org JSON-LD Structured Data
    const structuredData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'EducationalOrganization',
          '@id': `${origin}#organization`,
          'name': 'OmniOps Systems & Architechnix',
          'url': origin,
          'logo': `${origin}/favicon.ico`,
          'description': 'Productized asynchronous enterprise architecture advisory and 6-phase engineering curriculum.',
          'offers': PRICING_TIERS.map((tier) => ({
            '@type': 'Offer',
            'name': tier.name,
            'price': tier.price.toString(),
            'priceCurrency': 'USD',
            'description': tier.description,
            'url': `${origin}${pathname}#tier-${tier.id}`
          }))
        },
        {
          '@type': 'Course',
          '@id': `${origin}#curriculum`,
          'name': 'OmniOps Systems 6-Phase Enterprise Architecture Curriculum',
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
