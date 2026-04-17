import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  appleIcon?: string;
  pwaIcon?: string;
  wikidataId?: string;
  nationality?: string;
  location?: string;
  jobTitle?: string;
  orgName?: string;
  alumniName?: string;
  awards?: any[];
  navLinks?: { name: string, href: string }[];
}

const SEO: React.FC<SEOProps> = ({ 
  title, 
  description = "Janak Panthi is an entrepreneur and computer science student at Texas State University, known for the career platform Link A Job and ROBAJ Technology.", 
  keywords,
  image = "https://www.janakpanthi.com.np/Resources/images/profile-1.jpg", 
  url = "https://www.janakpanthi.com.np/", 
  type = "website",
  appleIcon,
  pwaIcon,
  wikidataId,
  nationality,
  location,
  jobTitle,
  orgName,
  alumniName,
  awards = [],
  navLinks = []
}) => {
  const siteName = "Janak Panthi";
  const displayTitle = title || siteName;
  const fullTitle = displayTitle === siteName ? displayTitle : `${displayTitle} | ${siteName}`;

  // Structured Data (JSON-LD)
  const schemaData = [
    {
      "@context": "https://schema.org",
      "@type": "Person",
      "@id": wikidataId || "https://www.wikidata.org/wiki/Q137659841",
      "mainEntityOfPage": url,
      "name": "Janak Panthi",
      "url": url,
      "image": image,
      "description": description,
      "jobTitle": jobTitle || "Entrepreneur & Computer Science Student",
      "nationality": {
        "@type": "Country",
        "name": nationality || "Nepal"
      },
      "homeLocation": {
        "@type": "Place",
        "name": location || "San Marcos, Texas"
      },
      "affiliation": {
        "@type": "EducationalOrganization",
        "name": orgName || "Texas State University"
      },
      "alumniOf": alumniName ? [
        {
          "@type": "EducationalOrganization",
          "name": alumniName
        }
      ] : [],
      "award": awards && awards.length > 0 ? awards.map(a => `${a.title} - ${a.organization} (${a.year})`) : [],
      "sameAs": [
        "https://www.linkedin.com/in/janakpanthi",
        "https://github.com/janakpanthi",
        wikidataId || "https://www.wikidata.org/wiki/Q137659841"
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": siteName,
      "url": url
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Site Navigation",
      "itemListElement": (navLinks.length > 0 ? navLinks : [
        { name: "Home", href: "#home" },
        { name: "About", href: "#about" },
        { name: "Projects", href: "#projects" },
        { name: "Skills", href: "#skills" },
        { name: "Awards", href: "#awards" },
        { name: "Gallery", href: "#gallery" },
        { name: "Dev Logs", href: "#devlogs" },
        { name: "Contact", href: "#contact" }
      ]).map((link, i) => ({
        "@type": "SiteNavigationElement",
        "position": i + 1,
        "name": link.name,
        "url": link.href.startsWith('http') ? link.href : `${url}${link.href.replace(/^\//, '')}`
      }))
    }
  ];

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={url} />

      {/* PWA / Apple Meta Tags */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content={siteName} />
      <link rel="apple-touch-icon" href={appleIcon || image} />
      <meta name="theme-color" content="#da755b" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Structured Data */}
      {schemaData.map((data, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEO;
