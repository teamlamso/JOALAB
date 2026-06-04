import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Démontage automatique des composants entre chaque test pour libérer le DOM.
afterEach(() => {
  cleanup()
})
