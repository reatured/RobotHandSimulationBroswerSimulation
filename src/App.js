import { HashRouter, Routes, Route } from 'react-router-dom'
import MainPage from './pages/MainPage'
import RawDataPage from './pages/RawDataPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/raw-data" element={<RawDataPage />} />
      </Routes>
    </HashRouter>
  )
}
