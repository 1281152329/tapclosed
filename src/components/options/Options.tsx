import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ProtectionRule, tapclosedSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";

export function Options() {
  const [settings, setSettings] = useState<tapclosedSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [newRule, setNewRule] = useState("");
  const [newRuleType, setNewRuleType] = useState<"domain" | "regex">("domain");

  useEffect(() => {
    chrome.storage.sync.get("tapclosed_settings", (result) => {
      setSettings({ ...DEFAULT_SETTINGS, ...result.tapclosed_settings });
      setLoaded(true);
    });
  }, []);

  const save = (partial: Partial<tapclosedSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    chrome.storage.sync.set({ tapclosed_settings: updated });
  };

  const addRule = () => {
    if (!newRule.trim()) return;
    const rule: ProtectionRule = {
      id: Date.now().toString(),
      pattern: newRule.trim(),
      type: newRuleType,
      enabled: true,
      label: newRule.trim(),
    };
    save({ protectionRules: [...settings.protectionRules, rule] });
    setNewRule("");
  };

  const removeRule = (id: string) => {
    save({
      protectionRules: settings.protectionRules.filter((r) => r.id !== id),
    });
  };

  const toggleRule = (id: string) => {
    save({
      protectionRules: settings.protectionRules.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
      ),
    });
  };

  if (!loaded) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "48px 24px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        style={{ width: "100%", maxWidth: "560px" }}
      >
        {/* Header */}
        <div style={{ marginBottom: "40px" }}>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.9)",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            tapclosed settings
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "rgba(255, 255, 255, 0.4)",
              marginTop: "6px",
            }}
          >
            Configure your emotional browser interaction system
          </p>
        </div>

        {/* Section: General */}
        <Section title="General">
          <SettingRow
            label="Enabled"
            description="Master switch for all tapclosed features"
          >
            <Toggle
              checked={settings.enabled}
              onChange={(v) => save({ enabled: v })}
            />
          </SettingRow>
          <SettingRow
            label="Gesture Close"
            description="Close tabs with left + right mouse button"
          >
            <Toggle
              checked={settings.gestureEnabled}
              onChange={(v) => save({ gestureEnabled: v })}
            />
          </SettingRow>
        </Section>

        {/* Section: Sound */}
        <Section title="Sound">
          <SettingRow
            label="Sound Effects"
            description="Soft breath-like audio feedback"
          >
            <Toggle
              checked={settings.soundEnabled}
              onChange={(v) => save({ soundEnabled: v })}
            />
          </SettingRow>
          <SettingRow
            label="Volume"
            description={`${Math.round(settings.soundVolume * 100)}%`}
          >
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(settings.soundVolume * 100)}
              onChange={(e) =>
                save({ soundVolume: parseInt(e.target.value) / 100 })
              }
              style={{
                width: "120px",
                accentColor: "rgba(150, 180, 255, 0.8)",
              }}
            />
          </SettingRow>
        </Section>

        {/* Section: Animation */}
        <Section title="Animation">
          <SettingRow
            label="Dissolve Duration"
            description={`${settings.animationDuration}ms â€?dream dissolve speed`}
          >
            <input
              type="range"
              min="150"
              max="500"
              step="10"
              value={settings.animationDuration}
              onChange={(e) =>
                save({ animationDuration: parseInt(e.target.value) })
              }
              style={{
                width: "120px",
                accentColor: "rgba(150, 180, 255, 0.8)",
              }}
            />
          </SettingRow>
          <SettingRow
            label="Undo Duration"
            description={`${(settings.undoDuration / 1000).toFixed(1)}s â€?time to undo a close`}
          >
            <input
              type="range"
              min="1000"
              max="8000"
              step="500"
              value={settings.undoDuration}
              onChange={(e) =>
                save({ undoDuration: parseInt(e.target.value) })
              }
              style={{
                width: "120px",
                accentColor: "rgba(150, 180, 255, 0.8)",
              }}
            />
          </SettingRow>
        </Section>

        {/* Section: Protected Sites */}
        <Section title="Protected Sites">
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <input
              type="text"
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRule()}
              placeholder="e.g. mail.google.com"
              style={{
                flex: 1,
                padding: "8px 12px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "8px",
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: "12px",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <select
              value={newRuleType}
              onChange={(e) => setNewRuleType(e.target.value as "domain" | "regex")}
              style={{
                padding: "8px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "8px",
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: "12px",
                fontFamily: "inherit",
                outline: "none",
              }}
            >
              <option value="domain">Domain</option>
              <option value="regex">Regex</option>
            </select>
            <button
              onClick={addRule}
              style={{
                padding: "8px 14px",
                background: "rgba(150, 180, 255, 0.12)",
                border: "1px solid rgba(150, 180, 255, 0.2)",
                borderRadius: "8px",
                color: "rgba(180, 200, 255, 0.9)",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Add
            </button>
          </div>

          <AnimatePresence>
            {settings.protectionRules.map((rule) => (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 12px",
                  background: "rgba(255, 255, 255, 0.02)",
                  borderRadius: "8px",
                  marginBottom: "4px",
                  border: "1px solid rgba(255, 255, 255, 0.04)",
                }}
              >
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: rule.enabled
                      ? "rgba(150, 255, 180, 0.6)"
                      : "rgba(255, 255, 255, 0.2)",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, fontSize: "12px", color: "rgba(255, 255, 255, 0.7)" }}>
                  {rule.label || rule.pattern}
                  <span style={{ color: "rgba(255, 255, 255, 0.25)", marginLeft: "6px", fontSize: "10px" }}>
                    {rule.type}
                  </span>
                </div>
                <button
                  onClick={() => toggleRule(rule.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.3)",
                    fontSize: "11px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {rule.enabled ? "disable" : "enable"}
                </button>
                <button
                  onClick={() => removeRule(rule.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255, 150, 150, 0.5)",
                    fontSize: "11px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  remove
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {settings.protectionRules.length === 0 && (
            <div
              style={{
                fontSize: "12px",
                color: "rgba(255, 255, 255, 0.25)",
                textAlign: "center",
                padding: "16px",
              }}
            >
              No protected sites yet
            </div>
          )}
        </Section>
      </motion.div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "32px" }}>
      <h2
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "rgba(255, 255, 255, 0.35)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "12px",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          borderRadius: "12px",
          border: "1px solid rgba(255, 255, 255, 0.04)",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
      }}
    >
      <div>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "rgba(255, 255, 255, 0.85)",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "rgba(255, 255, 255, 0.35)",
            marginTop: "2px",
          }}
        >
          {description}
        </div>
      </div>
      {children}
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
        width: "40px",
        height: "22px",
        borderRadius: "11px",
        border: "none",
        cursor: "pointer",
        position: "relative",
        background: checked
          ? "rgba(150, 180, 255, 0.3)"
          : "rgba(255, 255, 255, 0.08)",
        transition: "background 0.2s ease",
        flexShrink: 0,
      }}
    >
      <motion.div
        animate={{ x: checked ? 19 : 3 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          background: checked
            ? "rgba(180, 200, 255, 0.9)"
            : "rgba(255, 255, 255, 0.4)",
          position: "absolute",
          top: "3px",
        }}
      />
    </button>
  );
}
