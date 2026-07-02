import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ProtectionOverlayProps {
  visible: boolean;
  ruleLabel: string;
  onDismiss: () => void;
}

export function ProtectionOverlay({
  visible,
  ruleLabel,
  onDismiss,
}: ProtectionOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onDismiss}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2147483647,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            pointerEvents: "auto",
            cursor: "pointer",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{
              duration: 0.35,
              ease: [0.23, 1, 0.32, 1],
              delay: 0.05,
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              padding: "32px 40px",
              background: "rgba(25, 25, 30, 0.88)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              boxShadow:
                "0 16px 64px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.03) inset",
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
              textAlign: "center",
              maxWidth: "320px",
            }}
          >
            {/* Shield icon */}
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(150, 180, 255, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(150, 180, 255, 0.12)",
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(150, 180, 255, 0.7)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>

            <div
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "rgba(255, 255, 255, 0.9)",
                letterSpacing: "-0.01em",
              }}
            >
              This page is protected
            </div>

            <div
              style={{
                fontSize: "13px",
                color: "rgba(255, 255, 255, 0.45)",
                lineHeight: "1.5",
              }}
            >
              {ruleLabel} is in your protected sites list.
              <br />
              Gesture close is disabled here.
            </div>

            <div
              style={{
                fontSize: "11px",
                color: "rgba(255, 255, 255, 0.25)",
                marginTop: "4px",
              }}
            >
              Click anywhere to dismiss
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
