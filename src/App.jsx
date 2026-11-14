import { Routes, Route, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import CartDrawer from "./components/CartDrawer.jsx";
import Home from "./pages/Home.jsx";
import Library from "./pages/Library.jsx";
import AuthorsPage from "./pages/AuthorsPage.jsx";
import Auth from "./pages/Auth.jsx";

// Admin dashboard is code-split so storefront visitors never download it.
const AdminApp = lazy(() => import("./admin/AdminApp.jsx"));

export default function App() {
  const { pathname } = useLocation();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  if (isAdmin) {
    return (
      <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Loading admin…</div>}>
        <AdminApp />
      </Suspense>
    );
  }

  return (
      <>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/library" element={<Library />} />
            <Route path="/authors" element={<AuthorsPage />} />
            <Route path="/sign-in" element={<Auth mode="signin" />} />
            <Route path="/register" element={<Auth mode="register" />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
        <Footer />
        <CartDrawer />
      </>
  );
}
