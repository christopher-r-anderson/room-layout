import { createRoot } from 'react-dom/client'
import { I18nProvider } from '@lingui/react'
import './index.css'
import App from './app/App'
import { i18n } from './shared/i18n/i18n'
import { initI18n } from './shared/i18n/setup'

// Resolve and reflect the active locale before React renders. English is already
// loaded/activated synchronously (see setup), so the default path is gate-free.
initI18n()

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <I18nProvider i18n={i18n}>
      <App />
    </I18nProvider>,
  )
}
