/**
 * Application constants barrel export.
 *
 * IMPORTANT: Always import constants from this barrel (`@/lib/constants`), never from
 * the individual sub-files (e.g. `@/lib/constants/routes`). This keeps import paths
 * stable if sub-files are reorganised and ensures tree-shaking works correctly.
 *
 * @example
 * // Correct
 * import { ROUTES, BRAND, AI_CONFIG } from '@/lib/constants'
 *
 * // Wrong — import from sub-files directly
 * import { ROUTES } from '@/lib/constants/routes'
 */
export { ROUTES } from './routes'
export { BRAND, APP_NAME } from './brand'
export { AI_CONFIG } from './ai'
export { ACCEPTED_FILE_TYPES, ACCEPTED_ZIP_MIME } from './validation'
