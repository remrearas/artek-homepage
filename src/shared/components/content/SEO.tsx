// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 *  █████╗ ██████╗  █████╗ ███████╗
 * ██╔══██╗██╔══██╗██╔══██╗██╔════╝
 * ███████║██████╔╝███████║███████╗
 * ██╔══██║██╔══██╗██╔══██║╚════██║
 * ██║  ██║██║  ██║██║  ██║███████║
 * ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
 *
 * Copyright (C) 2025 Rıza Emre ARAS <r.emrearas@proton.me>
 *
 * This file is part of ARTEK Homepage.
 *
 * ARTEK Homepage is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { getSiteConfig } from '@shared/config/seoConfig';
import { generateTitle, generateUrl, generateImageUrl } from '@shared/utils/seo-utils';
import { useLocale } from '@shared/hooks';
import { useSEO } from '@shared/contexts/SEOContext';
import { createOrganizationSchema, createLocalBusinessSchema } from '@shared/utils/schema-helpers';

export interface SEOProps {
  /** Page title (without site name) */
  title?: string;
  /** Page description for meta tags */
  description?: string;
  /** OG image path or full URL */
  image?: string;
  /** Page path (e.g., "/contact") */
  path?: string;
  /** Content type for Open Graph */
  type?: 'website' | 'article' | 'profile';
  /** Disable search engine indexing */
  noIndex?: boolean;
  /** Article publish date (ISO 8601 format) */
  publishedTime?: string;
  /** Article modified date (ISO 8601 format) */
  modifiedTime?: string;
  /** Canonical URL override */
  canonical?: string;
  /** Optional schemas to include (from context or prop) */
  schemas?: any[];
}

/**
 * SEO Component
 *
 * Features:
 * - Centralized configuration via seo.config.ts
 * - Automatic title/URL generation
 * - Open Graph & Twitter Cards
 * - JSON-LD structured data
 *
 * @example
 * ```tsx
 * <SEO
 *   title="İstatistikler"
 *   description="Ar-Ge merkezi istatistikleri"
 *   path="/statistics"
 * />
 * ```
 */
const SEO: React.FC<SEOProps> = ({
  title,
  description,
  image,
  path,
  type = 'website',
  noIndex = false,
  publishedTime,
  modifiedTime,
  canonical,
  schemas: propSchemas = [],
}) => {
  const { locale } = useLocale();
  const { metadata, updateMetadata } = useSEO();

  // Get locale-specific site config
  const siteConfig = getSiteConfig(locale);

  // Use site config description as default
  const finalDescription = description || siteConfig.description;

  // Generate computed values with locale
  const fullTitle = generateTitle(title, locale);
  // Auto-detect current path if not provided (for canonical URL)
  const currentPath = path || (typeof window !== 'undefined' ? window.location.pathname : undefined);
  const fullUrl = canonical || generateUrl(currentPath, locale);
  const fullImage = generateImageUrl(image, locale);

  // Update SEO context whenever metadata changes (including locale)
  useEffect(() => {
    updateMetadata({
      title: fullTitle,
      description: finalDescription,
      path: path || window.location.pathname,
      locale, // Include current locale in metadata
    });
  }, [fullTitle, finalDescription, path, locale, updateMetadata]);

  // Robots directive
  const robotsContent = noIndex ? 'noindex, nofollow' : 'index, follow';

  // Built-in global schemas (automatically included on every page)
  const builtInSchemas = useMemo(() => {
    // 1. Organization Schema - Global identity
    const organizationSchema = createOrganizationSchema(siteConfig.logo, locale);

    // 2. LocalBusiness Schema - Office location and contact info
    const localBusinessSchema = createLocalBusinessSchema(siteConfig.localBusiness, locale);

    return [organizationSchema, localBusinessSchema];
  }, [locale, siteConfig]);

  // Merge built-in schemas + context schemas + prop schemas
  const allSchemas = [...builtInSchemas, ...(metadata.schemas || []), ...propSchemas];

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={finalDescription} />
      <meta name="author" content={siteConfig.author.name} />

      {/* Robots */}
      <meta name="robots" content={robotsContent} />

      {/* Canonical URL */}
      <link rel="canonical" href={fullUrl} />

      {/* Language */}
      <meta httpEquiv="content-language" content={locale} />
      <html lang={locale} />

      {/* Open Graph / Facebook
          Protocol created by Facebook (Meta) for rich social sharing previews
          Reference: https://developers.facebook.com/docs/sharing/webmasters/
          Best Practices (2025):
          - og:title: Keep under 60 chars (desktop) / 40 chars (mobile)
          - og:description: 150-200 chars (Facebook displays up to 300)
          - og:image: Minimum 1200x630px, up to 2MB for Retina displays
          - Posts with images get 100% more engagement (2024 INMA study)
          Test your tags: https://developers.facebook.com/tools/debug/
      */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:site_name" content={siteConfig.name} />
      <meta property="og:locale" content={siteConfig.locale} />

      {/* Article specific Open Graph tags */}
      {type === 'article' && (
        <>
          {publishedTime && <meta property="article:published_time" content={publishedTime} />}
          {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
          <meta property="article:author" content={siteConfig.author.name} />
        </>
      )}

      {/* X (Twitter) Card
          Despite platform rebrand to X, meta tags still use 'twitter:' prefix (2025)
          Reference: https://developer.x.com/en/docs/x-for-websites/cards/overview/markup
          Cards enable large image previews when URLs are shared on X/Twitter
          Falls back to Open Graph tags if twitter: tags are not provided
          Status: Fully functional and officially supported by X platform
          No changes announced - continue using twitter: prefix
          Card Validator: https://cards-dev.twitter.com/validator (still works)
      */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={fullImage} />
      {siteConfig.social.twitter && (
        <meta name="twitter:site" content={siteConfig.social.twitter} />
      )}

      {/* JSON-LD Structured Data - Rendered from context/props */}
      {allSchemas.map((schema: any, index: number) => (
        <script key={schema['@id'] || index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEO;
