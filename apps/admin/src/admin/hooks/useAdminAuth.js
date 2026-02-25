import { useState, useEffect, useCallback } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

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

      // Check if user is in admins/ collection
      try {
        let adminData;
        if (_adminCacheUid === firebaseUser.uid && _adminCache) {
          adminData = _adminCache;
        } else {
          const adminDoc = await getDoc(doc(db, "admins", firebaseUser.uid));
          if (!adminDoc.exists()) {
            // Not an admin — clear state
            setUser(firebaseUser);
            setRole(null);
            setPermissions([]);
            setAuthorized(false);
            setLoading(false);
            return;
          }
          adminData = adminDoc.data();
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
        setUser(firebaseUser);
        setRole(null);
        setPermissions([]);
        setAuthorized(false);
        setLoading(false);
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
