import React, { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Search, Send, X } from "lucide-react";
import { apiUrl } from "../lib/api";

async function chatRequest(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    credentials: "include",
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || `Request failed (${response.status}).`);
  return payload;
}

const contactId = (contact) => String(contact.id || contact._id);

export default function ChatWidget({ account, role }) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  const loadContacts = useCallback(async () => {
    try {
      const params = role === "admin" && search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
      const { contacts: nextContacts } = await chatRequest(`/api/messages/contacts${params}`);
      setContacts(nextContacts);
      setSelected((current) => nextContacts.some((item) => contactId(item) === current) ? current : "");
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [role, search]);

  const loadMessages = useCallback(async (recipientId) => {
    if (!recipientId) {
      setMessages([]);
      return;
    }
    try {
      const { messages: nextMessages } = await chatRequest(`/api/messages/${encodeURIComponent(recipientId)}`);
      setMessages(nextMessages);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(loadContacts, 220);
    return () => window.clearTimeout(timer);
  }, [loadContacts, open]);

  useEffect(() => {
    if (!open || !selected) {
      setMessages([]);
      return undefined;
    }
    setLoading(true);
    loadMessages(selected).finally(() => setLoading(false));
    const timer = window.setInterval(() => loadMessages(selected), 3000);
    return () => window.clearInterval(timer);
  }, [loadMessages, open, selected]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !selected || sending) return;
    setSending(true);
    setError("");
    try {
      await chatRequest(`/api/messages/${encodeURIComponent(selected)}`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      setDraft("");
      await loadMessages(selected);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  };

  const selectedContact = contacts.find((item) => contactId(item) === selected);

  return (
    <>
      {open && <section className={`chat-panel ${role === "admin" ? "admin-chat-panel" : ""}`} aria-label="Private messages">
        <header className="chat-header">
          <div><MessageCircle size={17} /><span><b>Messages</b><small>{role === "admin" ? "Private administrator chat" : "Private family chat"}</small></span></div>
          <button onClick={() => setOpen(false)} aria-label="Close messages"><X size={17} /></button>
        </header>
        <div className="chat-contact-bar">
          {role === "admin" && <label className="chat-search"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find an account" aria-label="Find an account to message" /></label>}
          {contacts.length > 0 ? (
            <select value={selected} onChange={(event) => setSelected(event.target.value)} aria-label="Choose a contact">
              <option value="">Choose {role === "admin" ? "an account" : "your family contact"}</option>
              {contacts.map((contact) => <option key={contactId(contact)} value={contactId(contact)}>{contact.displayName} · {contact.role}{contact.status === "suspended" ? " (suspended)" : ""}</option>)}
            </select>
          ) : <span>{role === "admin" ? "No matching accounts." : "Your family contact is not linked yet."}</span>}
        </div>
        {selectedContact && <div className="chat-selected-contact"><b>{selectedContact.displayName}</b><span>{selectedContact.email}</span></div>}
        <div className="chat-messages" aria-live="polite">
          {!selected && <p className="chat-empty">Choose a contact to open a private conversation.</p>}
          {selected && loading && messages.length === 0 && <p className="chat-empty">Loading messages…</p>}
          {selected && !loading && messages.length === 0 && <p className="chat-empty">No messages yet. Start the conversation.</p>}
          {messages.map((message) => {
            const own = String(message.fromUserId) === String(account.id);
            return <div key={message._id || message.id} className={`chat-message ${own ? "own" : ""}`}>
              <p>{message.content}</p>
              <time>{new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(message.createdAt))}</time>
            </div>;
          })}
          <div ref={endRef} />
        </div>
        {error && <p className="chat-error" role="alert">{error}</p>}
        <form className="chat-compose" onSubmit={sendMessage}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} disabled={!selected || sending || selectedContact?.status === "suspended"} placeholder={selectedContact?.status === "suspended" ? "This account is suspended" : "Write a message…"} aria-label="Write a message" />
          <button type="submit" disabled={!selected || !draft.trim() || sending || selectedContact?.status === "suspended"} aria-label="Send message"><Send size={16} /></button>
        </form>
      </section>}
      <button className={`chat-launcher ${role === "admin" ? "admin-chat-launcher" : ""}`} onClick={() => setOpen((current) => !current)} aria-label={open ? "Close messages" : "Open messages"}>
        <MessageCircle size={19} /><span>{open ? "Close" : "Messages"}</span>
      </button>
    </>
  );
}
