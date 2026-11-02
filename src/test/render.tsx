import { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { LanguageProvider } from '../hooks/useLanguage'

export function renderWithProviders(ui: ReactElement) {
  return render(
    <MantineProvider>
      <LanguageProvider>{ui}</LanguageProvider>
    </MantineProvider>
  )
}
