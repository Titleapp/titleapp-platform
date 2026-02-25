import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function DigestView() {
  const [digest, setDigest] = useState(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const unsub = onSnapshot(doc(db, "dailyDigest", today), (snap) => {
      if (snap.exists()) setDigest(snap.data());
    });
    return () => unsub();
  }, []);

  if (!digest) {
    return <div className="ac-empty">No digest for today yet. Generates at 7:00 AM PST.</div>;
  }

  return (
    <div>
      <pre style={{
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: "13px",
        lineHeight: "1.6",
        whiteSpace: "pre-wrap",
        color: "#334155",
        margin: 0,
      }}>
        {digest.text}
      </pre>
      {digest.generatedAt && (
        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "12px" }}>
          Generated: {digest.generatedAt.toDate ? digest.generatedAt.toDate().toLocaleString() : ""}
        </div>
      )}
    </div>
  );
}
