import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Home } from './routes/index'
import { Panel } from './routes/panel'

const initialRoute = (window as any).__UNEXTENSION_ROUTE__ ?? '/'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/panel" element={<Panel />} />
      </Routes>
    </MemoryRouter>
  </StrictMode>
)
