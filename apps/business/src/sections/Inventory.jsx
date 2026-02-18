import React, { useState, useEffect } from "react";
import FormModal from "../components/FormModal";
import { getInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem } from "../api/client";

/**
 * Inventory - Services & Inventory Management
 * Manage products, services, and pricing for the business
 */
export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    type: isAnalyst ? "consulting" : "vehicle",
    status: "available",
    metadata: {},
    price: "",
    cost: "",
  });

  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const jurisdiction = localStorage.getItem("JURISDICTION") || "IL";
  const isAnalyst = vertical === "analyst";

  useEffect(() => {
    loadInventory();
  }, []);

  async function loadInventory() {
    setLoading(true);
    setError("");
    try {
      const result = await getInventory({ vertical, jurisdiction, type: filterType === "all" ? undefined : filterType });
      setItems(result.items || []);
    } catch (e) {
      setError(e?.message || String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      if (editingItem) {
        // Update existing item
        await updateInventoryItem({
          vertical,
          jurisdiction,
          id: editingItem.id,
          item: {
            type: formData.type,
            status: formData.status,
            metadata: formData.metadata,
            price: parseFloat(formData.price) || 0,
            cost: parseFloat(formData.cost) || 0,
          },
        });
      } else {
        // Create new item
        await createInventoryItem({
          vertical,
          jurisdiction,
          item: {
            type: formData.type,
            status: formData.status,
            metadata: formData.metadata,
            price: parseFloat(formData.price) || 0,
            cost: parseFloat(formData.cost) || 0,
          },
        });
      }

      // Reload inventory to get updated data from server
      await loadInventory();

      setShowCreateModal(false);
      setEditingItem(null);
      setFormData({ type: isAnalyst ? "consulting" : "vehicle", status: "available", metadata: {}, price: "", cost: "" });
    } catch (e) {
      setError(e?.message || String(e));
    }
  }

  function handleEdit(item) {
    setEditingItem(item);
    setFormData({
      type: item.type,
      status: item.status,
      metadata: { ...item.metadata },
      price: item.price.toString(),
      cost: item.cost.toString(),
    });
    setShowCreateModal(true);
  }

  async function handleDelete(itemId) {
    if (!confirm("Are you sure you want to delete this item?")) return;

    setError("");
    try {
      await deleteInventoryItem({ vertical, jurisdiction, id: itemId });
      await loadInventory();
    } catch (e) {
      setError(e?.message || String(e));
    }
  }

  function handleMetadataChange(key, value) {
    setFormData({
      ...formData,
      metadata: {
        ...formData.metadata,
        [key]: value,
      },
    });
  }

  const filteredItems = items.filter((item) => {
    if (filterType !== "all" && item.type !== filterType) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total: items.length,
    available: items.filter((i) => i.status === "available").length,
    sold: items.filter((i) => i.status === "sold").length,
    pending: items.filter((i) => i.status === "pending").length,
    totalValue: items
      .filter((i) => i.status === "available")
      .reduce((sum, i) => sum + i.price, 0),
  };

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">{isAnalyst ? "Services & Fees" : "Services & Inventory"}</h1>
          <p className="subtle">{isAnalyst ? "Manage consulting services, fee structures, and subscriptions" : "Manage products, services, and pricing"}</p>
        </div>
        <button
          className="iconBtn"
          onClick={() => {
            setEditingItem(null);
            setFormData({ type: isAnalyst ? "consulting" : "vehicle", status: "available", metadata: {}, price: "", cost: "" });
            setShowCreateModal(true);
          }}
          style={{
            background: "var(--accent)",
            color: "white",
            borderColor: "var(--accent)",
          }}
        >
          {isAnalyst ? "+ Add Service" : "+ Add Item"}
        </button>
      </div>

      {/* Stats */}
      <div className="kpiRow">
        <div className="card kpiCard">
          <div className="kpiLabel">Total Items</div>
          <div className="kpiValue">{stats.total}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Available</div>
          <div className="kpiValue">{stats.available}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Sold</div>
          <div className="kpiValue">{stats.sold}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">{isAnalyst ? "Total Fees" : "Inventory Value"}</div>
          <div className="kpiValue">${stats.totalValue.toLocaleString()}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600 }}>
            Type
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "12px",
              border: "1px solid var(--line)",
            }}
          >
            <option value="all">All Types</option>
            {isAnalyst ? (
              <>
                <option value="consulting">Consulting</option>
                <option value="performance_fee">Performance Fee</option>
                <option value="management_fee">Management Fee</option>
                <option value="subscription">Research Subscription</option>
              </>
            ) : (
              <>
                <option value="vehicle">Vehicles</option>
                <option value="service">Services</option>
              </>
            )}
          </select>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600 }}>
            Status
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "12px",
              border: "1px solid var(--line)",
            }}
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="pending">Pending</option>
            <option value="sold">Sold</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="card" style={{ borderColor: "var(--danger)" }}>
          <div className="empty" style={{ color: "var(--danger)" }}>
            {error}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card">
          <div className="empty">Loading inventory...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredItems.length === 0 && (
        <div className="card">
          <div className="empty">
            <p>No inventory items found.</p>
          </div>
        </div>
      )}

      {/* Inventory table */}
      {!loading && filteredItems.length > 0 && (
        <div className="card">
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>{isAnalyst ? "Service" : "Item"}</th>
                  <th>{isAnalyst ? "Rate / Fee" : "Price"}</th>
                  {!isAnalyst && <th>Cost</th>}
                  {!isAnalyst && <th>Margin</th>}
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const margin = item.price - item.cost;
                  const marginPercent = item.price ? ((margin / item.price) * 100).toFixed(1) : "0.0";

                  const typeLabels = {
                    consulting: "Consulting",
                    performance_fee: "Performance Fee",
                    management_fee: "Management Fee",
                    subscription: "Subscription",
                    vehicle: "Vehicle",
                    service: "Service",
                  };

                  return (
                    <tr key={item.id}>
                      <td>
                        {typeLabels[item.type] || item.type}
                      </td>
                      <td className="tdStrong">
                        {item.type === "vehicle"
                          ? `${item.metadata.year} ${item.metadata.make} ${item.metadata.model}`
                          : item.metadata.name || item.metadata.serviceName || "-"}
                        {item.type === "vehicle" && (
                          <div className="tdMuted" style={{ fontSize: "12px" }}>
                            VIN: {item.metadata.vin}
                          </div>
                        )}
                        {item.metadata.billingFrequency && (
                          <div className="tdMuted" style={{ fontSize: "12px" }}>
                            {item.metadata.billingFrequency}
                          </div>
                        )}
                      </td>
                      <td>{isAnalyst && item.metadata.rateType === "percentage" ? `${item.price}%` : `$${item.price.toLocaleString()}`}{isAnalyst && item.metadata.rateUnit ? `/${item.metadata.rateUnit}` : ""}</td>
                      {!isAnalyst && <td className="tdMuted">${item.cost.toLocaleString()}</td>}
                      {!isAnalyst && (
                        <td>
                          <span style={{ color: margin > 0 ? "var(--accent2)" : "var(--danger)" }}>
                            ${margin.toLocaleString()} ({marginPercent}%)
                          </span>
                        </td>
                      )}
                      <td>
                        <span
                          className={`badge badge-${
                            item.status === "available"
                              ? "completed"
                              : item.status === "sold"
                              ? "created"
                              : "processing"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="iconBtn"
                            onClick={() => handleEdit(item)}
                            style={{ padding: "6px 10px", fontSize: "12px" }}
                          >
                            Edit
                          </button>
                          <button
                            className="iconBtn"
                            onClick={() => handleDelete(item.id)}
                            style={{
                              padding: "6px 10px",
                              fontSize: "12px",
                              borderColor: "var(--danger)",
                              color: "var(--danger)",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <FormModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingItem(null);
          setFormData({ type: isAnalyst ? "consulting" : "vehicle", status: "available", metadata: {}, price: "", cost: "" });
        }}
        title={editingItem ? "Edit Item" : isAnalyst ? "Add Service" : "Add New Item"}
        onSubmit={handleSubmit}
        submitLabel={editingItem ? "Update" : "Add Item"}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Type selector */}
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
              Item Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value, metadata: {} })
              }
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "12px",
                border: "1px solid var(--line)",
              }}
              required
            >
              {isAnalyst ? (
                <>
                  <option value="consulting">Consulting Service</option>
                  <option value="performance_fee">Performance Fee</option>
                  <option value="management_fee">Fund Management Fee</option>
                  <option value="subscription">Research Subscription</option>
                </>
              ) : (
                <>
                  <option value="vehicle">Vehicle</option>
                  <option value="service">Service</option>
                </>
              )}
            </select>
          </div>

          {/* Status */}
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "12px",
                border: "1px solid var(--line)",
              }}
              required
            >
              <option value="available">Available</option>
              <option value="pending">Pending</option>
              <option value="sold">Sold</option>
            </select>
          </div>

          {/* Vehicle fields */}
          {formData.type === "vehicle" && (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  VIN *
                </label>
                <input
                  type="text"
                  placeholder="17-character VIN"
                  value={formData.metadata.vin || ""}
                  onChange={(e) => handleMetadataChange("vin", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                  }}
                  required
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                    Year *
                  </label>
                  <input
                    type="number"
                    placeholder="2024"
                    value={formData.metadata.year || ""}
                    onChange={(e) => handleMetadataChange("year", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "12px",
                      border: "1px solid var(--line)",
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                    Make *
                  </label>
                  <input
                    type="text"
                    placeholder="Honda"
                    value={formData.metadata.make || ""}
                    onChange={(e) => handleMetadataChange("make", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "12px",
                      border: "1px solid var(--line)",
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                    Model *
                  </label>
                  <input
                    type="text"
                    placeholder="Civic"
                    value={formData.metadata.model || ""}
                    onChange={(e) => handleMetadataChange("model", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "12px",
                      border: "1px solid var(--line)",
                    }}
                    required
                  />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                    Mileage
                  </label>
                  <input
                    type="text"
                    placeholder="25,000"
                    value={formData.metadata.mileage || ""}
                    onChange={(e) => handleMetadataChange("mileage", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "12px",
                      border: "1px solid var(--line)",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                    Color
                  </label>
                  <input
                    type="text"
                    placeholder="Silver"
                    value={formData.metadata.color || ""}
                    onChange={(e) => handleMetadataChange("color", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "12px",
                      border: "1px solid var(--line)",
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Analyst service fields */}
          {isAnalyst && ["consulting", "performance_fee", "management_fee", "subscription"].includes(formData.type) && (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Service Name *
                </label>
                <input
                  type="text"
                  placeholder={formData.type === "consulting" ? "e.g., Deal Screening & Analysis" : formData.type === "performance_fee" ? "e.g., Carry / Performance Fee" : formData.type === "management_fee" ? "e.g., Annual Management Fee" : "e.g., Monthly Research Brief"}
                  value={formData.metadata.name || ""}
                  onChange={(e) => handleMetadataChange("name", e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }}
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Description
                </label>
                <textarea
                  placeholder="Describe the service or fee structure..."
                  value={formData.metadata.description || ""}
                  onChange={(e) => handleMetadataChange("description", e.target.value)}
                  rows={3}
                  style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)", fontFamily: "inherit", resize: "vertical" }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                    Rate Type
                  </label>
                  <select
                    value={formData.metadata.rateType || "flat"}
                    onChange={(e) => handleMetadataChange("rateType", e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }}
                  >
                    <option value="flat">Flat Fee</option>
                    <option value="hourly">Hourly Rate</option>
                    <option value="percentage">Percentage</option>
                    <option value="monthly">Monthly Retainer</option>
                    <option value="annual">Annual Fee</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                    Billing Frequency
                  </label>
                  <select
                    value={formData.metadata.billingFrequency || "one_time"}
                    onChange={(e) => handleMetadataChange("billingFrequency", e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }}
                  >
                    <option value="one_time">One-time</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                    <option value="per_deal">Per Deal</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Service fields */}
          {!isAnalyst && formData.type === "service" && (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Service Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Premium Oil Change"
                  value={formData.metadata.name || ""}
                  onChange={(e) => handleMetadataChange("name", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                  }}
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Description
                </label>
                <textarea
                  placeholder="Service description..."
                  value={formData.metadata.description || ""}
                  onChange={(e) => handleMetadataChange("description", e.target.value)}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>
            </>
          )}

          {/* Price and Cost */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                {isAnalyst ? "Rate / Fee *" : "Price *"} {formData.metadata?.rateType === "percentage" ? "%" : "$"}
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="28500.00"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "12px",
                  border: "1px solid var(--line)",
                }}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                Cost * $
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="25000.00"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "12px",
                  border: "1px solid var(--line)",
                }}
                required
              />
            </div>
          </div>

          {/* Margin preview */}
          {formData.price && formData.cost && (
            <div
              style={{
                padding: "12px",
                borderRadius: "12px",
                background: "#f8fafc",
                border: "1px solid var(--line)",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                Profit Margin
              </div>
              <div style={{ fontSize: "18px", fontWeight: 900 }}>
                ${(parseFloat(formData.price) - parseFloat(formData.cost)).toFixed(2)} (
                {(
                  ((parseFloat(formData.price) - parseFloat(formData.cost)) /
                    parseFloat(formData.price)) *
                  100
                ).toFixed(1)}
                %)
              </div>
            </div>
          )}
        </div>
      </FormModal>
    </div>
  );
}
