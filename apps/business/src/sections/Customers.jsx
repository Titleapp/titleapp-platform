import React, { useState, useEffect } from "react";
import FormModal from "../components/FormModal";

/**
 * Customers - CRM and customer relationship management
 */
export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    tags: [],
  });

  // Mock customer data
  const mockCustomers = [
    {
      id: "cust-001",
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@example.com",
      phone: "+1-555-0100",
      tags: ["hot-lead"],
      deals: [
        { id: "deal-001", item: "2023 Honda Accord", status: "negotiating", value: 28500 },
      ],
      notes: "Interested in EX-L trim. Pre-approved for financing.",
      createdAt: "2026-02-10T09:00:00Z",
      lastContact: "2026-02-14T10:30:00Z",
    },
    {
      id: "cust-002",
      firstName: "Sarah",
      lastName: "Lee",
      email: "sarah.lee@example.com",
      phone: "+1-555-0200",
      tags: ["repeat-customer"],
      deals: [
        { id: "deal-002", item: "2024 Toyota Camry", status: "sold", value: 26900 },
      ],
      notes: "Purchased Camry on 2/12. Very satisfied.",
      createdAt: "2026-01-15T08:00:00Z",
      lastContact: "2026-02-12T14:30:00Z",
    },
    {
      id: "cust-003",
      firstName: "Mike",
      lastName: "Johnson",
      email: "mike.j@example.com",
      phone: "+1-555-0300",
      tags: [],
      deals: [
        { id: "deal-003", item: "Premium Oil Change", status: "scheduled", value: 79.99 },
      ],
      notes: "Service appointment scheduled for 2/20.",
      createdAt: "2026-02-08T11:00:00Z",
      lastContact: "2026-02-13T16:00:00Z",
    },
  ];

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);
    setTimeout(() => {
      setCustomers(mockCustomers);
      setLoading(false);
    }, 500);
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (editingCustomer) {
      setCustomers(
        customers.map((c) =>
          c.id === editingCustomer.id
            ? {
                ...c,
                ...formData,
              }
            : c
        )
      );
    } else {
      const newCustomer = {
        id: `cust-${Date.now()}`,
        ...formData,
        deals: [],
        notes: "",
        createdAt: new Date().toISOString(),
        lastContact: new Date().toISOString(),
      };
      setCustomers([newCustomer, ...customers]);
    }

    setShowCreateModal(false);
    setEditingCustomer(null);
    setFormData({ firstName: "", lastName: "", email: "", phone: "", tags: [] });
  }

  function handleEdit(customer) {
    setEditingCustomer(customer);
    setFormData({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      tags: customer.tags || [],
    });
    setShowCreateModal(true);
  }

  function handleDelete(customerId) {
    if (confirm("Are you sure you want to delete this customer?")) {
      setCustomers(customers.filter((c) => c.id !== customerId));
      if (selectedCustomer?.id === customerId) {
        setSelectedCustomer(null);
      }
    }
  }

  const filteredCustomers = customers.filter((customer) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      customer.firstName.toLowerCase().includes(query) ||
      customer.lastName.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query) ||
      customer.phone.includes(query)
    );
  });

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Customers</h1>
          <p className="subtle">CRM and customer relationship management</p>
        </div>
        <button
          className="iconBtn"
          onClick={() => {
            setEditingCustomer(null);
            setFormData({ firstName: "", lastName: "", email: "", phone: "", tags: [] });
            setShowCreateModal(true);
          }}
          style={{
            background: "var(--accent)",
            color: "white",
            borderColor: "var(--accent)",
          }}
        >
          + Add Customer
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="🔍 Search customers by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "500px",
            padding: "12px 16px",
            borderRadius: "12px",
            border: "1px solid var(--line)",
            fontSize: "14px",
          }}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="card">
          <div className="empty">Loading customers...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredCustomers.length === 0 && (
        <div className="card">
          <div className="empty">
            <p>👥 {searchQuery ? "No customers found." : "No customers yet."}</p>
          </div>
        </div>
      )}

      {/* Customer list */}
      {!loading && filteredCustomers.length > 0 && (
        <div className="contentGrid">
          {/* Customer table */}
          <div className="card">
            <div className="cardHeader">
              <div>
                <div className="cardTitle">Customer List</div>
                <div className="cardSub">{filteredCustomers.length} customers</div>
              </div>
            </div>
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Tags</th>
                    <th>Deals</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className={selectedCustomer?.id === customer.id ? "rowSelected" : ""}
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <td className="tdStrong">
                        {customer.firstName} {customer.lastName}
                      </td>
                      <td className="tdMuted">
                        <div>{customer.email}</div>
                        <div style={{ fontSize: "12px" }}>{customer.phone}</div>
                      </td>
                      <td>
                        {customer.tags && customer.tags.length > 0 ? (
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                            {customer.tags.map((tag, i) => (
                              <span
                                key={i}
                                className="badge badge-created"
                                style={{ fontSize: "10px", padding: "3px 6px" }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="tdMuted">-</span>
                        )}
                      </td>
                      <td>{customer.deals?.length || 0}</td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="iconBtn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(customer);
                            }}
                            style={{ padding: "6px 10px", fontSize: "12px" }}
                          >
                            Edit
                          </button>
                          <button
                            className="iconBtn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(customer.id);
                            }}
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer details panel */}
          {selectedCustomer && (
            <div className="card">
              <div className="cardHeader">
                <div className="cardTitle">Customer Details</div>
                <button
                  className="iconBtn"
                  onClick={() => setSelectedCustomer(null)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="detail">
                <div className="kvRow">
                  <div className="k">Name</div>
                  <div className="v">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </div>
                </div>
                <div className="kvRow">
                  <div className="k">Email</div>
                  <div className="v">{selectedCustomer.email}</div>
                </div>
                <div className="kvRow">
                  <div className="k">Phone</div>
                  <div className="v">{selectedCustomer.phone}</div>
                </div>
                <div className="kvRow">
                  <div className="k">Customer Since</div>
                  <div className="v">
                    {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="kvRow">
                  <div className="k">Last Contact</div>
                  <div className="v">
                    {new Date(selectedCustomer.lastContact).toLocaleDateString()}
                  </div>
                </div>

                {selectedCustomer.tags && selectedCustomer.tags.length > 0 && (
                  <div className="kvRow">
                    <div className="k">Tags</div>
                    <div className="v">
                      {selectedCustomer.tags.map((tag, i) => (
                        <span key={i} className="badge badge-created" style={{ marginRight: "4px" }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCustomer.notes && (
                  <>
                    <div className="sectionTitle" style={{ fontSize: "14px" }}>Notes</div>
                    <div style={{ fontSize: "14px", marginTop: "8px", lineHeight: "1.6" }}>
                      {selectedCustomer.notes}
                    </div>
                  </>
                )}

                {selectedCustomer.deals && selectedCustomer.deals.length > 0 && (
                  <>
                    <div className="sectionTitle" style={{ fontSize: "14px" }}>Deals</div>
                    {selectedCustomer.deals.map((deal) => (
                      <div
                        key={deal.id}
                        style={{
                          padding: "10px",
                          marginTop: "8px",
                          borderRadius: "10px",
                          background: "#f8fafc",
                          border: "1px solid var(--line)",
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: "4px" }}>{deal.item}</div>
                        <div style={{ fontSize: "13px", color: "var(--muted)" }}>
                          <span
                            className={`badge badge-${
                              deal.status === "sold"
                                ? "completed"
                                : deal.status === "negotiating"
                                ? "processing"
                                : "created"
                            }`}
                            style={{ fontSize: "11px", padding: "3px 8px", marginRight: "8px" }}
                          >
                            {deal.status}
                          </span>
                          ${deal.value.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <FormModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingCustomer(null);
          setFormData({ firstName: "", lastName: "", email: "", phone: "", tags: [] });
        }}
        title={editingCustomer ? "Edit Customer" : "Add New Customer"}
        onSubmit={handleSubmit}
        submitLabel={editingCustomer ? "Update" : "Add Customer"}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                First Name *
              </label>
              <input
                type="text"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
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
                Last Name *
              </label>
              <input
                type="text"
                placeholder="Smith"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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

          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
              Email *
            </label>
            <input
              type="email"
              placeholder="john.smith@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
              Phone
            </label>
            <input
              type="tel"
              placeholder="+1-555-0100"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
              Tags (comma-separated)
            </label>
            <input
              type="text"
              placeholder="hot-lead, repeat-customer"
              value={formData.tags?.join(", ") || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                })
              }
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "12px",
                border: "1px solid var(--line)",
              }}
            />
          </div>
        </div>
      </FormModal>
    </div>
  );
}
