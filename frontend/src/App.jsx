import { CssBaseline, ThemeProvider } from '@mui/material'
import { BrowserRouter } from 'react-router-dom'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'
import { SessionProvider } from '@/features/auth/SessionProvider'
import { AppRoutes } from '@/routes/AppRoutes'
import { theme } from '@/theme/theme'

const App = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <AppErrorBoundary>
      <BrowserRouter>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </ThemeProvider>
)

export default App
