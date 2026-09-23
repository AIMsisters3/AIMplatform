import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import logo from './assets/lg.png';

// Navbar/Footer/AdminLayout are part of the shell on every page, so they
// stay in the main bundle. Every actual page is code-split below — this
// used to be 24 static imports pulled into one bundle up front, so a
// first-time visitor downloaded the entire Shop/Checkout/Admin CMS just to
// see the Home page. React.lazy + Suspense means a route's chunk is only
// fetched when someone actually navigates to it.
import Navbar from './Components/Navbar.jsx';
import Footer from './Components/Footer.jsx';
import AdminLayout from './Admin/Layout/AdminLayout.jsx';

// ---------- Public pages ----------
const Home = lazy(() => import('./Pages/Home.jsx'));
const Content = lazy(() => import('./Pages/Content.jsx'));
const CategoryPage = lazy(() => import('./Pages/CategoryPage.jsx'));
const BibleStudies = lazy(() => import('./Pages/BibleStudies.jsx'));
const BibleStudyDetail = lazy(() => import('./Pages/BibleStudyDetail.jsx'));
const SeriesList = lazy(() => import('./Pages/Series.jsx'));
const SeriesDetail = lazy(() => import('./Pages/SeriesDetail.jsx'));
const Devotions = lazy(() => import('./Pages/Devotions.jsx'));
const Kids = lazy(() => import('./Pages/Kids.jsx'));
const Songs = lazy(() => import('./Pages/Songs.jsx'));
const News = lazy(() => import('./Pages/News.jsx'));
const Gallery = lazy(() => import('./Pages/Gallery.jsx'));
const Shop = lazy(() => import('./Pages/Shop.jsx'));
const ProductDetail = lazy(() => import('./Pages/ProductDetail.jsx'));
const Wishlist = lazy(() => import('./Pages/Wishlist.jsx'));
const Cart = lazy(() => import('./Pages/Cart.jsx'));
const Checkout = lazy(() => import('./Pages/Checkout.jsx'));
const MyOrders = lazy(() => import('./Pages/MyOrders.jsx'));
const OrderDocument = lazy(() => import('./Pages/OrderDocument.jsx'));
const MyBookmarks = lazy(() => import('./Pages/MyBookmarks.jsx'));
const MyNotes = lazy(() => import('./Pages/MyNotes.jsx'));
const NoteDetail = lazy(() => import('./Pages/NoteDetail.jsx'));
const SearchResults = lazy(() => import('./Pages/SearchResults.jsx'));
const About = lazy(() => import('./Pages/About.jsx'));
const Contact = lazy(() => import('./Pages/Contact.jsx'));
const Login = lazy(() => import('./Pages/Login.jsx'));

// ---------- Admin CMS pages ----------
const Dashboard = lazy(() => import('./Admin/Pages/Dashboard.jsx'));
const UploadContent = lazy(() => import('./Admin/Pages/UploadContent.jsx'));
const Testimonials = lazy(() => import('./Admin/Pages/Testimonials.jsx'));
const ManageContent = lazy(() => import('./Admin/Pages/ManageContent.jsx'));
const ManageCategories = lazy(() => import('./Admin/Pages/ManageCategories.jsx'));
const ManageProducts = lazy(() => import('./Admin/Pages/ManageProducts.jsx'));
const ManageSeries = lazy(() => import('./Admin/Pages/ManageSeries.jsx'));
const ManageOrders = lazy(() => import('./Admin/Pages/ManageOrders.jsx'));
const ManageDeliveryAreas = lazy(() => import('./Admin/Pages/ManageDeliveryAreas.jsx'));
const PaymentVerification = lazy(() => import('./Admin/Pages/PaymentVerification.jsx'));
const ShopSettings = lazy(() => import('./Admin/Pages/ShopSettings.jsx'));
const ManageReviews = lazy(() => import('./Admin/Pages/ManageReviews.jsx'));
const ModerateComments = lazy(() => import('./Admin/Pages/ModerateComments.jsx'));
const ManageNewsletter = lazy(() => import('./Admin/Pages/ManageNewsletter.jsx'));
const ManageRoles = lazy(() => import('./Admin/Pages/ManageRoles.jsx'));
const MediaLibrary = lazy(() => import('./Admin/Pages/MediaLibrary.jsx'));
const AIAssistant = lazy(() => import('./Admin/Pages/AIAssistant.jsx'));
const AdminLogin = lazy(() => import('./Admin/Pages/AdminLogin.jsx'));

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

function RouteFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <img
        src={logo}
        alt="Loading"
        className="w-12 h-12 rounded-full object-cover shadow-glass animate-spin"
        style={{ animationDuration: '1.1s' }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* ---------- Public site ---------- */}
            <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
            <Route path="/content" element={<PublicLayout><Content /></PublicLayout>} />
            <Route path="/category/:id" element={<PublicLayout><CategoryPage /></PublicLayout>} />
            <Route path="/bible-studies" element={<PublicLayout><BibleStudies /></PublicLayout>} />
            <Route path="/bible-studies/:slugOrId" element={<PublicLayout><BibleStudyDetail /></PublicLayout>} />
            <Route path="/series" element={<PublicLayout><SeriesList /></PublicLayout>} />
            <Route path="/series/:slugOrId" element={<PublicLayout><SeriesDetail /></PublicLayout>} />
            <Route path="/devotions" element={<PublicLayout><Devotions /></PublicLayout>} />
            <Route path="/kids" element={<PublicLayout><Kids /></PublicLayout>} />
            <Route path="/songs" element={<PublicLayout><Songs /></PublicLayout>} />
            <Route path="/news" element={<PublicLayout><News /></PublicLayout>} />
            <Route path="/gallery" element={<PublicLayout><Gallery /></PublicLayout>} />
            <Route path="/shop" element={<PublicLayout><Shop /></PublicLayout>} />
            <Route path="/shop/:slug" element={<PublicLayout><ProductDetail /></PublicLayout>} />
            <Route path="/wishlist" element={<PublicLayout><RequireAuth><Wishlist /></RequireAuth></PublicLayout>} />
            <Route path="/cart" element={<PublicLayout><Cart /></PublicLayout>} />
            <Route path="/checkout" element={<PublicLayout><Checkout /></PublicLayout>} />
            <Route path="/orders" element={<PublicLayout><RequireAuth><MyOrders /></RequireAuth></PublicLayout>} />
            <Route path="/orders/:id/document" element={<RequireAuth><OrderDocument /></RequireAuth>} />
            <Route path="/bookmarks" element={<PublicLayout><RequireAuth><MyBookmarks /></RequireAuth></PublicLayout>} />
            <Route path="/notes" element={<PublicLayout><RequireAuth><MyNotes /></RequireAuth></PublicLayout>} />
            <Route path="/notes/:id" element={<RequireAuth><NoteDetail /></RequireAuth>} />
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
              <Route path="categories" element={<ManageCategories />} />
              <Route path="products" element={<ManageProducts />} />
              <Route path="series" element={<ManageSeries />} />
              <Route path="orders" element={<ManageOrders />} />
              <Route path="delivery-areas" element={<ManageDeliveryAreas />} />
              <Route path="payments" element={<PaymentVerification />} />
              <Route path="shop-settings" element={<ShopSettings />} />
              <Route path="reviews" element={<ManageReviews />} />
              <Route path="comments" element={<ModerateComments />} />
              <Route path="newsletter" element={<ManageNewsletter />} />
              <Route path="roles" element={<ManageRoles />} />
              <Route path="testimonials" element={<Testimonials />} />
              <Route path="media" element={<MediaLibrary />} />
              <Route path="ai-assistant" element={<AIAssistant />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </CartProvider>
    </AuthProvider>
  );
}
