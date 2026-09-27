import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'md-tech-pdf',
  description: 'Technical document PDF generator from Markdown with flexible diagram layout',
  base: '/md-tech-pdf/',
  vite: {
    css: {
      postcss: {},
    },
  },

  locales: {
    root: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/getting-started' },
          { text: 'Reference', link: '/reference/frontmatter' },
          { text: 'Gallery', link: '/reference/diagrams' },
          { text: 'GitHub', link: 'https://github.com/ikaruga-tech/md-tech-pdf' },
        ],
        sidebar: [
          {
            text: 'Introduction',
            items: [
              { text: 'Getting Started', link: '/guide/getting-started' },
              { text: 'CLI Usage', link: '/guide/cli' },
              { text: 'VS Code Extension', link: '/guide/vscode' },
            ],
          },
          {
            text: 'Configuration Reference',
            items: [
              { text: 'Front Matter Configuration', link: '/reference/frontmatter' },
              { text: 'VS Code Settings', link: '/reference/settings' },
              { text: 'Diagram Formatting Guide', link: '/reference/diagrams' },
            ],
          },
        ],
      },
    },
    ja: {
      label: '日本語',
      lang: 'ja',
      themeConfig: {
        nav: [
          { text: 'ガイド', link: '/ja/guide/getting-started' },
          { text: 'リファレンス', link: '/ja/reference/frontmatter' },
          { text: 'ギャラリー', link: '/ja/reference/diagrams' },
          { text: 'GitHub', link: 'https://github.com/ikaruga-tech/md-tech-pdf' },
        ],
        sidebar: [
          {
            text: 'はじめに',
            items: [
              { text: 'スタートガイド', link: '/ja/guide/getting-started' },
              { text: 'CLI の使い方', link: '/ja/guide/cli' },
              { text: 'VS Code 拡張機能', link: '/ja/guide/vscode' },
            ],
          },
          {
            text: '設定リファレンス',
            items: [
              { text: 'Front Matter 設定', link: '/ja/reference/frontmatter' },
              { text: 'VS Code 設定', link: '/ja/reference/settings' },
              { text: 'ダイアグラム記法ガイド', link: '/ja/reference/diagrams' },
            ],
          },
        ],
      },
    },
  },

  themeConfig: {
    socialLinks: [{ icon: 'github', link: 'https://github.com/ikaruga-tech/md-tech-pdf' }],
    footer: {
      message: 'Released under the Apache-2.0 License.',
      copyright: 'Copyright © 2026 ikaruga-tech',
    },
  },
});
