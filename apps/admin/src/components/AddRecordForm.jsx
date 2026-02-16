import React, { useState } from "react";
import "./AddRecordForm.css";

/**
 * AddRecordForm - Enhanced inline form for adding educational/professional records
 * Features: autocomplete, file upload, multi-record flow
 */
export default function AddRecordForm({ onSave, onCancel, onAddAnother }) {
  const [formData, setFormData] = useState({
    recordType: "college",
    name: "",
    address: "",
    degree: "",
    field: "",
    graduationDate: "",
    gpa: "",
  });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);

  // Mock institution database (in production, this would be an API call)
  const INSTITUTIONS = [
    "University of Illinois at Urbana-Champaign",
    "Northwestern University",
    "University of Chicago",
    "Illinois Institute of Technology",
    "DePaul University",
    "Loyola University Chicago",
    "Southern Illinois University",
    "Northern Illinois University",
    "Eastern Illinois University",
    "Western Illinois University",
    "Harvard University",
    "Stanford University",
    "MIT",
    "Yale University",
    "Princeton University",
  ];

  function handleNameChange(value) {
    setFormData({ ...formData, name: value });

    if (value.length > 2) {
      const matches = INSTITUTIONS.filter(inst =>
        inst.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setNameSuggestions(matches);
      setShowNameSuggestions(matches.length > 0);
    } else {
      setShowNameSuggestions(false);
    }
  }

  function selectName(name) {
    setFormData({ ...formData, name });
    setShowNameSuggestions(false);

    // Auto-populate address when institution is selected
    // In production, this would fetch from a database
    const addressMap = {
      "University of Illinois at Urbana-Champaign": "601 E John St, Champaign, IL 61820",
      "Northwestern University": "633 Clark St, Evanston, IL 60208",
      "University of Chicago": "5801 S Ellis Ave, Chicago, IL 60637",
      "Harvard University": "Cambridge, MA 02138",
      "Stanford University": "450 Serra Mall, Stanford, CA 94305",
      "MIT": "77 Massachusetts Ave, Cambridge, MA 02139",
    };

    if (addressMap[name]) {
      setFormData({ ...formData, name, address: addressMap[name] });
    }
  }

  function handleAddressChange(value) {
    setFormData({ ...formData, address: value });
    // In production, integrate with Google Places API
    setShowAddressSuggestions(false);
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      // Validate required fields
      if (!formData.name || !formData.degree) {
        throw new Error("Institution name and degree are required");
      }

      // In production, this would upload the file and save to backend
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call

      const record = {
        ...formData,
        file: uploadedFile,
        createdAt: new Date().toISOString(),
      };

      if (onSave) {
        await onSave(record);
      }

      // Reset form
      setFormData({
        recordType: "college",
        name: "",
        address: "",
        degree: "",
        field: "",
        graduationDate: "",
        gpa: "",
      });
      setUploadedFile(null);

      // Ask if they want to add another
      if (onAddAnother) {
        const addMore = window.confirm("Record added successfully! Would you like to add another one?");
        if (!addMore && onCancel) {
          onCancel();
        }
      }
    } catch (err) {
      setError(err.message || "Failed to save record");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="add-record-form">
      <div className="form-header">
        <h3 className="form-title">Add Educational Record</h3>
        <button className="form-close" onClick={onCancel}>✕</button>
      </div>

      <form onSubmit={handleSubmit} className="form-body">
        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        {/* Record Type */}
        <div className="form-group">
          <label className="form-label">Record Type *</label>
          <select
            value={formData.recordType}
            onChange={(e) => setFormData({ ...formData, recordType: e.target.value })}
            className="form-input"
            required
          >
            <option value="high-school">High School</option>
            <option value="college">College / University</option>
            <option value="graduate">Graduate School</option>
            <option value="professional">Professional Certification</option>
            <option value="trade">Trade School / Vocational</option>
          </select>
        </div>

        {/* Institution Name with Autocomplete */}
        <div className="form-group">
          <label className="form-label">Institution Name *</label>
          <div className="autocomplete-wrapper">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => formData.name.length > 2 && setShowNameSuggestions(true)}
              onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
              className="form-input"
              placeholder="Start typing institution name..."
              required
            />
            {showNameSuggestions && nameSuggestions.length > 0 && (
              <div className="autocomplete-dropdown">
                {nameSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    className="autocomplete-item"
                    onClick={() => selectName(suggestion)}
                  >
                    🎓 {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Address with Auto-find */}
        <div className="form-group">
          <label className="form-label">Address</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => handleAddressChange(e.target.value)}
            className="form-input"
            placeholder="Institution address (auto-filled when available)"
          />
          <div className="form-hint">
            Address is auto-populated for known institutions
          </div>
        </div>

        {/* Degree */}
        <div className="form-group">
          <label className="form-label">Degree / Certification *</label>
          <input
            type="text"
            value={formData.degree}
            onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
            className="form-input"
            placeholder="e.g., Bachelor of Science, High School Diploma, AWS Certified"
            required
          />
        </div>

        {/* Field of Study */}
        <div className="form-group">
          <label className="form-label">Field of Study / Major</label>
          <input
            type="text"
            value={formData.field}
            onChange={(e) => setFormData({ ...formData, field: e.target.value })}
            className="form-input"
            placeholder="e.g., Computer Science, Business Administration"
          />
        </div>

        {/* Graduation Date and GPA */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Graduation Date</label>
            <input
              type="date"
              value={formData.graduationDate}
              onChange={(e) => setFormData({ ...formData, graduationDate: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">GPA (optional)</label>
            <input
              type="text"
              value={formData.gpa}
              onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
              className="form-input"
              placeholder="e.g., 3.8"
            />
          </div>
        </div>

        {/* File Upload */}
        <div className="form-group">
          <label className="form-label">Upload Document</label>
          <div className="file-upload-area">
            <input
              type="file"
              id="record-file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              className="file-input"
            />
            <label htmlFor="record-file" className="file-upload-label">
              {uploadedFile ? (
                <div className="file-uploaded">
                  <span className="file-icon">📎</span>
                  <div>
                    <div className="file-name">{uploadedFile.name}</div>
                    <div className="file-size">
                      {(uploadedFile.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
              ) : (
                <div className="file-prompt">
                  <span className="file-icon">📄</span>
                  <div>
                    <div className="file-text">Click to upload transcript, diploma, or student ID</div>
                    <div className="file-hint">PDF, JPG, or PNG (max 10MB)</div>
                  </div>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="form-btn form-btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="form-btn form-btn-primary"
          >
            {saving ? "Saving..." : "Save Record"}
          </button>
        </div>
      </form>
    </div>
  );
}
