import { CssBaseline, ThemeProvider } from '@mui/material'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router-dom'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'
import { SessionProvider } from '@/features/auth/SessionProvider'
import { queryClient } from '@/api/queryClient'
import { AppRoutes } from '@/routes/AppRoutes'
import { theme } from '@/theme/theme'

const App = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SessionProvider>
            <AppRoutes />
          </SessionProvider>
        </BrowserRouter>
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      </QueryClientProvider>
    </AppErrorBoundary>
  </ThemeProvider>
)

export default App
