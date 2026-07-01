import { createRoot } from 'react-dom/client'
import { I18nProvider } from '@lingui/react'
import './index.css'
import App from './app/App'
import { i18n } from './shared/i18n/i18n'
import { initI18n } from './shared/i18n/setup'

function renderApp() {
  const root = document.getElementById('root')
  if (root) {
    createRoot(root).render(
      <I18nProvider i18n={i18n}>
        <App />
      </I18nProvider>,
    )
  }
}

// English is already active and renders immediately. A non-default locale gates
// the first render on its catalog so text and startup side effects resolve in
// that locale rather than flashing or emitting English.
const localeReady = initI18n()
if (localeReady) {
  void localeReady.finally(renderApp)
} else {
  renderApp()
}
