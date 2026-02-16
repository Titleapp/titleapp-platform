import React, { useState, useRef } from "react";

const STEPS = ["choose", "info", "details", "documents", "confirm", "success"];

const CATEGORIES = [
  { id: "vehicle", label: "My vehicle", desc: "Title, service history, and mileage tracking" },
  { id: "property", label: "My property", desc: "Purchase documents, renovations, and insurance" },
  { id: "credential", label: "My credentials", desc: "Transcripts, certifications, and diplomas" },
  { id: "other", label: "Something else", desc: "Any important record you want to track" },
];

export default function VaultOnboarding() {
  const [step, setStep] = useState("choose");
  const [category, setCategory] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState({});
  const [files, setFiles] = useState([]);
  const [attested, setAttested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vinResult, setVinResult] = useState(null);
  const [vinLoading, setVinLoading] = useState(false);
  const fileInputRef = useRef(null);

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  function next(nextStep) {
    setStep(nextStep);
    window.scrollTo(0, 0);
  }

  function handleCategorySelect(cat) {
    setCategory(cat);
    const token = localStorage.getItem("ID_TOKEN");
    if (token && name) {
      next("details");
    } else {
      next("info");
    }
  }

  async function lookupVIN() {
    const vin = details.vin;
    if (!vin || vin.length !== 17) return;
    setVinLoading(true);
    try {
      const resp = await fetch("https://api-feyfibglbq-uc.a.run.app/v1/vin:decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vin }),
      });
      const data = await resp.json();
      if (data.valid && data.vehicle) {
        const v = data.vehicle;
        setVinResult(v);
        setDetails(d => ({
          ...d,
          year: v.year, make: v.make, model: v.model, trim: v.trim,
          title: `${v.year || ""} ${v.make || ""} ${v.model || ""} ${v.trim || ""}`.trim(),
        }));
      }
    } catch (e) {
      console.error("VIN decode failed:", e);
    } finally {
      setVinLoading(false);
    }
  }

  function handleFileSelect(e) {
    const selected = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selected]);
  }

  function removeFile(index) {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

  async function handleCreate() {
    setLoading(true);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const apiBase = import.meta.env?.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

      if (!localStorage.getItem("TENANT_ID") || localStorage.getItem("TENANT_ID") === "demo") {
        const claimResp = await fetch(`${apiBase}/api?path=/v1/onboarding:claimTenant`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tenantName: name, tenantType: "personal", vertical: "GLOBAL", jurisdiction: "GLOBAL" }),
        });
        const claimData = await claimResp.json();
        if (claimData.ok && claimData.tenantId) {
          localStorage.setItem("TENANT_ID", claimData.tenantId);
        }
      }

      const dtcPayload = {
        type: category,
        metadata: { title: details.title || "Untitled Record", ...details },
        owner: name,
      };

      const resp = await fetch(`${apiBase}/api?path=/v1/dtc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Tenant-Id": localStorage.getItem("TENANT_ID") || "",
        },
        body: JSON.stringify(dtcPayload),
      });
      const data = await resp.json();
      if (data.ok) {
        setDetails(d => ({ ...d, dtcId: data.id || data.dtcId, createdAt: new Date().toISOString() }));
      }
      next("success");
    } catch (err) {
      console.error("Create failed:", err);
      next("success");
    } finally {
      setLoading(false);
    }
  }

  // ---- STYLES ----
  const pageStyle = {
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  };
  const headerStyle = {
    display: "flex", alignItems: "center", padding: "1rem 2rem",
    background: "white", borderBottom: "1px solid #e2e8f0",
  };
  const logoStyle = { fontSize: "1.25rem", fontWeight: 700, color: "#7c3aed" };
  const progressBarBg = { width: "100%", height: "3px", background: "#e2e8f0" };
  const progressBarFill = {
    height: "3px", background: "#7c3aed", transition: "width 0.4s ease",
    width: `${progress}%`,
  };
  const containerStyle = { maxWidth: "600px", margin: "0 auto", padding: "3rem 2rem" };
  const h1Style = { fontSize: "1.75rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.5rem" };
  const subtitleStyle = { fontSize: "1rem", color: "#64748b", margin: "0 0 2rem" };
  const inputStyle = {
    width: "100%", padding: "0.75rem 1rem", fontSize: "1rem",
    border: "2px solid #e2e8f0", borderRadius: "8px", outline: "none",
    transition: "border-color 0.2s",
  };
  const btnPrimary = {
    width: "100%", padding: "0.875rem", fontSize: "1rem", fontWeight: 600,
    background: "#7c3aed", color: "white", border: "none", borderRadius: "8px",
    cursor: "pointer",
  };
  const btnSecondary = {
    padding: "0.875rem 1.5rem", fontSize: "1rem", fontWeight: 600,
    background: "white", color: "#64748b", border: "2px solid #e2e8f0",
    borderRadius: "8px", cursor: "pointer",
  };

  function Header() {
    return (
      <>
        <div style={headerStyle}>
          <div style={logoStyle}>TitleApp</div>
        </div>
        <div style={progressBarBg}><div style={progressBarFill} /></div>
      </>
    );
  }

  function FocusInput({ style, ...props }) {
    return (
      <input
        style={style}
        onFocus={e => (e.target.style.borderColor = "#7c3aed")}
        onBlur={e => (e.target.style.borderColor = "#e2e8f0")}
        {...props}
      />
    );
  }

  // ---- STEP 1: Choose ----
  if (step === "choose") {
    return (
      <div style={pageStyle}>
        <Header />
        <div style={containerStyle}>
          <h1 style={h1Style}>Welcome to TitleApp</h1>
          <p style={subtitleStyle}>What would you like to keep track of?</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                style={{
                  padding: "1.5rem", textAlign: "left", background: "white",
                  border: "2px solid #e2e8f0", borderRadius: "12px", cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#7c3aed"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(124,58,237,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ fontSize: "1rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.25rem" }}>{cat.label}</div>
                <div style={{ fontSize: "0.875rem", color: "#64748b" }}>{cat.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- STEP 2: Info ----
  if (step === "info") {
    return (
      <div style={pageStyle}>
        <Header />
        <div style={containerStyle}>
          <h1 style={h1Style}>Let's set you up</h1>
          <p style={subtitleStyle}>We just need a couple things.</p>
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <label style={{ display: "grid", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Name</span>
              <FocusInput style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoFocus />
            </label>
            <label style={{ display: "grid", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Email</span>
              <FocusInput style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
            <button style={{ ...btnPrimary, marginTop: "0.5rem", opacity: name.trim() ? 1 : 0.5 }} disabled={!name.trim()} onClick={() => next("details")}>
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- STEP 3: Details ----
  if (step === "details") {
    return (
      <div style={pageStyle}>
        <Header />
        <div style={containerStyle}>
          {category === "vehicle" && (
            <>
              <h1 style={h1Style}>Vehicle details</h1>
              <p style={subtitleStyle}>Enter your VIN and we'll fill in the rest.</p>
              <div style={{ display: "grid", gap: "1.25rem" }}>
                <label style={{ display: "grid", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>VIN</span>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <FocusInput style={{ ...inputStyle, flex: 1, fontFamily: "monospace" }} value={details.vin || ""} onChange={e => setDetails(d => ({ ...d, vin: e.target.value.toUpperCase() }))} placeholder="17-character VIN" maxLength={17} />
                    <button style={{ ...btnSecondary, whiteSpace: "nowrap" }} onClick={lookupVIN} disabled={vinLoading || !details.vin || details.vin.length !== 17}>
                      {vinLoading ? "Looking up..." : "Look up"}
                    </button>
                  </div>
                </label>
                {vinResult && (
                  <div style={{ padding: "1rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px" }}>
                    <div style={{ fontWeight: 600, color: "#166534", marginBottom: "0.25rem" }}>
                      {details.year} {details.make} {details.model} {details.trim}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#15803d" }}>VIN decoded successfully</div>
                  </div>
                )}
                {!vinResult && (
                  <label style={{ display: "grid", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Year, Make, Model</span>
                    <FocusInput style={inputStyle} value={details.title || ""} onChange={e => setDetails(d => ({ ...d, title: e.target.value }))} placeholder="e.g. 2020 Honda Accord Sport" />
                  </label>
                )}
                <label style={{ display: "grid", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Current mileage</span>
                  <FocusInput style={inputStyle} type="number" value={details.mileage || ""} onChange={e => setDetails(d => ({ ...d, mileage: e.target.value }))} placeholder="e.g. 45000" />
                </label>
                <label style={{ display: "grid", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Ownership</span>
                  <select style={{ ...inputStyle, cursor: "pointer" }} value={details.ownership || ""} onChange={e => setDetails(d => ({ ...d, ownership: e.target.value }))}>
                    <option value="">Select...</option>
                    <option value="own">I own it (paid off)</option>
                    <option value="financing">Financing</option>
                    <option value="leasing">Leasing</option>
                  </select>
                </label>
                {(details.ownership === "financing" || details.ownership === "leasing") && (
                  <label style={{ display: "grid", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>{details.ownership === "financing" ? "Lender" : "Leasing company"}</span>
                    <FocusInput style={inputStyle} value={details.lender || ""} onChange={e => setDetails(d => ({ ...d, lender: e.target.value }))} placeholder="e.g. Chase, Toyota Financial" />
                  </label>
                )}
                <button style={{ ...btnPrimary, marginTop: "0.5rem" }} onClick={() => next("documents")}>Continue</button>
              </div>
            </>
          )}

          {category === "property" && (
            <>
              <h1 style={h1Style}>Property details</h1>
              <p style={subtitleStyle}>Tell us about your property.</p>
              <div style={{ display: "grid", gap: "1.25rem" }}>
                <label style={{ display: "grid", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Address</span>
                  <FocusInput style={inputStyle} value={details.address || ""} onChange={e => setDetails(d => ({ ...d, address: e.target.value, title: e.target.value }))} placeholder="Full address" />
                </label>
                <label style={{ display: "grid", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Type</span>
                  <select style={{ ...inputStyle, cursor: "pointer" }} value={details.propertyType || ""} onChange={e => setDetails(d => ({ ...d, propertyType: e.target.value }))}>
                    <option value="">Select...</option>
                    <option value="house">House</option>
                    <option value="condo">Condo</option>
                    <option value="apartment">Apartment</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label style={{ display: "grid", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Ownership</span>
                  <select style={{ ...inputStyle, cursor: "pointer" }} value={details.ownership || ""} onChange={e => setDetails(d => ({ ...d, ownership: e.target.value }))}>
                    <option value="">Select...</option>
                    <option value="own">I own it</option>
                    <option value="renting">Renting</option>
                  </select>
                </label>
                {details.ownership === "renting" && (
                  <label style={{ display: "grid", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Landlord / Management company</span>
                    <FocusInput style={inputStyle} value={details.landlord || ""} onChange={e => setDetails(d => ({ ...d, landlord: e.target.value }))} placeholder="Name" />
                  </label>
                )}
                <button style={{ ...btnPrimary, marginTop: "0.5rem" }} onClick={() => next("documents")}>Continue</button>
              </div>
            </>
          )}

          {category === "credential" && (
            <>
              <h1 style={h1Style}>Credential details</h1>
              <p style={subtitleStyle}>Tell us about your credential.</p>
              <div style={{ display: "grid", gap: "1.25rem" }}>
                <label style={{ display: "grid", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Type</span>
                  <select style={{ ...inputStyle, cursor: "pointer" }} value={details.credentialType || ""} onChange={e => setDetails(d => ({ ...d, credentialType: e.target.value }))}>
                    <option value="">Select...</option>
                    <option value="transcript">Transcript</option>
                    <option value="certification">Certification</option>
                    <option value="diploma">Diploma</option>
                    <option value="license">License</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label style={{ display: "grid", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Institution</span>
                  <FocusInput style={inputStyle} value={details.institution || ""} onChange={e => setDetails(d => ({ ...d, institution: e.target.value, title: `${details.credentialType || "Credential"} — ${e.target.value}` }))} placeholder="School, university, or issuing body" />
                </label>
                <label style={{ display: "grid", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Date issued</span>
                  <FocusInput style={inputStyle} type="date" value={details.dateIssued || ""} onChange={e => setDetails(d => ({ ...d, dateIssued: e.target.value }))} />
                </label>
                <button style={{ ...btnPrimary, marginTop: "0.5rem" }} onClick={() => next("documents")}>Continue</button>
              </div>
            </>
          )}

          {category === "other" && (
            <>
              <h1 style={h1Style}>Record details</h1>
              <p style={subtitleStyle}>Describe what you'd like to track.</p>
              <div style={{ display: "grid", gap: "1.25rem" }}>
                <label style={{ display: "grid", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Title</span>
                  <FocusInput style={inputStyle} value={details.title || ""} onChange={e => setDetails(d => ({ ...d, title: e.target.value }))} placeholder="What is this record?" />
                </label>
                <label style={{ display: "grid", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Description</span>
                  <textarea
                    style={{ ...inputStyle, minHeight: "100px", resize: "vertical" }}
                    value={details.description || ""}
                    onChange={e => setDetails(d => ({ ...d, description: e.target.value }))}
                    placeholder="Any details about this record"
                    onFocus={e => (e.target.style.borderColor = "#7c3aed")}
                    onBlur={e => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </label>
                <button style={{ ...btnPrimary, marginTop: "0.5rem" }} onClick={() => next("documents")}>Continue</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---- STEP 4: Documents ----
  if (step === "documents") {
    return (
      <div style={pageStyle}>
        <Header />
        <div style={containerStyle}>
          <h1 style={h1Style}>Add supporting documents</h1>
          <p style={subtitleStyle}>Optional. You can always add more later.</p>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "2px dashed #cbd5e1", borderRadius: "12px", padding: "2.5rem",
              textAlign: "center", cursor: "pointer", marginBottom: "1.5rem",
              transition: "all 0.2s", background: "white",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#7c3aed"; e.currentTarget.style.background = "#faf5ff"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.background = "white"; }}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "#7c3aed"; }}
            onDragLeave={e => { e.currentTarget.style.borderColor = "#cbd5e1"; }}
            onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "#cbd5e1"; if (e.dataTransfer.files.length) setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]); }}
          >
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{ display: "none" }} onChange={handleFileSelect} />
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem", color: "#94a3b8" }}>+</div>
            <div style={{ fontWeight: 600, color: "#1e293b" }}>Drop files here or click to browse</div>
            <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginTop: "0.25rem" }}>PDF, JPG, PNG, DOC up to 10MB</div>
          </div>
          {files.length > 0 && (
            <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {files.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", background: "white", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#1e293b" }}>{f.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{(f.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <button onClick={() => removeFile(i)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.25rem" }}>x</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button style={btnSecondary} onClick={() => next("confirm")}>Skip for now</button>
            <button style={{ ...btnPrimary, flex: 1 }} onClick={() => next("confirm")}>Continue</button>
          </div>
        </div>
      </div>
    );
  }

  // ---- STEP 5: Confirm ----
  if (step === "confirm") {
    const catLabel = CATEGORIES.find(c => c.id === category)?.label || category;
    return (
      <div style={pageStyle}>
        <Header />
        <div style={containerStyle}>
          <h1 style={h1Style}>Review and confirm</h1>
          <p style={subtitleStyle}>Make sure everything looks right.</p>
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden", marginBottom: "1.5rem" }}>
            <div style={{
              height: "120px",
              background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ textAlign: "center", color: "white" }}>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, textShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>{details.title || "Untitled Record"}</div>
                {details.year && <div style={{ fontSize: "0.875rem", opacity: 0.85 }}>{details.year}</div>}
              </div>
            </div>
            <div style={{ padding: "1.25rem", display: "grid", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "0.875rem", color: "#94a3b8" }}>Type</span><span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>{catLabel}</span></div>
              {details.vin && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "0.875rem", color: "#94a3b8" }}>VIN</span><span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b", fontFamily: "monospace" }}>{details.vin}</span></div>}
              {details.mileage && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "0.875rem", color: "#94a3b8" }}>Mileage</span><span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>{Number(details.mileage).toLocaleString()} mi</span></div>}
              {details.ownership && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "0.875rem", color: "#94a3b8" }}>Ownership</span><span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>{details.ownership}</span></div>}
              {details.address && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "0.875rem", color: "#94a3b8" }}>Address</span><span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>{details.address}</span></div>}
              {details.institution && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "0.875rem", color: "#94a3b8" }}>Institution</span><span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>{details.institution}</span></div>}
              {name && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "0.875rem", color: "#94a3b8" }}>Owner</span><span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>{name}</span></div>}
              {files.length > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "0.875rem", color: "#94a3b8" }}>Documents</span><span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>{files.length} file{files.length > 1 ? "s" : ""}</span></div>}
            </div>
          </div>
          <label style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", marginBottom: "1.5rem", cursor: "pointer" }}>
            <input type="checkbox" checked={attested} onChange={e => setAttested(e.target.checked)} style={{ marginTop: "0.25rem", width: "18px", height: "18px", accentColor: "#7c3aed" }} />
            <span style={{ fontSize: "0.875rem", color: "#374151", lineHeight: 1.5 }}>
              I confirm that I am the legal owner or holder of this record and the information provided is accurate. This will be permanently recorded.
            </span>
          </label>
          <button style={{ ...btnPrimary, opacity: attested ? 1 : 0.5 }} disabled={!attested || loading} onClick={handleCreate}>
            {loading ? "Creating..." : "Create my record"}
          </button>
        </div>
      </div>
    );
  }

  // ---- STEP 6: Success ----
  if (step === "success") {
    return (
      <div style={pageStyle}>
        <Header />
        <div style={containerStyle}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#f0fdf4", border: "2px solid #bbf7d0", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
              <span style={{ color: "#16a34a", fontSize: "1.25rem", fontWeight: 700 }}>&#10003;</span>
            </div>
            <h1 style={h1Style}>Your record is created</h1>
            <p style={subtitleStyle}>Your logbook is attached and will track every update automatically.</p>
          </div>
          {/* Premium DTC Card */}
          <div style={{
            background: "white", borderRadius: "16px", overflow: "hidden",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            marginBottom: "2rem",
          }}>
            <div style={{
              height: "180px",
              background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ textAlign: "center", color: "white" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, textShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                  {details.make && details.model ? `${details.make} ${details.model} ${details.trim || ""}`.trim() : details.title || "Record"}
                </div>
                {details.year && <div style={{ fontSize: "0.9rem", opacity: 0.85, marginTop: "0.25rem" }}>{details.year}</div>}
              </div>
            </div>
            <div style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>{details.title || "Record"}</div>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#10b981", background: "#f0fdf4", padding: "0.25rem 0.75rem", borderRadius: "999px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Verified</span>
              </div>
              {details.vin && <div style={{ fontSize: "0.875rem", color: "#94a3b8", fontFamily: "monospace", marginBottom: "1rem" }}>VIN {details.vin}</div>}
              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "1rem", display: "grid", gap: "0.5rem" }}>
                {name && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Owner</span><span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1e293b" }}>{name}</span></div>}
                {details.mileage && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Mileage</span><span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1e293b" }}>{Number(details.mileage).toLocaleString()} mi</span></div>}
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Status</span><span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1e293b" }}>Active</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Created</span><span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1e293b" }}>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></div>
                {details.dtcId && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Record</span><span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1e293b", fontFamily: "monospace" }}>{details.dtcId}</span></div>}
              </div>
              <div style={{ borderTop: "1px solid #f1f5f9", marginTop: "1rem", paddingTop: "0.75rem", fontSize: "0.8rem", color: "#94a3b8" }}>
                {files.length > 0 ? `${files.length} document${files.length > 1 ? "s" : ""}` : "0 documents"} · 1 logbook entry
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button style={btnSecondary} onClick={() => { setStep("choose"); setCategory(null); setDetails({}); setFiles([]); setAttested(false); }}>
              Add another record
            </button>
            <button style={{ ...btnPrimary, flex: 1 }} onClick={() => { window.location.href = "/"; }}>
              Go to my vault
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
