import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

// Public layout + pages
import Navbar from './Components/Navbar.jsx';
import Footer from './Components/Footer.jsx';
import Home from './Pages/Home.jsx';
import Content from './Pages/Content.jsx';
import BibleStudies from './Pages/BibleStudies.jsx';
import Devotions from './Pages/Devotions.jsx';
import News from './Pages/News.jsx';
import Gallery from './Pages/Gallery.jsx';
import Shop from './Pages/Shop.jsx';
import About from './Pages/About.jsx';
import Contact from './Pages/Contact.jsx';
import Login from './Pages/Login.jsx';

// Admin layout + pages
import AdminLayout from './Admin/Layout/AdminLayout.jsx';
import Dashboard from './Admin/Pages/Dashboard.jsx';
import UploadContent from './Admin/Pages/UploadContent.jsx';
import Testimonials from './Admin/Pages/Testimonials.jsx';
import ManageContent from './Admin/Pages/ManageContent.jsx';
import ManageProducts from './Admin/Pages/ManageProducts.jsx';
import MediaLibrary from './Admin/Pages/MediaLibrary.jsx';
import AIAssistant from './Admin/Pages/AIAssistant.jsx';
import AdminLogin from './Admin/Pages/AdminLogin.jsx';

function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function RequireAdmin({ children }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/admin/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ---------- Public site ---------- */}
        <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
        <Route path="/content" element={<PublicLayout><Content /></PublicLayout>} />
        <Route path="/bible-studies" element={<PublicLayout><BibleStudies /></PublicLayout>} />
        <Route path="/devotions" element={<PublicLayout><Devotions /></PublicLayout>} />
        <Route path="/news" element={<PublicLayout><News /></PublicLayout>} />
        <Route path="/gallery" element={<PublicLayout><Gallery /></PublicLayout>} />
        <Route path="/shop" element={<PublicLayout><Shop /></PublicLayout>} />
        <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
        <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
        <Route path="/login" element={<PublicLayout><Login /></PublicLayout>} />

        {/* ---------- Admin CMS (separate shell, no public navbar/footer) ---------- */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="upload" element={<UploadContent />} />
          <Route path="content" element={<ManageContent />} />
          <Route path="products" element={<ManageProducts />} />
          <Route path="testimonials" element={<Testimonials />} />
          <Route path="media" element={<MediaLibrary />} />
          <Route path="ai-assistant" element={<AIAssistant />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
