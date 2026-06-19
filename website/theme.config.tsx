import React from 'react';
import { useConfig } from 'nextra-theme-docs';

// Live deployment. Change to your custom domain once it's added in Vercel
// (e.g. 'https://nitro-thumbnail.shivshankartiwari.com').
const SITE_URL = 'https://react-native-nitro-thumbnail.vercel.app';

const Logo = () => (
  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
    <span style={{ fontSize: '1.3rem' }}>🎬</span>
    <span>
      react-native-<span style={{ color: '#e0218a' }}>nitro</span>-thumbnail
    </span>
  </span>
);

const config = {
  logo: <Logo />,
  project: {
    link: 'https://github.com/pythonsst/react-native-nitro-thumbnail',
  },
  chat: {
    link: 'https://www.npmjs.com/package/react-native-nitro-thumbnail',
    icon: (
      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>npm</span>
    ),
  },
  docsRepositoryBase:
    'https://github.com/pythonsst/react-native-nitro-thumbnail/tree/main/website',
  color: {
    hue: 326,
    saturation: 80,
  },
  head: function Head() {
    const { frontMatter, title } = useConfig();
    const pageTitle = title
      ? `${title} – react-native-nitro-thumbnail`
      : 'react-native-nitro-thumbnail';
    const description =
      frontMatter.description ||
      'Generate a thumbnail from any video — local or remote — with one async call. The same API on iOS, Android & Web. Nitro-powered.';
    return (
      <>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:site_name" content="react-native-nitro-thumbnail" />
        <meta property="og:image" content={`${SITE_URL}/demo-thumbnail.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={`${SITE_URL}/demo-thumbnail.jpg`} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href={SITE_URL} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </>
    );
  },
  banner: {
    key: 'v0.1.1-live',
    text: (
      <a href="https://www.npmjs.com/package/react-native-nitro-thumbnail" target="_blank" rel="noreferrer">
        🎉 react-native-nitro-thumbnail is live on npm — read the docs →
      </a>
    ),
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },
  toc: {
    backToTop: true,
  },
  editLink: {
    text: 'Edit this page on GitHub →',
  },
  feedback: {
    content: 'Question? Give us feedback →',
    labels: 'feedback',
  },
  footer: {
    text: (
      <span>
        MIT {new Date().getFullYear()} ©{' '}
        <a href="https://github.com/pythonsst/react-native-nitro-thumbnail" target="_blank" rel="noreferrer">
          react-native-nitro-thumbnail
        </a>
        . Built with Nitro.
      </span>
    ),
  },
};

export default config;
