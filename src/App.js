import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainPage from './pages/MainPage'
import RawDataPage from './pages/RawDataPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/raw-data" element={<RawDataPage />} />
      </Routes>
    </BrowserRouter>
  )
}
