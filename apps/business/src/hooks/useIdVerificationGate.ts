import { useState } from "react";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export function needsIdVerification(type: string, metadata: any): boolean {
  if (type === "vehicle") return true;
  const val = parseFloat(String(metadata?.estimatedValue || "0").replace(/[$,]/g, ""));
  return val > 5000;
}

export default function useIdVerificationGate() {
  const [showModal, setShowModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  async function checkIdVerification(): Promise<boolean> {
    const auth = getAuth();
    const db = getFirestore();
    const user = auth.currentUser;
    if (!user) return false;

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) return false;

      const data = userDoc.data();
      if (!data.idVerified) return false;

      if (data.idVerifiedAt) {
        const verifiedDate = new Date(data.idVerifiedAt);
        const now = new Date();
        const daysDiff = (now.getTime() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > 365) return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  async function gateAction(type: string, metadata: any, action: () => void): Promise<void> {
    if (!needsIdVerification(type, metadata)) {
      action();
      return;
    }

    const verified = await checkIdVerification();
    if (verified) {
      action();
    } else {
      setPendingAction(() => action);
      setShowModal(true);
    }
  }

  function onVerified() {
    setShowModal(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }

  function onClose() {
    setShowModal(false);
    setPendingAction(null);
  }

  return { showModal, gateAction, onVerified, onClose, checkIdVerification };
}
