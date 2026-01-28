function EventModal({
                        open,
                        dateKey,
                        title,
                        type,
                        onChangeTitle,
                        onChangeType,
                        onCancel,
                        onSave,
                    }) {
    if (!open) return null;

    function onOverlayMouseDown() {
        onCancel?.();
    }

    function onDialogMouseDown(e) {
        e.stopPropagation();
    }

    return (
        <div style={modalOverlayStyle} onMouseDown={onOverlayMouseDown} role="presentation">
            <div
                style={modalStyle}
                onMouseDown={onDialogMouseDown}
                role="dialog"
                aria-modal="true"
                aria-label="Add event"
            >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>Add event</div>
                        <div style={{ opacity: 0.8, marginTop: 2 }}>{dateKey ?? ""}</div>
                    </div>
                    <button type="button" onClick={onCancel} aria-label="Close">
                        ✕
                    </button>
                </div>

                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                    <label style={fieldStyle}>
                        <div style={fieldLabelStyle}>Title</div>
                        <input
                            value={title}
                            onChange={(e) => onChangeTitle?.(e.target.value)}
                            placeholder="e.g., Dentist appointment"
                            style={inputStyle}
                            autoFocus
                        />
                    </label>

                    <label style={fieldStyle}>
                        <div style={fieldLabelStyle}>Type</div>
                        <select
                            value={type}
                            onChange={(e) => onChangeType?.(e.target.value)}
                            style={inputStyle}
                        >
                            <option value="me">My event</option>
                            <option value="partner">Partner’s event</option>
                            <option value="family">Family event</option>
                        </select>
                    </label>

                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
                        <button type="button" onClick={onCancel}>
                            Cancel
                        </button>
                        <button type="button" onClick={onSave} disabled={!String(title).trim()}>
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const modalOverlayStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "grid",
    placeItems: "center",
    padding: 16,
    zIndex: 50,
};

const modalStyle = {
    width: "min(520px, 100%)",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(20,20,24,0.98)",
    padding: 14,
};

const fieldStyle = { display: "grid", gap: 6 };
const fieldLabelStyle = { fontWeight: 700, opacity: 0.9 };

const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.18)",
    color: "inherit",
};

export default EventModal;