import { Metadata } from 'next';
import ProjectsClient from './ProjectsClient';
import { safeJsonLd } from '@/utils/jsonLd';

export const metadata: Metadata = {
  // Brandsiz — root template "| Aidevix" qo'shadi
  title: "Loyihalar — biz qurgan production saytlar",
  description:
    "Aidevix jamoasi ishlab chiqqan real production loyihalar: econur.uz (gilam yuvish xizmati) va autokran.uz (avtokran ijarasi). Web-sayt ishlab chiqish, dizayn va SEO — g'oyadan production'gacha.",
  alternates: { canonical: '/projects' },
  openGraph: {
    title: 'Aidevix loyihalari — portfolio',
    description:
      "econur.uz, autokran.uz va boshqa production loyihalar — Aidevix jamoasi tomonidan qurilgan.",
    images: [{ url: 'https://aidevix.uz/Logo.jpg', width: 1200, height: 630, alt: 'Aidevix' }],
  },
};

const collectionSchema = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Aidevix loyihalari',
  url: 'https://aidevix.uz/projects',
  description:
    "Aidevix jamoasi ishlab chiqqan production loyihalar portfoliosi.",
  publisher: { '@id': 'https://aidevix.uz/#organization' },
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        item: {
          '@type': 'WebSite',
          name: 'Eco Nur — gilam yuvish xizmati',
          url: 'https://econur.uz',
          creator: { '@id': 'https://aidevix.uz/#organization' },
        },
      },
      {
        '@type': 'ListItem',
        position: 2,
        item: {
          '@type': 'WebSite',
          name: 'AUTOKRAN.UZ — avtokran ijarasi',
          url: 'https://autokran.uz',
          creator: { '@id': 'https://aidevix.uz/#organization' },
        },
      },
    ],
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://aidevix.uz' },
    { '@type': 'ListItem', position: 2, name: 'Loyihalar', item: 'https://aidevix.uz/projects' },
  ],
};

export default function ProjectsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
      />
      <ProjectsClient />
    </>
  );
}
