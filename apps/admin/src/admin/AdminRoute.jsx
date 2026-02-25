import React from "react";
import useAdminAuth from "./hooks/useAdminAuth";
import AdminLogin from "./AdminLogin";

/**
 * Route guard for /admin/*
 * 1. Check Firebase Auth token
 * 2. Check admins/ collection
 * 3. Check role permissions
 * 4. Fail silently — redirect to main site (no hint admin exists)
 */
export default function AdminRoute({ requiredPermission, children }) {
  const { user, loading, authorized, hasPermission } = useAdminAuth();

  // Still checking auth state
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b1020",
      }}>
        <div style={{
          width: "32px",
          height: "32px",
          border: "3px solid rgba(124,58,237,0.3)",
          borderTopColor: "#7c3aed",
          borderRadius: "50%",
          animation: "adminSpin 0.6s linear infinite",
        }} />
        <style>{`@keyframes adminSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not logged in — show minimal login (no admin branding before auth)
  if (!user) {
    return <AdminLogin />;
  }

  // Logged in but not in admins/ collection — redirect silently
  if (!authorized) {
    window.location.href = "/";
    return null;
  }

  // Check specific permission if required
  if (requiredPermission && !hasPermission(requiredPermission)) {
    window.location.href = "/";
    return null;
  }

  return children;
}
