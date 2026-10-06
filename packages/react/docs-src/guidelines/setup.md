# Setting up {{name}} in Figma Make

Check each step once per file, and skip one that's already done.

## 1. The package

`{{package}}` is installed if you're reading this. Keep it as a direct dependency in `package.json`, and import components from `{{package}}` only.

## 2. The stylesheet and the fonts

{{name}} doesn't bundle its fonts. The text styles use {{fonts}}, which load from Google Fonts. Put these lines first in `src/index.css`, in this order. An `@import` after any other rule is ignored:

```css
@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Space+Grotesk:wght@700&family=Space+Mono:wght@400&display=swap');
@import '{{package}}/style.css';
@import 'tailwindcss';
```

`style.css` holds every token and component style, in light and dark. Import it once, here, and nowhere else.

## 3. The page's ground

The stylesheet doesn't style `<body>`. Give it the page colours and the body text style, after the imports in `src/index.css`:

```css
body {
  background-color: var(--{{prefix}}-color-background-page);
  color: var(--{{prefix}}-color-text-default);
  font-family: var(--{{prefix}}-text-body-font-family);
  font-size: var(--{{prefix}}-text-body-font-size);
  font-weight: var(--{{prefix}}-text-body-font-weight);
  letter-spacing: var(--{{prefix}}-text-body-letter-spacing);
  line-height: var(--{{prefix}}-text-body-line-height);
}
```

## 4. Light and dark

Nothing to do. Every colour token follows the system setting. To force one, set `data-theme="light"` or `data-theme="dark"` on `<html>`.
