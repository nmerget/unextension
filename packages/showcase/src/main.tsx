import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Home } from './routes'
import { Panel } from './routes/panel'
import { Editor } from './routes/editor'
import './main.css'

declare global {
  interface Window {
    __UNEXTENSION_ROUTE__?: string
  }
}

const initialRoute = window.__UNEXTENSION_ROUTE__ ?? '/'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/panel" element={<Panel />} />
        <Route path="/editor" element={<Editor />} />
      </Routes>
    </MemoryRouter>
  </StrictMode>,
)
