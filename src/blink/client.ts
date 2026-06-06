import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: import.meta.env.VITE_BLINK_PROJECT_ID || 'brand-panel-admin-fvb7c8w1',
  publishableKey: import.meta.env.VITE_BLINK_PUBLISHABLE_KEY || 'blnk_pk_6xNiHrO-5qP3aC9vLR4pEovRp6P0UQWc',
  authRequired: false,
  auth: { mode: 'managed' },
})
