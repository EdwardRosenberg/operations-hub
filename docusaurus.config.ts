import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

let generatedPlugins: any[] = [];
try {
  const mod = await import('./generated/plugin-config.js');
  generatedPlugins = mod.default ?? [];
} catch {
  console.warn('[ops-hub] generated/plugin-config.ts not found — run npm run gen-config first.');
}

const config: Config = {
  title: 'Ops Hub',
  tagline: 'Single source of truth for features, code, tests, and observability',
  url: 'https://OWNER.github.io',
  baseUrl: '/ops-hub/',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  i18n: { defaultLocale: 'en', locales: ['en'] },

  plugins: [
    ...generatedPlugins,
    ['@easyops-cn/docusaurus-search-local', { hashed: true }],
  ],

  presets: [[
    'classic',
    {
      docs: false,
      blog: false,
      theme: { customCss: './src/css/custom.css' },
    } satisfies Preset.Options,
  ]],

  themeConfig: {
    navbar: {
      title: 'Ops Hub',
      items: [
        { to: '/', label: 'Feature Matrix', position: 'left' },
        { href: 'https://github.com/OWNER/ops-hub', label: 'GitHub', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      copyright: 'Built with Docusaurus · Auto-generated nightly',
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
