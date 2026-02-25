import { useState, useEffect, useCallback } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

const ROLE_PERMISSIONS = {
  owner: ["all"],
  admin: [
    "dashboard",
    "campaigns",
    "monitoring",
    "pipeline",
    "communications",
  ],
  viewer: ["dashboard"],
};

// Cache admin doc to avoid repeated Firestore reads within a session
let _adminCache = null;
let _adminCacheUid = null;

export default function useAdminAuth() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setPermissions([]);
        setAuthorized(false);
        setLoading(false);
        _adminCache = null;
        _adminCacheUid = null;
        return;
      }

      // Check if user is in admins/ collection (by UID, then by email)
      try {
        let adminData;
        if (_adminCacheUid === firebaseUser.uid && _adminCache) {
          adminData = _adminCache;
        } else {
          // Try lookup by UID first
          const adminDoc = await getDoc(doc(db, "admins", firebaseUser.uid));
          if (adminDoc.exists()) {
            adminData = adminDoc.data();
          } else {
            // UID not found — try query by email (handles Google SSO UID mismatch)
            const emailQuery = query(
              collection(db, "admins"),
              where("email", "==", firebaseUser.email)
            );
            const emailSnap = await getDocs(emailQuery);
            if (!emailSnap.empty) {
              adminData = emailSnap.docs[0].data();
            } else {
              // Not an admin — clear state
              setUser(firebaseUser);
              setRole(null);
              setPermissions([]);
              setAuthorized(false);
              setLoading(false);
              return;
            }
          }
          _adminCache = adminData;
          _adminCacheUid = firebaseUser.uid;
        }

        const userRole = adminData.role || "viewer";
        const userPermissions =
          adminData.permissions ||
          ROLE_PERMISSIONS[userRole] ||
          [];

        setUser(firebaseUser);
        setRole(userRole);
        setPermissions(userPermissions);
        setAuthorized(true);
        setLoading(false);
      } catch (err) {
        console.error("Admin auth check failed:", err);
        // Firestore rules may block client reads — fall back to known admin emails
        const ADMIN_EMAILS = ["seanlcombs@gmail.com", "sean@titleapp.ai", "kent@titleapp.ai"];
        if (ADMIN_EMAILS.includes(firebaseUser.email)) {
          const fallbackRole = firebaseUser.email === "kent@titleapp.ai" ? "admin" : "owner";
          _adminCache = { role: fallbackRole, permissions: ROLE_PERMISSIONS[fallbackRole] };
          _adminCacheUid = firebaseUser.uid;
          setUser(firebaseUser);
          setRole(fallbackRole);
          setPermissions(ROLE_PERMISSIONS[fallbackRole]);
          setAuthorized(true);
          setLoading(false);
        } else {
          setUser(firebaseUser);
          setRole(null);
          setPermissions([]);
          setAuthorized(false);
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const hasPermission = useCallback(
    (permission) => {
      if (!authorized) return false;
      if (permissions.includes("all")) return true;
      return permissions.includes(permission);
    },
    [authorized, permissions]
  );

  return { user, role, permissions, loading, authorized, hasPermission };
}
