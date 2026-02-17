import React, { useState, useEffect } from "react";
import FormModal from "../components/FormModal";
import { getAppointments, createAppointment, updateAppointment, deleteAppointment, getCustomers } from "../api/client";

/**
 * Appointments - Schedule and calendar management
 */
export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    datetime: "",
    type: "service",
    duration: 60,
    notes: "",
  });

  const vertical = "auto";
  const jurisdiction = "il";

  // Mock customers for selection
  const mockCustomers = [
    { id: "cust-001", name: "John Smith" },
    { id: "cust-002", name: "Sarah Lee" },
    { id: "cust-003", name: "Mike Johnson" },
  ];

  // Mock appointments
  const mockAppointments = [
    {
      id: "appt-001",
      customerId: "cust-001",
      customerName: "John Smith",
      datetime: "2026-02-20T14:00:00",
      duration: 60,
      type: "test-drive",
      status: "scheduled",
      notes: "Test drive 2023 Honda Accord",
      createdAt: "2026-02-14T10:00:00Z",
    },
    {
      id: "appt-002",
      customerId: "cust-003",
      customerName: "Mike Johnson",
      datetime: "2026-02-20T10:00:00",
      duration: 30,
      type: "service",
      status: "scheduled",
      notes: "Premium oil change",
      createdAt: "2026-02-13T16:00:00Z",
    },
    {
      id: "appt-003",
      customerId: "cust-002",
      customerName: "Sarah Lee",
      datetime: "2026-02-18T15:00:00",
      duration: 45,
      type: "financing",
      status: "completed",
      notes: "Finalize financing for Camry purchase",
      createdAt: "2026-02-12T11:00:00Z",
    },
  ];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [apptResult, custResult] = await Promise.all([
        getAppointments({ vertical, jurisdiction }),
        getCustomers({ vertical, jurisdiction }),
      ]);
      setAppointments(apptResult.appointments || []);
      setCustomers(custResult.customers || []);
    } catch (e) {
      setError(e?.message || String(e));
      setAppointments([]);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const selectedCustomer = customers.find((c) => c.id === formData.customerId);

    try {
      if (editingAppointment) {
        await updateAppointment({
          vertical,
          jurisdiction,
          id: editingAppointment.id,
          appointment: {
            ...formData,
            customerName: selectedCustomer?.firstName + " " + selectedCustomer?.lastName || formData.customerName,
          },
        });
      } else {
        await createAppointment({
          vertical,
          jurisdiction,
          appointment: {
            ...formData,
            customerName: selectedCustomer?.firstName + " " + selectedCustomer?.lastName || formData.customerName,
          },
        });
      }

      // Reload appointments to get updated data from server
      await loadData();

      setShowCreateModal(false);
      setEditingAppointment(null);
      setFormData({
        customerId: "",
        customerName: "",
        datetime: "",
        type: "service",
        duration: 60,
        notes: "",
      });
    } catch (e) {
      setError(e?.message || String(e));
    }
  }

  function handleEdit(appointment) {
    setEditingAppointment(appointment);
    setFormData({
      customerId: appointment.customerId,
      customerName: appointment.customerName,
      datetime: appointment.datetime,
      type: appointment.type,
      duration: appointment.duration,
      notes: appointment.notes || "",
    });
    setShowCreateModal(true);
  }

  async function handleDelete(appointmentId) {
    if (!confirm("Are you sure you want to delete this appointment?")) return;

    setError("");
    try {
      await deleteAppointment({ vertical, jurisdiction, id: appointmentId });
      await loadData();
    } catch (e) {
      setError(e?.message || String(e));
    }
  }

  async function handleStatusChange(appointmentId, newStatus) {
    setError("");
    try {
      await updateAppointment({
        vertical,
        jurisdiction,
        id: appointmentId,
        appointment: { status: newStatus },
      });
      await loadData();
    } catch (e) {
      setError(e?.message || String(e));
    }
  }

  // Group appointments by date
  const appointmentsByDate = appointments.reduce((acc, appt) => {
    const date = new Date(appt.datetime).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(appt);
    return acc;
  }, {});

  // Sort dates
  const sortedDates = Object.keys(appointmentsByDate).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  const stats = {
    total: appointments.length,
    scheduled: appointments.filter((a) => a.status === "scheduled").length,
    completed: appointments.filter((a) => a.status === "completed").length,
    cancelled: appointments.filter((a) => a.status === "cancelled").length,
  };

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Appointments</h1>
          <p className="subtle">Schedule and calendar management</p>
        </div>
        <button
          className="iconBtn"
          onClick={() => {
            setEditingAppointment(null);
            setFormData({
              customerId: "",
              customerName: "",
              datetime: "",
              type: "service",
              duration: 60,
              notes: "",
            });
            setShowCreateModal(true);
          }}
          style={{
            background: "var(--accent)",
            color: "white",
            borderColor: "var(--accent)",
          }}
        >
          + New Appointment
        </button>
      </div>

      {/* Stats */}
      <div className="kpiRow">
        <div className="card kpiCard">
          <div className="kpiLabel">Total</div>
          <div className="kpiValue">{stats.total}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Scheduled</div>
          <div className="kpiValue">{stats.scheduled}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Completed</div>
          <div className="kpiValue">{stats.completed}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Cancelled</div>
          <div className="kpiValue">{stats.cancelled}</div>
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
          <div className="empty">Loading appointments...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && appointments.length === 0 && (
        <div className="card">
          <div className="empty">
            <p>No appointments scheduled.</p>
          </div>
        </div>
      )}

      {/* Calendar view */}
      {!loading && appointments.length > 0 && (
        <div>
          {sortedDates.map((dateString) => {
            const date = new Date(dateString);
            const isToday = date.toDateString() === new Date().toDateString();
            const isPast = date < new Date() && !isToday;

            return (
              <div key={dateString} style={{ marginBottom: "24px" }}>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 900,
                    marginBottom: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  {date.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {isToday && (
                    <span
                      className="badge badge-processing"
                      style={{ fontSize: "11px", padding: "4px 8px" }}
                    >
                      Today
                    </span>
                  )}
                  {isPast && (
                    <span
                      className="badge"
                      style={{ fontSize: "11px", padding: "4px 8px" }}
                    >
                      Past
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {appointmentsByDate[dateString]
                    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
                    .map((appt) => {
                      const time = new Date(appt.datetime).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <div key={appt.id} className="card">
                          <div style={{ padding: "14px 16px" }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: "14px",
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    marginBottom: "8px",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: "16px",
                                      fontWeight: 900,
                                      color: "var(--accent)",
                                    }}
                                  >
                                    {time}
                                  </div>
                                  <span
                                    className={`badge badge-${
                                      appt.status === "scheduled"
                                        ? "processing"
                                        : appt.status === "completed"
                                        ? "completed"
                                        : "failed"
                                    }`}
                                    style={{ fontSize: "11px", padding: "4px 8px" }}
                                  >
                                    {appt.status}
                                  </span>
                                  <span
                                    className="badge"
                                    style={{ fontSize: "11px", padding: "4px 8px" }}
                                  >
                                    {appt.duration} min
                                  </span>
                                </div>

                                <div style={{ fontWeight: 800, marginBottom: "4px" }}>
                                  {appt.customerName}
                                </div>

                                <div style={{ fontSize: "14px", color: "var(--muted)" }}>
                                  {appt.type}
                                </div>

                                {appt.notes && (
                                  <div
                                    style={{
                                      marginTop: "8px",
                                      fontSize: "13px",
                                      color: "var(--muted)",
                                    }}
                                  >
                                    {appt.notes}
                                  </div>
                                )}
                              </div>

                              <div style={{ display: "flex", gap: "6px" }}>
                                {appt.status === "scheduled" && (
                                  <>
                                    <button
                                      className="iconBtn"
                                      onClick={() => handleStatusChange(appt.id, "completed")}
                                      style={{
                                        padding: "6px 10px",
                                        fontSize: "12px",
                                        background: "var(--accent2)",
                                        color: "white",
                                        borderColor: "var(--accent2)",
                                      }}
                                    >
                                      Complete
                                    </button>
                                    <button
                                      className="iconBtn"
                                      onClick={() => handleStatusChange(appt.id, "cancelled")}
                                      style={{
                                        padding: "6px 10px",
                                        fontSize: "12px",
                                        borderColor: "var(--danger)",
                                        color: "var(--danger)",
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </>
                                )}
                                <button
                                  className="iconBtn"
                                  onClick={() => handleEdit(appt)}
                                  style={{ padding: "6px 10px", fontSize: "12px" }}
                                >
                                  Edit
                                </button>
                                <button
                                  className="iconBtn"
                                  onClick={() => handleDelete(appt.id)}
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
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <FormModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingAppointment(null);
          setFormData({
            customerId: "",
            customerName: "",
            datetime: "",
            type: "service",
            duration: 60,
            notes: "",
          });
        }}
        title={editingAppointment ? "Edit Appointment" : "Schedule New Appointment"}
        onSubmit={handleSubmit}
        submitLabel={editingAppointment ? "Update" : "Schedule"}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
              Customer *
            </label>
            <select
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "12px",
                border: "1px solid var(--line)",
              }}
              required
            >
              <option value="">Select customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
              Date & Time *
            </label>
            <input
              type="datetime-local"
              value={formData.datetime}
              onChange={(e) => setFormData({ ...formData, datetime: e.target.value })}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "12px",
                border: "1px solid var(--line)",
              }}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "12px",
                  border: "1px solid var(--line)",
                }}
                required
              >
                <option value="service">Service</option>
                <option value="test-drive">Test Drive</option>
                <option value="financing">Financing</option>
                <option value="consultation">Consultation</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                Duration (min) *
              </label>
              <input
                type="number"
                step="15"
                value={formData.duration}
                onChange={(e) =>
                  setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })
                }
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
              Notes
            </label>
            <textarea
              placeholder="Appointment notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
        </div>
      </FormModal>
    </div>
  );
}
