// src/App.js
import React, { useEffect, useState, useRef } from "react";
import SockJS from "sockjs-client";
import { Client as StompClient } from "@stomp/stompjs";

const BASE_URL = "http://10.60.59.87:8080"; // update to your backend IP

function formatDate(dtStr) {
  if (!dtStr) return "";
  try {
    const d = new Date(dtStr);
    return d.toLocaleString();
  } catch { return dtStr; }
}

export default function App() {
  const [view, setView] = useState(null); // 'alerts' | 'efirs'
  const [alerts, setAlerts] = useState([]);
  const [efirs, setEfirs] = useState([]);
  const [popup, setPopup] = useState(null); // {type:'alert'|'efir', data: {...}}
  const stompRef = useRef(null);

  useEffect(() => {
    // subscribe to STOMP topics
    const sock = new SockJS(`${BASE_URL}/ws`);
    const client = new StompClient({
      webSocketFactory: () => sock,
      debug: () => { },
      onConnect: () => {
        client.subscribe("/topic/alerts", (msg) => {
          try {
            const body = JSON.parse(msg.body);
            setPopup({ type: "alert", data: body });
            // also prepend to local alerts for immediate UI feedback
            setAlerts(prev => [body, ...prev]);
            setTimeout(() => setPopup(null), 4000);
          } catch (e) { console.error(e); }
        });
        client.subscribe("/topic/efirs", (msg) => {
          try {
            const body = JSON.parse(msg.body);
            setPopup({ type: "efir", data: body });
            setEfirs(prev => [body, ...prev]);
            setTimeout(() => setPopup(null), 4000);
          } catch (e) { console.error(e); }
        });
      },
      onStompError: (err) => {
        console.error("Stomp error", err);
      }
    });
    client.activate();
    stompRef.current = client;

    return () => {
      try { client.deactivate(); } catch (e) { }
    };
  }, []);

  useEffect(() => {
    if (view === "alerts") fetchAlerts();
    if (view === "efirs") fetchEfirs();
  }, [view]);

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/main/alerts`);
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const fetchEfirs = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/main/efirs`);
      const data = await res.json();
      setEfirs(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", minHeight: "100vh", position: "relative", padding: 24 }}>
      {/* Background Image */}
      <img
        src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1350&q=80"
        alt="Evening Mountains"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: -1
        }}
      />
      <div style={{
        maxWidth: 900,
        margin: "0 auto",
        background: "rgba(10, 10, 10, 0.69)", // semi-transparent overlay
        padding: 24,
        borderRadius: 12,
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.06)"
      }}
      >
        <h1 style={{ textAlign: "center", color: "#fff", marginBottom: 8 }}>POLICE DASHBOARD</h1>
        <p style={{ textAlign: "center", color: "#ddd", marginTop: 0 }}>Live alerts and E-FIRs</p>

        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 16 }}>
          <button onClick={() => setView("alerts")} style={{ padding: "12px 28px", borderRadius: 8, border: "none", background: "#e74c3c", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
            Alerts
          </button>
          <button onClick={() => setView("efirs")} style={{ padding: "12px 28px", borderRadius: 8, border: "none", background: "#16a085", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
            E-FIR
          </button>
        </div>

        <div style={{ marginTop: 22 }}>
          {view === "alerts" && (
            <div>
              <h2>Alert History</h2>
              {alerts.length === 0 ? <p>No alerts yet.</p> : (
                <div style={{ display: "grid", gap: 10 }}>
                  {alerts.map((a) => (
                    <div key={a.id || Math.random()} style={{ padding: 12, borderRadius: 8, background: "#fff", border: "1px solid #f8f6f6ff", cursor: "pointer" }}
                      onClick={() => {
                        if (a.type === 'missing') {
                          alert(
                            `Alert: ${a.type}\n` +
                            `From: ${a.senderUsername}\n` +
                            `Date: ${formatDate(a.dateTime)}\n` +
                            `Location: ${a.location}\n` +
                            `Missing Name: ${a.missingName}\n` +
                            `Missing Tourist ID: ${a.missingTouristId}\n` +
                            `Last Seen: ${a.missingLastSeen}\n` +
                            `Details: ${a.details || ''}`
                          );
                        } else {
                          alert(
                            `Alert: ${a.type}\n` +
                            `From: ${a.senderUsername}\n` +
                            `Date: ${formatDate(a.dateTime)}\n` +
                            `Location: ${a.location}\n` +
                            `Details: ${a.details || ''}`
                          );
                        }
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div style={{ fontWeight: 700 }}>{a.type?.toUpperCase() || "ALERT"}</div>
                        <div style={{ color: "#777" }}>{formatDate(a.dateTime)}</div>
                      </div>
                      <div style={{ color: "#555", marginTop: 6 }}>{a.senderUsername} — {a.location}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === "efirs" && (
            <div>
              <h2>E-FIR History</h2>
              {efirs.length === 0 ? <p>No E-FIRs generated yet.</p> : (
                <div style={{ display: "grid", gap: 10 }}>
                  {efirs.map((e) => (
                    <div key={e.id || Math.random()} style={{ padding: 12, borderRadius: 8, background: "#faf8f8ff", border: "1px solid #080808ff", cursor: "pointer" }}
                      onClick={() => {
                        let msg = `E-FIR\nStation: ${e.station}\nDate: ${formatDate(e.dateTime)}\nDetails: ${e.details || ""}`;
                        if (e.missingName) {
                          msg += `\nMissing Name: ${e.missingName}`;
                          msg += `\nMissing Tourist ID: ${e.missingTouristId || "N/A"}`;
                          msg += `\nLast Seen: ${e.missingLastSeen || "N/A"}`;
                        }
                        alert(msg);
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div style={{ fontWeight: 700 }}>{e.station}</div>
                        <div style={{ color: "#777" }}>{formatDate(e.dateTime)}</div>
                      </div>
                      <div style={{ color: "#555", marginTop: 6 }}>{(e.details || "").substring(0, 150)}{(e.details || "").length > 150 ? "..." : ""}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {popup && (
          <div style={{
            position: "fixed", right: 24, top: 24, zIndex: 9999,
            background: popup.type === "alert" ? "#ffecec" : "#e8fff0",
            borderLeft: popup.type === "alert" ? "6px solid #e74c3c" : "6px solid #16a085",
            padding: 12, borderRadius: 8, boxShadow: "0 8px 30px rgba(0,0,0,0.12)"
          }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ fontSize: 22 }}>{popup.type === "alert" ? "❗" : "📨"}</div>
              <div>
                <div style={{ fontWeight: 800 }}>{popup.type === "alert" ? "Alert !!!" : "E-FIR Generated"}</div>
                <div style={{ maxWidth: 380, fontSize: 13, color: "#333" }}>{popup.data && (popup.data.details || popup.data.type || JSON.stringify(popup.data)).toString().slice(0, 200)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

  );
}