import { CssBaseline, ThemeProvider } from '@mui/material'
import { BrowserRouter } from 'react-router-dom'
import { SessionProvider } from '@/features/auth/SessionProvider'
import { AppRoutes } from '@/routes/AppRoutes'
import { theme } from '@/theme/theme'

const App = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      <SessionProvider>
        <AppRoutes />
      </SessionProvider>
    </BrowserRouter>
  </ThemeProvider>
)

export default App
