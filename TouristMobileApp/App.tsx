import React, { useEffect, useRef, useState } from "react";
import {
  View,
  TextInput,
  Button,
  Alert,
  Text,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TouchableWithoutFeedback
} from "react-native";
import Geolocation from "@react-native-community/geolocation";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

interface Profile {
  id: number;
  touristId: string;
  name: string;
  username: string;
  latitude: number;
  longitude: number;
}

const BASE_URL = "http://10.60.59.87:8080"; // update to your machine IP

export default function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [touristId, setTouristId] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [trackingScreen, setTrackingScreen] = useState(false); // 🔹 new state for tracking screen
  const webviewRef = useRef<WebView>(null);

  const [watchId, setWatchId] = useState<number | null>(null);
  const [initialCoords, setInitialCoords] = useState<[number, number] | null>(null);

  // === New states for panic / alerts / efir ===
  const [showPanicOptions, setShowPanicOptions] = useState(false);
  const [showPanicForm, setShowPanicForm] = useState(false);
  const [panicType, setPanicType] = useState<'distress' | 'crime' | 'missing' | null>(null);

  const [alertLocation, setAlertLocation] = useState("");
  const [alertDetails, setAlertDetails] = useState("");

  // missing person fields
  const [missingName, setMissingName] = useState("");
  const [missingTouristId, setMissingTouristId] = useState("");
  const [missingLastSeen, setMissingLastSeen] = useState("");
  const [missingLocation, setMissingLocation] = useState("");
  const [missingDetails, setMissingDetails] = useState("");

  const [alertsLog, setAlertsLog] = useState<any[]>([]);
  const [generatedEfirLogs, setGeneratedEfirLogs] = useState<any[]>([]);
  const [showEfirList, setShowEfirList] = useState(false);

  async function requestLocationPermission() {
    if (Platform.OS !== "android") return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location permission",
          message: "This app needs location to track your position for safety.",
          buttonPositive: "OK",
          buttonNegative: "Cancel",
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }

  useEffect(() => {
    async function startTracking() {
      if (!loggedIn || !touristId) return;

      const hasPermission =
        Platform.OS === "android"
          ? await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: "Location Permission",
              message: "This app needs location access to track your position for safety.",
              buttonPositive: "OK",
              buttonNegative: "Cancel",
            }
          ).then((res) => res === PermissionsAndroid.RESULTS.GRANTED)
          : true;

      if (hasPermission) {
        Geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            console.log("Got position:", latitude, longitude);

            fetch(`${BASE_URL}/api/tourists/${profile?.id}/location`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ latitude, longitude }),
            })
              .catch((err) =>
                console.error("Failed to send location:", err)
              );
          },
          (err) => console.error("Location error:", err),
          { enableHighAccuracy: true, distanceFilter: 5, interval: 2000, fastestInterval: 1000 }
        );
      } else {
        Alert.alert(
          "Permission Denied",
          "Location access is required for tracking."
        );
      }
    }

    startTracking();
  }, [loggedIn, touristId]);

  const startLocationWatch = () => {
    const id = Geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        try {
          const payload: any = {
            username,
            password,
            latitude: lat,
            longitude: lon
          };
          if (!profile && isNewUser) {
            payload.name = name;
            payload.touristId = touristId;
          }
          const res = await fetch(`${BASE_URL}/api/main/loginOrRegister`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const data = await res.json();

          // First, set profile so WebView and state are up-to-date
          if (data && !data.status) {
            setProfile(data);
          } else if (data?.status === 'unauthorized') {
            return;
          }

          // Now update location on backend using the returned id
          if (data?.id) {
            fetch(`${BASE_URL}/api/tourists/${data.id}/location`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ latitude: lat, longitude: lon }),
            }).catch(err => console.error("Failed to update location", err));
          }

        } catch (err) {
          console.error("Error sending location:", err);
        }
      },
      (err) => {
        console.error("Geo error:", err);
      },
      { enableHighAccuracy: true, distanceFilter: 5, interval: 2000, fastestInterval: 1000 }
    );
    setWatchId(id as unknown as number);
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Please enter username & password");
      return;
    }

    try {
      const checkRes = await fetch(`${BASE_URL}/api/tourists/by-username?username=${encodeURIComponent(username)}`);
      if (checkRes.status === 200) {
        setIsNewUser(false);
        Geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            setInitialCoords([lat, lon]);

            const payload = { username, password, latitude: lat, longitude: lon };
            const res = await fetch(`${BASE_URL}/api/main/loginOrRegister`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (res.status === 200) {
              setProfile(data);
              setLoggedIn(true);
            } else {
              Alert.alert("Login failed", data.message || "Check credentials");
            }
          },
          (err) => { Alert.alert("Location error", "Allow location permission"); console.error(err); },
          { enableHighAccuracy: true }
        );
      } else if (checkRes.status === 404) {
        setIsNewUser(true);
        Alert.alert("New user", "Please fill name and tourist ID then press Register button");
      } else {
        Alert.alert("Error", "Something went wrong checking username");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not connect to server");
    }
  };

  const handleRegister = async () => {
    if (!username || !password || !name || !touristId) {
      Alert.alert("Please enter username, password, name and touristId");
      return;
    }
    Geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setInitialCoords([lat, lon]);

        const payload = { username, password, name, touristId, latitude: lat, longitude: lon };
        try {
          const res = await fetch(`${BASE_URL}/api/main/loginOrRegister`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (res.status === 200) {
            setProfile(data);
            setLoggedIn(true);
          } else {
            Alert.alert("Register failed", data.message || "Error");
          }
        } catch (err) {
          console.error(err);
          Alert.alert("Error", "Could not register");
        }
      },
      (err) => { console.error(err); Alert.alert("Location error", "Allow location permission"); },
      { enableHighAccuracy: true }
    );
  };

  // leaflet WebView HTML (connects to STOMP over SockJS)
  const mapHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="initial-scale=1.0, user-scalable=no" />
    <title>Tourist Map</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
    <style> html, body, #map { height: 100%; margin:0; padding:0 } </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sockjs-client@1/dist/sockjs.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/stompjs@2.3.3/lib/stomp.min.js"></script>
    <script>
      const redIcon = new L.Icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
       shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
       iconSize: [25, 41],
       iconAnchor: [12, 41],
       popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      const blueIcon = new L.Icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
       iconSize: [25, 41],
       iconAnchor: [12, 41],
       popupAnchor: [1, -34],
       shadowSize: [41, 41]
      });

      const map = L.map('map').setView([${initialCoords ? initialCoords[0] : 20.5937}, ${initialCoords ? initialCoords[1] : 78.9629}], ${initialCoords ? 5 : 5}); // 🔹 start at user location if available
      const myId = "${username || ''}"; // the app's username - Leaflet will use this to follow the logged-in user

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
         maxZoom: 19
      }).addTo(map);

      // store markers by username or touristId
      const markers = {};
      const firstTime = {};

  function drawMarkers(list) {
    try { console.log('drawMarkers payload', list); } catch(e){}

    list.forEach(t => {
    if (t.latitude == null || t.longitude == null) return;
    const id = t.username || t.touristId || t.id;
    const lat = parseFloat(t.latitude);
    const lng = parseFloat(t.longitude);

    if (markers[id]) {
          const m = markers[id];
          const cur = m.getLatLng();
          // only update if coordinates changed
          if (Math.abs(cur.lat - lat) > 1e-6 || Math.abs(cur.lng - lng) > 1e-6) {
            m.setLatLng([lat, lng])
            .setPopupContent(t.name + " (" + t.touristId + ")");

            // Update icon depending on user type
            if (id === myId) {
              m.setIcon(redIcon);
            } else {
              m.setIcon(blueIcon);
            }

            // Keep popup open
            m.openPopup();
          }
        } else {
          const m = L.marker([lat, lng], { icon: id === myId ? redIcon : blueIcon })
            .addTo(map)
            .bindPopup('<div style="font-weight:bold; color:#2c3e50;">' + t.name + ' (' + t.touristId + ')</div>')
          markers[id] = m;

          //Only center on first creation of logged-in user
          if (id === myId && !firstTime[id]) {
            map.setView([lat, lng], 11); // initial zoom
            firstTime[id] = true;
          }

          // Auto-open popup on first creation
          //m.openPopup();
        }

      });
    }

      // fetch initial snapshot
      fetch('${BASE_URL}/api/tourists/locations')
        .then(r => r.json())
        .then(data => { drawMarkers(data); });

      // connect STOMP SockJS
      const sock = new SockJS('${BASE_URL}/ws');
      const stompClient = Stomp.over(sock);
      stompClient.connect({}, function(frame) {
        console.log('Connected: ' + frame);
        stompClient.subscribe('/topic/locations', function(message) {
          try {
            const payload = JSON.parse(message.body);
            // payload is array of tourists
            drawMarkers(payload);
          } catch(e) {
            console.error('parse error', e);
          }
        });
      }, function(err) {
        console.error('STOMP error', err);
      });
    </script>
  </body>
  </html>
  `;

  // ===================== NEW: helper to send alert to backend =====================
  const sendAlert = async () => {
    if (!panicType) {
      Alert.alert("Error", "No alert type selected");
      return;
    }

    // Build payload
    const dateTime = new Date().toISOString();
    let loc = alertLocation;
    if (!loc && initialCoords) {
      loc = `${initialCoords[0]},${initialCoords[1]}`;
    }

    const basePayload: any = {
      type: panicType,
      senderUsername: username,
      senderTouristId: profile?.touristId,
      dateTime,
      location: loc,
    };

    if (panicType === 'distress' || panicType === 'crime') {
      if (!alertDetails || alertDetails.trim().length < 3) {
        Alert.alert("Validation", "Please enter details for the alert.");
        return;
      }
      basePayload.details = alertDetails.trim();
    }

    if (panicType === 'missing') {
      if (!missingName || !missingTouristId || !missingLastSeen) {
        Alert.alert("Validation", "Please enter name, tourist ID and last seen location for missing person.");
        return;
      }
      basePayload.missingName = missingName;
      basePayload.missingTouristId = missingTouristId;
      basePayload.missingLastSeen = missingLastSeen;
      basePayload.location = missingLocation || basePayload.location;
      basePayload.details = missingDetails || "";
    }

    try {
      const res = await fetch(`${BASE_URL}/api/main/sendAlert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(basePayload),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("sendAlert failed", err);
        Alert.alert("Error", "Could not send alert to server");
        return;
      }

      const data = await res.json().catch(() => null);

      // append to local alerts log
      setAlertsLog(prev => [{ ...basePayload, serverResponse: data }, ...prev]);

      // show mobile-specific confirmation message
      if (panicType === 'missing') {
        Alert.alert("Success", "Alert Message Sent !!! Stay calm and have faith !!!");
      } else {
        Alert.alert("Success", "Alert Message Sent !!! Please be patient and safe !!!");
      }

      // close forms and reset
      resetPanicForm();
      setShowPanicForm(false);
      setShowPanicOptions(false);

      // fetch latest efirs immediately after sending (useful if backend auto-generates efir)
      fetchEfirsOnce();

    } catch (err) {
      console.error("sendAlert error", err);
      Alert.alert("Error", "Network error while sending alert");
    }
  };

  const resetPanicForm = () => {
    setPanicType(null);
    setAlertLocation("");
    setAlertDetails("");
    setMissingName("");
    setMissingTouristId("");
    setMissingLastSeen("");
    setMissingLocation("");
    setMissingDetails("");
  };

  // ===================== Polling for E-FIRs (lightweight) =====================
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (loggedIn && username) {
      // initial fetch
      fetchEfirsOnce();
      // then poll
      interval = setInterval(fetchEfirsOnce, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, username]);

  const fetchEfirsOnce = async () => {
    const res = await fetch(`${BASE_URL}/api/main/efirs?username=${profile?.username}`);
    const data = await res.json();
    setGeneratedEfirLogs(Array.isArray(data) ? data : []);
  };


  // ===================== UI routes / screens =====================

  // LOGIN / REGISTER SCREEN
  if (!loggedIn) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 20, backgroundColor: '#add8e6' }}>
        <Text style={[styles.header, { textAlign: 'center', fontSize: 26 }]}>TOURIST LOGIN</Text>

        <Text style={styles.label}>Enter username:</Text>
        <TextInput placeholder="Username" value={username} onChangeText={setUsername} style={styles.input} />

        <Text style={styles.label}>Enter password:</Text>
        <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />

        <Button title="Check / Login" onPress={handleLogin} />

        {isNewUser && (
          <>
            <Text style={styles.label}>Enter full name:</Text>
            <TextInput placeholder="Full name" value={name} onChangeText={setName} style={styles.input} />

            <Text style={styles.label}>Enter tourist ID:</Text>
            <TextInput placeholder="Tourist ID" value={touristId} onChangeText={setTouristId} style={styles.input} />

            <Button title="Register & Start Tracking" onPress={handleRegister} />
          </>
        )}
      </SafeAreaView>
    );
  }

  // PANIC OPTIONS SCREEN
  if (showPanicOptions && !showPanicForm) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 20, backgroundColor: '#f6f8fa' }}>
        <Text style={{ fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 20 }}>Panic Options</Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#e74c3c' }]}
          onPress={() => { setPanicType('distress'); setShowPanicForm(true); }}
        >
          <Text style={styles.buttonText}>Generate Distress Signal</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#f39c12' }]}
          onPress={() => { setPanicType('crime'); setShowPanicForm(true); }}
        >
          <Text style={styles.buttonText}>Crime Report</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#9b59b6' }]}
          onPress={() => { setPanicType('missing'); setShowPanicForm(true); }}
        >
          <Text style={styles.buttonText}>Missing Person</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#95a5a6' }]}
          onPress={() => setShowPanicOptions(false)}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // PANIC FORM SCREEN (for distress / crime / missing)
  if (showPanicForm && panicType) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 16, backgroundColor: '#fff' }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12, textAlign: 'center' }}>
            {panicType === 'distress' ? 'Distress Signal' : panicType === 'crime' ? 'Crime Report' : 'Missing Person Report'}
          </Text>

          {/* Location (optional) */}
          <Text style={styles.label}>Location (optional, leave blank to use current coords):</Text>
          <TextInput placeholder="Location (address or coordinates)" value={panicType === 'missing' ? missingLocation : alertLocation} onChangeText={text => panicType === 'missing' ? setMissingLocation(text) : setAlertLocation(text)} style={styles.input} />

          {panicType !== 'missing' && (
            <>
              <Text style={styles.label}>Details:</Text>
              <TextInput placeholder="Describe the situation" value={alertDetails} onChangeText={setAlertDetails} style={[styles.input, { height: 100 }]} multiline />
            </>
          )}

          {panicType === 'missing' && (
            <>
              <Text style={styles.label}>Missing Person Name:</Text>
              <TextInput placeholder="Name" value={missingName} onChangeText={setMissingName} style={styles.input} />

              <Text style={styles.label}>Missing Person Tourist ID:</Text>
              <TextInput placeholder="Tourist ID" value={missingTouristId} onChangeText={setMissingTouristId} style={styles.input} />

              <Text style={styles.label}>Last Seen Location:</Text>
              <TextInput placeholder="Last seen location" value={missingLastSeen} onChangeText={setMissingLastSeen} style={styles.input} />

              <Text style={styles.label}>Additional Details:</Text>
              <TextInput placeholder="Other details" value={missingDetails} onChangeText={setMissingDetails} style={[styles.input, { height: 100 }]} multiline />
            </>
          )}

          <TouchableOpacity style={[styles.button, { backgroundColor: '#e74c3c', marginTop: 16 }]} onPress={sendAlert}>
            <Text style={styles.buttonText}>Send Alert</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, { backgroundColor: '#95a5a6', marginTop: 8 }]} onPress={() => { resetPanicForm(); setShowPanicForm(false); }}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // E-FIR list screen
  if (showEfirList) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 12, backgroundColor: '#f0f6fb' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 22, fontWeight: '700' }}>Generated E-FIRs</Text>
          <TouchableOpacity style={[styles.button, { width: 120, backgroundColor: '#95a5a6' }]} onPress={() => setShowEfirList(false)}>
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>

        {generatedEfirLogs.length === 0 ? (
          <View style={{ padding: 20 }}>
            <Text>No E-FIRs generated yet.</Text>
          </View>
        ) : (
          <FlatList
            data={generatedEfirLogs}
            keyExtractor={(item, idx) => `${item.id || idx}`}
            renderItem={({ item }) => (
              <TouchableWithoutFeedback
                onPress={() => {
                  let msg = `Date: ${item.dateTime || item.createdAt || '-'}\nStation: ${item.station || item.nearestStation || '-'}\nDetails: ${item.details || ''}`;

                  // Add missing person info if present
                  if (item.missingName) {
                    msg += `\n\nMissing Person Info:`;
                    msg += `\nName: ${item.missingName}`;
                    msg += `\nTourist ID: ${item.missingTouristId || 'N/A'}`;
                    msg += `\nLast Seen: ${item.missingLastSeen || 'N/A'}`;
                  }

                  Alert.alert(`E-FIR (${item.type || 'E-FIR'})`, msg);
                }}
              >
                <View style={{ backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#e1e7ee' }}>
                  <Text style={{ fontWeight: '700' }}>{item.type || 'E-FIR'}</Text>
                  <Text style={{ color: '#555' }}>{item.dateTime || item.createdAt}</Text>
                  <Text numberOfLines={2} style={{ marginTop: 6 }}>{item.details || item.summary || '—'}</Text>
                </View>
              </TouchableWithoutFeedback>
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  // HOME SCREEN AFTER LOGIN
  if (!trackingScreen) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#add8e6' }}>
        <View style={{ padding: 20, alignItems: 'center', justifyContent: 'center', flex: 1, backgroundColor: '#add8e6' }}>
          <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 20 }}>Welcome, {profile?.name}!</Text>
          <Text style={{ fontSize: 18, color: '#555', marginBottom: 20 }}>Tourist ID: {profile?.touristId}</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => { startLocationWatch(); setTrackingScreen(true); }}
          >
            <Text style={styles.buttonText}>Real Time Tracking</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#e74c3c' }]}
            onPress={() => setShowPanicOptions(true)}
          >
            <Text style={styles.buttonText}>Panic Button</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#9b59b6' }]} // purple for Heat Map
            onPress={() => Alert.alert("Heat Map", "Heat Map feature coming soon!")}
          >
            <Text style={styles.buttonText}>Heat Map</Text>
          </TouchableOpacity>

          {/* NEW: Generated E-FIR Button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#16a085' }]}
            onPress={() => setShowEfirList(true)}
          >
            <Text style={styles.buttonText}>Generated E-FIR</Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    );
  }

  // TRACKING SCREEN (leave map unchanged)
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ padding: 12, backgroundColor: '#3498db', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Live Tracking</Text>
      </View>

      <WebView
        key={profile?.id ? `${profile.id}-${profile.latitude}-${profile.longitude}` : 'map-default'}
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        style={{ flex: 1 }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />


      <View style={{ padding: 10, backgroundColor: '#f9f9f9', flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderColor: '#ccc', borderRadius: 6, margin: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 20, height: 20, backgroundColor: 'red', marginRight: 6, borderRadius: 10 }} />
          <Text>You</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 20, height: 20, backgroundColor: 'blue', marginRight: 6, borderRadius: 10 }} />
          <Text>Other users being tracked live</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 22, fontWeight: '700', marginBottom: 12, color: '#2c3e50' },
  label: { fontSize: 16, marginBottom: 4, color: '#2c3e50' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    color: '#000000'
  },
  button: {
    backgroundColor: '#3498db',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 10,
    width: '80%',
    shadowOpacity: 0.2,
    elevation: 5,
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  }
});
