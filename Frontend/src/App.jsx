import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';

// Public layout + pages
import Navbar from './Components/Navbar.jsx';
import Footer from './Components/Footer.jsx';
import Home from './Pages/Home.jsx';
import Content from './Pages/Content.jsx';
import BibleStudies from './Pages/BibleStudies.jsx';
import BibleStudyDetail from './Pages/BibleStudyDetail.jsx';
import SeriesList from './Pages/Series.jsx';
import SeriesDetail from './Pages/SeriesDetail.jsx';
import Devotions from './Pages/Devotions.jsx';
import News from './Pages/News.jsx';
import Gallery from './Pages/Gallery.jsx';
import Shop from './Pages/Shop.jsx';
import Cart from './Pages/Cart.jsx';
import Checkout from './Pages/Checkout.jsx';
import MyOrders from './Pages/MyOrders.jsx';
import MyBookmarks from './Pages/MyBookmarks.jsx';
import SearchResults from './Pages/SearchResults.jsx';
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
import ManageSeries from './Admin/Pages/ManageSeries.jsx';
import ManageOrders from './Admin/Pages/ManageOrders.jsx';
import ModerateComments from './Admin/Pages/ModerateComments.jsx';
import ManageNewsletter from './Admin/Pages/ManageNewsletter.jsx';
import ManageRoles from './Admin/Pages/ManageRoles.jsx';
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

function RequireAuth({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Routes>
          {/* ---------- Public site ---------- */}
          <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
          <Route path="/content" element={<PublicLayout><Content /></PublicLayout>} />
          <Route path="/bible-studies" element={<PublicLayout><BibleStudies /></PublicLayout>} />
          <Route path="/bible-studies/:slugOrId" element={<PublicLayout><BibleStudyDetail /></PublicLayout>} />
          <Route path="/series" element={<PublicLayout><SeriesList /></PublicLayout>} />
          <Route path="/series/:slugOrId" element={<PublicLayout><SeriesDetail /></PublicLayout>} />
          <Route path="/devotions" element={<PublicLayout><Devotions /></PublicLayout>} />
          <Route path="/news" element={<PublicLayout><News /></PublicLayout>} />
          <Route path="/gallery" element={<PublicLayout><Gallery /></PublicLayout>} />
          <Route path="/shop" element={<PublicLayout><Shop /></PublicLayout>} />
          <Route path="/cart" element={<PublicLayout><Cart /></PublicLayout>} />
          <Route path="/checkout" element={<PublicLayout><Checkout /></PublicLayout>} />
          <Route path="/orders" element={<PublicLayout><RequireAuth><MyOrders /></RequireAuth></PublicLayout>} />
          <Route path="/bookmarks" element={<PublicLayout><RequireAuth><MyBookmarks /></RequireAuth></PublicLayout>} />
          <Route path="/search" element={<PublicLayout><SearchResults /></PublicLayout>} />
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
            <Route path="series" element={<ManageSeries />} />
            <Route path="orders" element={<ManageOrders />} />
            <Route path="comments" element={<ModerateComments />} />
            <Route path="newsletter" element={<ManageNewsletter />} />
            <Route path="roles" element={<ManageRoles />} />
            <Route path="testimonials" element={<Testimonials />} />
            <Route path="media" element={<MediaLibrary />} />
            <Route path="ai-assistant" element={<AIAssistant />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CartProvider>
    </AuthProvider>
  );
}
