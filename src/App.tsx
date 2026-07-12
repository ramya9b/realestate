import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Properties from './pages/Properties'
import PropertyDetail from './pages/PropertyDetail'
import PostProperty from './pages/PostProperty'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/property/:id" element={<PropertyDetail />} />
        <Route path="/post-property" element={<PostProperty />} />
      </Routes>
    </BrowserRouter>
  )
}
