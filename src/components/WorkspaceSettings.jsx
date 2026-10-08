import React, { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Moon, RotateCcw, Sun, Upload, X } from "lucide-react";

const themes = [
  { id: "green", label: "Forest green", color: "#23765a" },
  { id: "blue", label: "Ocean blue", color: "#3671b8" },
  { id: "yellow", label: "Sunshine yellow", color: "#bd8615" },
];

async function readProfileImage(file) {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Choose an image smaller than 5 MB.");

  const source = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 256 / Math.max(source.width, source.height));
    canvas.width = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));
    canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", 0.82);
  } finally {
    source.close();
  }
}

export default function WorkspaceSettings({ open, onClose, preferences, onChange, onStartTour, onSignOut, avatarLabel }) {
  const fileInput = useRef(null);
  const [error, setError] = useState("");

  const chooseImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      onChange({ avatarImage: await readProfileImage(file) });
    } catch (imageError) {
      setError(imageError.message || "The profile photo could not be loaded.");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button className="settings-backdrop" aria-label="Close settings" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside className="settings-drawer" aria-label="Workspace settings" role="dialog" aria-modal="true"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}>
            <div className="settings-heading">
              <div><p className="eyebrow">MAKE IT YOURS</p><h2>Settings</h2></div>
              <button className="settings-close" onClick={onClose} aria-label="Close settings"><X size={18} /></button>
            </div>

            <section className="settings-section">
              <h3>Profile photo</h3>
              <p>Choose an image just for your account on this device.</p>
              <div className="settings-profile">
                <span className="settings-avatar">
                  {preferences.avatarImage ? <img src={preferences.avatarImage} alt="Your profile" /> : avatarLabel}
                </span>
                <button className="settings-action" onClick={() => fileInput.current?.click()}><Upload size={15} /> Upload photo</button>
                {preferences.avatarImage && <button className="settings-remove" onClick={() => onChange({ avatarImage: "" })}>Remove</button>}
                <input ref={fileInput} type="file" accept="image/*" onChange={chooseImage} hidden />
              </div>
              {error && <p className="settings-error" role="alert">{error}</p>}
            </section>

            <section className="settings-section">
              <h3>Appearance</h3>
              <p>Choose a colour and switch between light and dark mode.</p>
              <div className="theme-options" role="group" aria-label="Colour theme">
                {themes.map((theme) => (
                  <button key={theme.id} className={`theme-option ${preferences.theme === theme.id ? "selected" : ""}`}
                    onClick={() => onChange({ theme: theme.id })} aria-pressed={preferences.theme === theme.id}>
                    <span style={{ background: theme.color }} />
                    {theme.label}
                    {preferences.theme === theme.id && <Check size={15} />}
                  </button>
                ))}
              </div>
              <button className="mode-toggle" onClick={() => onChange({ darkMode: !preferences.darkMode })} aria-pressed={preferences.darkMode}>
                <span className="mode-icon">{preferences.darkMode ? <Moon size={17} /> : <Sun size={17} />}</span>
                <span><b>{preferences.darkMode ? "Dark mode" : "Light mode"}</b><small>Applies to your workspace only</small></span>
                <span className={`switch ${preferences.darkMode ? "on" : ""}`} />
              </button>
            </section>

            {onStartTour && <section className="settings-section settings-help">
              <h3>Need a quick guide?</h3>
              <p>Take a short tour of your dashboard and learn how tasks and rewards work.</p>
              <button className="settings-action" onClick={onStartTour}><RotateCcw size={15} /> Replay dashboard tour</button>
            </section>}
            {onSignOut && <button className="settings-signout" onClick={onSignOut}>Sign out of {avatarLabel === "P" ? "parent" : avatarLabel === "A" ? "admin" : "child"} account</button>}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
