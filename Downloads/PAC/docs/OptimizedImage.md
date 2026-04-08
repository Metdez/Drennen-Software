# OptimizedImage

Wrapper around `next/image` with sensible defaults for performance.

## Key Features
- Blur placeholder with tiny gray base64 image for perceived loading speed
- Lazy loading by default (`priority` prop overrides to eager)
- Accepts standard `next/image` sizing props (`width`, `height`, `sizes`)

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| src | string | required | Image source URL |
| alt | string | required | Alt text |
| width | number | required | Intrinsic width |
| height | number | required | Intrinsic height |
| priority | boolean | false | Load eagerly (above-the-fold images) |
| className | string | undefined | CSS classes |
| sizes | string | undefined | Responsive sizes attribute |

## Location
`components/ui/OptimizedImage.tsx`
