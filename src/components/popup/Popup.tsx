import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";

export function Popup() {
  const [enabled, setEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [focusEnabled, setFocusEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [hasUndo, setHasUndo] = useState(false);

  useEffect(() => {
    chrome.storage.sync.get("tapclosed_settings", (result) => {
      const s = result.tapclosed_settings || {};
      setEnabled(s.enabled !== false);
      setSoundEnabled(s.soundEnabled !== false);
      setFocusEnabled(s.focusEnabled !== false);
      setLoaded(true);
    });
    // Check if there's a pending undo
    chrome.runtime.sendMessage({ type: "GET_UNDO_INFO" }).then((response) => {
      setHasUndo(!!(response?.undoInfo && response.undoInfo.length > 0));
    }).catch(() => {});
  }, []);

  const save = (partial: Record<string, unknown>) => {
    chrome.storage.sync.get("tapclosed_settings", (result) => {
      const current = result.tapclosed_settings || {};
      chrome.storage.sync.set({
        tapclosed_settings: { ...current, ...partial },
      });
    });
  };

  const sendAction = useCallback((type: string) => {
    chrome.runtime.sendMessage({ type });
    window.close();
  }, []);

  const handleUndo = useCallback(() => {
    chrome.runtime.sendMessage({ type: "UNDO_CLOSE" });
    window.close();
  }, []);

  if (!loaded) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      style={{ padding: "20px", width: "320px" }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            background:
              "linear-gradient(135deg, rgba(150, 180, 255, 0.2), rgba(200, 170, 255, 0.15))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid rgba(150, 180, 255, 0.15)",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(180, 200, 255, 0.8)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
        <div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.9)",
              letterSpacing: "-0.01em",
            }}
          >
            tapclosed
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "rgba(255, 255, 255, 0.35)",
              marginTop: "1px",
            }}
          >
            emotional browser interaction
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div
        style={{
          fontSize: "10px",
          fontWeight: 600,
          color: "rgba(255, 255, 255, 0.3)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "8px",
        }}
      >
        Quick Actions
      </div>
      {hasUndo && (
        <button
          onClick={handleUndo}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "9px 12px",
            background: "rgba(150, 200, 170, 0.08)",
            borderRadius: "9px",
            border: "1px solid rgba(150, 200, 170, 0.15)",
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.15s ease",
            width: "100%",
            textAlign: "left",
            marginBottom: "6px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(150, 200, 170, 0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(150, 200, 170, 0.08)";
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "7px",
              background: "rgba(150, 200, 170, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(150,200,170,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6" />
              <path d="M3 13a9 9 0 1 0 3-7.7L3 8" />
            </svg>
          </div>
          <div style={{ flex: 1, fontSize: "12px", fontWeight: 600, color: "rgba(150, 200, 170, 0.95)" }}>
            Undo Close
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "rgba(255, 255, 255, 0.25)",
              background: "rgba(255, 255, 255, 0.04)",
              padding: "2px 6px",
              borderRadius: "4px",
              border: "1px solid rgba(255, 255, 255, 0.04)",
            }}
          >
            Ctrl+Shift+Z
          </div>
        </button>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
        <ActionButton
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(150,180,255,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          }
          label="Close Tab"
          shortcut="Alt+W"
          onClick={() => sendAction("CLOSE_TAB")}
        />
        <ActionButton
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(150,180,255,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
            </svg>
          }
          label="Close Same Domain"
          shortcut="Alt+Shift+W"
          onClick={() => sendAction("CLOSE_DOMAIN_TABS")}
        />
        <ActionButton
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,180,150,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
            </svg>
          }
          label="Close Other Tabs"
          shortcut="Alt+Shift+O"
          onClick={() => sendAction("CLOSE_OTHER_TABS")}
        />
        <ActionButton
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,120,120,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          }
          label="Close All Tabs"
          shortcut=""
          onClick={() => sendAction("CLOSE_ALL_TABS")}
        />
        <ActionButton
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(150,200,170,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          }
          label="Duplicate Tab"
          shortcut="Alt+D"
          onClick={() => sendAction("DUPLICATE_TAB")}
        />
      </div>

      {/* Divider */}
      <div
        style={{
          height: "1px",
          background: "rgba(255, 255, 255, 0.06)",
          margin: "0 0 16px 0",
        }}
      />

      {/* Toggles */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <ToggleRow
          label="Gesture Close"
          description="Left + right click to close"
          checked={enabled}
          onChange={(v) => {
            setEnabled(v);
            save({ enabled: v });
          }}
        />
        <ToggleRow
          label="Sound"
          description="Soft breath-like feedback"
          checked={soundEnabled}
          onChange={(v) => {
            setSoundEnabled(v);
            save({ soundEnabled: v });
          }}
        />
        <ToggleRow
          label="Focus Mode"
          description="Middle-click long press"
          checked={focusEnabled}
          onChange={(v) => {
            setFocusEnabled(v);
            save({ focusEnabled: v });
          }}
        />
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "16px",
          paddingTop: "12px",
          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          style={{
            background: "none",
            border: "none",
            color: "rgba(150, 180, 255, 0.7)",
            fontSize: "11px",
            cursor: "pointer",
            fontFamily: "inherit",
            padding: "4px 0",
          }}
        >
          Settings
        </button>
        <div
          style={{
            fontSize: "10px",
            color: "rgba(255, 255, 255, 0.2)",
          }}
        >
          v1.0.0
        </div>
      </div>
    </motion.div>
  );
}

function ActionButton({
  icon,
  label,
  shortcut,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "9px 12px",
        background: "rgba(255, 255, 255, 0.03)",
        borderRadius: "9px",
        border: "1px solid rgba(255, 255, 255, 0.04)",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.15s ease",
        width: "100%",
        textAlign: "left",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.07)";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.04)";
      }}
    >
      <div
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "7px",
          background: "rgba(255, 255, 255, 0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, fontSize: "12px", fontWeight: 500, color: "rgba(255, 255, 255, 0.85)" }}>
        {label}
      </div>
      {shortcut && (
        <div
          style={{
            fontSize: "10px",
            color: "rgba(255, 255, 255, 0.25)",
            background: "rgba(255, 255, 255, 0.04)",
            padding: "2px 6px",
            borderRadius: "4px",
            border: "1px solid rgba(255, 255, 255, 0.04)",
          }}
        >
          {shortcut}
        </div>
      )}
    </button>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        background: "rgba(255, 255, 255, 0.03)",
        borderRadius: "10px",
        border: "1px solid rgba(255, 255, 255, 0.04)",
      }}
    >
      <div>
        <div
          style={{
            fontSize: "12px",
            fontWeight: 500,
            color: "rgba(255, 255, 255, 0.85)",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: "10px",
            color: "rgba(255, 255, 255, 0.35)",
            marginTop: "1px",
          }}
        >
          {description}
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: "36px",
        height: "20px",
        borderRadius: "10px",
        border: "none",
        cursor: "pointer",
        position: "relative",
        background: checked
          ? "rgba(150, 180, 255, 0.3)"
          : "rgba(255, 255, 255, 0.08)",
        transition: "background 0.2s ease",
      }}
    >
      <motion.div
        animate={{ x: checked ? 17 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          background: checked
            ? "rgba(180, 200, 255, 0.9)"
            : "rgba(255, 255, 255, 0.4)",
          position: "absolute",
          top: "2px",
        }}
      />
    </button>
  );
}
