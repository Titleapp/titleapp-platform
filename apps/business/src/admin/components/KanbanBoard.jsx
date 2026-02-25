import React, { useState } from "react";

export default function KanbanBoard({
  stages,
  items,
  getStage,
  renderCard,
  onMoveItem,
}) {
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const grouped = {};
  for (const stage of stages) {
    grouped[stage.id] = [];
  }
  for (const item of items) {
    const stage = getStage(item);
    if (grouped[stage]) grouped[stage].push(item);
  }

  function handleDragStart(e, item) {
    setDragging(item);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e, stageId) {
    e.preventDefault();
    setDragOver(stageId);
  }

  function handleDrop(e, stageId) {
    e.preventDefault();
    if (dragging && onMoveItem) {
      onMoveItem(dragging, stageId);
    }
    setDragging(null);
    setDragOver(null);
  }

  return (
    <div className="ac-kanban">
      {stages.map((stage) => (
        <div key={stage.id} className="ac-kanban-col">
          <div className="ac-kanban-col-header">
            <span>{stage.label}</span>
            <span className="ac-kanban-col-count">{grouped[stage.id].length}</span>
          </div>
          <div
            className="ac-kanban-cards"
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDrop={(e) => handleDrop(e, stage.id)}
            style={dragOver === stage.id ? { background: "rgba(124,58,237,0.04)", outline: "2px dashed rgba(124,58,237,0.2)", outlineOffset: "-2px" } : {}}
          >
            {grouped[stage.id].map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                style={{ opacity: dragging?.id === item.id ? 0.5 : 1 }}
              >
                {renderCard(item)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
