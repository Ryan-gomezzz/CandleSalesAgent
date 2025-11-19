import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Landing from './pages/Landing';
import Enquiry from './pages/Enquiry';
import Admin from './pages/Admin';

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-cream text-brand-brown">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/enquiry" element={<Enquiry />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;


