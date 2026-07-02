import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface UndoToastProps {
  visible: boolean;
  title: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
}

export function UndoToast({
  visible,
  title,
  onUndo,
  onDismiss,
  duration = 3000,
}: UndoToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!visible) return;

    setProgress(100);
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 16);

    return () => clearInterval(interval);
  }, [visible, duration, onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 2147483647,
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              background: "rgba(30, 30, 35, 0.92)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "14px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.04) inset",
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
              minWidth: "220px",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Progress bar */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                height: "2px",
                width: `${progress}%`,
                background:
                  "linear-gradient(90deg, rgba(150, 180, 255, 0.6), rgba(200, 170, 255, 0.4))",
                transition: "width 16ms linear",
                borderRadius: "0 0 14px 14px",
              }}
            />

            {/* Close icon */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              style={{ flexShrink: 0, opacity: 0.5 }}
            >
              <path
                d="M4 4L12 12M4 12L12 4"
                stroke="rgba(255,255,255,0.7)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "rgba(255, 255, 255, 0.85)",
                  lineHeight: "1.3",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "180px",
                }}
              >
                {title || "Tab closed"}
              </div>
            </div>

            <button
              onClick={onUndo}
              style={{
                background: "rgba(150, 180, 255, 0.12)",
                border: "1px solid rgba(150, 180, 255, 0.2)",
                borderRadius: "8px",
                color: "rgba(180, 200, 255, 0.95)",
                fontSize: "12px",
                fontWeight: 600,
                padding: "5px 12px",
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.02em",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(150, 180, 255, 0.2)";
                e.currentTarget.style.borderColor = "rgba(150, 180, 255, 0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(150, 180, 255, 0.12)";
                e.currentTarget.style.borderColor = "rgba(150, 180, 255, 0.2)";
              }}
            >
              Undo
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
