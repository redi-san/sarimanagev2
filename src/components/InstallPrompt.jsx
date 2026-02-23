import { useEffect, useState } from "react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  // Detect mobile devices
  const isMobile = /android|iphone|ipad|ipod/i.test(
    navigator.userAgent.toLowerCase()
  );

  useEffect(() => {
    if (!isMobile) return;

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault(); // Stop automatic mini-infobar
      setDeferredPrompt(e);
      setShow(true); // Show our custom install banner
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    window.addEventListener("appinstalled", () => {
      setShow(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, [isMobile]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt(); // Must be triggered by click
    const choice = await deferredPrompt.userChoice;

    setDeferredPrompt(null);

    if (choice.outcome === "accepted") {
      setShow(false);
    }
  };

  if (!isMobile || !show) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: 12,
        background: "#111827",
        color: "white",
        padding: 14,
        borderRadius: 14,
        display: "flex",
        alignItems: "center",
        gap: 12,
        zIndex: 9999,
        boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700 }}>Install Sari Manage</div>
        <div style={{ fontSize: 13, opacity: 0.85 }}>
          Add this app to your home screen for faster access.
        </div>
      </div>

      <button
        onClick={handleInstall}
        style={{
          background: "white",
          color: "#111827",
          border: "none",
          padding: "8px 14px",
          borderRadius: 10,
          fontWeight: 700,
          cursor: "pointer"
        }}
      >
        Install
      </button>

      <button
        onClick={() => setShow(false)}
        style={{
          background: "transparent",
          color: "white",
          border: "1px solid rgba(255,255,255,0.3)",
          padding: "8px 14px",
          borderRadius: 10,
          fontWeight: 700,
          cursor: "pointer"
        }}
      >
        Not now
      </button>
    </div>
  );
}