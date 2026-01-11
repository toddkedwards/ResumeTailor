# Build Instructions

## Setup

1. Install dependencies:
```bash
npm install
```

## Development

For development with hot-reloading CSS:
```bash
npm run dev
```

This will watch for changes and automatically rebuild the CSS.

## Production Build

Before deploying, build the optimized CSS:
```bash
npm run build
```

This will:
- Compile Tailwind CSS from `src/input.css`
- Output minified CSS to `dist/output.css`
- Optimize for production

## Deployment

1. Build the CSS:
```bash
npm run build
```

2. Deploy to Firebase:
```bash
firebase deploy --only hosting
```

## PWA Icons

The app requires PWA icons. Currently, the manifest references:
- `/icon-192x192.png`
- `/icon-512x512.png`

**To create icons:**
1. Design your icon (recommended: 512x512px)
2. Export as PNG at multiple sizes
3. Place in the root directory
4. Update `manifest.json` with all icon sizes

**Quick solution:** Use an online tool like:
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

## Notes

- The compiled CSS (`dist/output.css`) should be committed to git for deployment
- For development, you can temporarily use the Tailwind CDN by uncommenting it in `index.html`
- The build process uses Tailwind CLI for optimal performance
