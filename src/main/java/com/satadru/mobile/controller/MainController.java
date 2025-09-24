package com.satadru.mobile.controller;

import com.satadru.mobile.model.Alert;
import com.satadru.mobile.model.Efir;
import com.satadru.mobile.model.Tourist;
import com.satadru.mobile.repository.TouristRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.*;

@RestController
@RequestMapping("/api/main")
@CrossOrigin(origins = "*")
public class MainController {

    private static final Set<String> HARDCODED_IDS = Set.of("T002", "T003", "T004", "T005", "T006");

    @Autowired
    private TouristRepository touristRepository;

    @Autowired
    private DatabaseController databaseController;

    /**
     * loginOrRegister payload (JSON):
     * {
     * "username": "...",
     * "password": "...",
     * "name": "...", // optional for existing users
     * "touristId": "...", // optional for existing users
     * "latitude": 12.34,
     * "longitude": 56.78
     * }
     *
     * Behavior:
     * - If username exists and password matches => update location (real-time)
     * - If username not found => create new tourist using name & touristId
     * (register) and location
     * - Returns Tourist object (saved)
     */
    @PostMapping("/loginOrRegister")
    public ResponseEntity<?> loginOrRegister(@RequestBody Map<String, Object> payload) {
        String username = (String) payload.get("username");
        String password = (String) payload.get("password");
        Double latitude = payload.get("latitude") == null ? 0.0 : ((Number) payload.get("latitude")).doubleValue();
        Double longitude = payload.get("longitude") == null ? 0.0 : ((Number) payload.get("longitude")).doubleValue();

        Optional<Tourist> existing = touristRepository.findByUsername(username);

        if (existing.isPresent()) {
            Tourist t = existing.get();
            // check password match (simple plain-text match here; hash in production)
            if (!t.getPassword().equals(password)) {
                return ResponseEntity.status(401).body(Map.of("status", "unauthorized", "message", "Wrong password"));
            }
            // update location via DatabaseController
            if (!HARDCODED_IDS.contains(t.getTouristId())) {
                DatabaseController.LocationPayload lp = new DatabaseController.LocationPayload();
                lp.setLatitude(latitude);
                lp.setLongitude(longitude);
                databaseController.updateLocation(t.getId(), lp);
            }
            return ResponseEntity.ok(touristRepository.findById(t.getId()).get());
        } else {
            // register new user: need name & touristId
            String name = (String) payload.get("name");
            String touristId = (String) payload.get("touristId");
            if (name == null || touristId == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("status", "error", "message", "name & touristId required for new user"));
            }
            Tourist newT = new Tourist(touristId, name, username, password, latitude, longitude);
            // delegate to DatabaseController to save and broadcast
            ResponseEntity<Tourist> created = databaseController.createTourist(newT);
            return ResponseEntity.ok(created.getBody());
        }
    }

    // NEW: receive alerts from mobile app
    @PostMapping("/sendAlert")
    public ResponseEntity<?> sendAlert(@RequestBody Map<String, Object> payload) {
        try {
            String type = (String) payload.get("type"); // distress | crime | missing
            String senderUsername = (String) payload.get("senderUsername");
            String senderTouristId = payload.get("senderTouristId") == null ? null
                    : String.valueOf(payload.get("senderTouristId"));
            String location = payload.get("location") == null ? "" : String.valueOf(payload.get("location"));
            String details = payload.get("details") == null ? "" : String.valueOf(payload.get("details"));
            String dateTimeStr = payload.get("dateTime") == null ? null : String.valueOf(payload.get("dateTime"));

            LocalDateTime dateTime = LocalDateTime.now();
            if (dateTimeStr != null) {
                try {
                    dateTime = LocalDateTime.parse(dateTimeStr);
                } catch (DateTimeParseException e) {
                    // fallback to now
                }
            }

            Alert alert = new Alert();
            alert.setType(type);
            alert.setSenderUsername(senderUsername);
            alert.setSenderTouristId(senderTouristId);
            alert.setDateTime(dateTime);
            alert.setLocation(location);
            alert.setDetails(details);

            // missing-specific
            if ("missing".equalsIgnoreCase(type)) {
                alert.setMissingName((String) payload.getOrDefault("missingName", ""));
                alert.setMissingTouristId((String) payload.getOrDefault("missingTouristId", ""));
                alert.setMissingLastSeen((String) payload.getOrDefault("missingLastSeen", ""));
            }

            // Save alert via DatabaseController (which will broadcast it to /topic/alerts)
            ResponseEntity<Alert> savedResp = databaseController.createAlert(alert);
            Alert savedAlert = savedResp.getBody();

            Map<String, Object> resp = new HashMap<>();
            resp.put("alert", savedAlert);

            // If crime or missing -> auto-generate E-FIR
            if ("crime".equalsIgnoreCase(type) || "missing".equalsIgnoreCase(type)) {
                Efir efir = generateEfirForAlert(savedAlert);
                ResponseEntity<Efir> efirResp = databaseController.createEfir(efir);
                resp.put("efir", efirResp.getBody());
            }

            return ResponseEntity.ok(resp);
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("status", "error", "message", ex.getMessage()));
        }
    }

    // NEW: list alerts (optionally filter by username)
    @GetMapping("/alerts")
    public ResponseEntity<List<Alert>> getAlerts(@RequestParam(required = false) String username) {
        List<Alert> all = databaseController.getAllAlerts();
        if (username == null || username.isBlank()) return ResponseEntity.ok(all);
        List<Alert> filtered = new ArrayList<>();
        for (Alert a : all) {
            if (username.equals(a.getSenderUsername())) filtered.add(a);
        }
        return ResponseEntity.ok(filtered);
    }

    // NEW: list efirs (optionally filter by username)
    @GetMapping("/efirs")
    public ResponseEntity<List<Efir>> getEfirs(@RequestParam(required = false) String username) {
        List<Efir> all = databaseController.getAllEfirs();
        if (username == null || username.isBlank()) return ResponseEntity.ok(all);
        List<Efir> filtered = new ArrayList<>();
        for (Efir e : all) {
            if (username.equals(e.getSenderUsername())) filtered.add(e);
        }
        return ResponseEntity.ok(filtered);
    }

    // helper: create a simple E-FIR for given alert
    private Efir generateEfirForAlert(Alert alert) {
        // Very simple nearest-station logic:
        // If alert.location is "lat,lon" -> we compute nearest from hardcoded stations.
        // Otherwise fallback to "Nearest Police Station".
        String location = alert.getLocation() == null ? "" : alert.getLocation();
        String station = "Nearest Police Station";

        // hardcoded simple stations (lat, lon, name)
        double[][] stations = {
                // lat, lon; stationName index mapping below
                {22.4865, 88.3136},
                {22.4843, 88.3399}, 
                {22.7100, 88.3200}, 
                {22.516525, 88.418213}, 
                {22.5667,  88.3475} 
        };
        String[] stationNames = {
                "Behala Police Station",
                "Behala Police Station",
                "Serampore Police Station",
                "Anandapur Police Station",
                "Burra Bazar Police Station"
        };

        try {
            if (location.contains(",")) {
                String[] parts = location.split(",");
                double lat = Double.parseDouble(parts[0].trim());
                double lon = Double.parseDouble(parts[1].trim());
                // find nearest
                double bestDist = Double.MAX_VALUE;
                int bestIdx = 0;
                for (int i = 0; i < stations.length; i++) {
                    double d = haversine(lat, lon, stations[i][0], stations[i][1]);
                    if (d < bestDist) { bestDist = d; bestIdx = i; }
                }
                station = stationNames[bestIdx];
            }
        } catch (Exception e) {
            // ignore and use fallback
        }

        String efirDetails = "Auto-generated E-FIR for alert id: " + alert.getId()
                + "\nType: " + alert.getType()
                + "\nDetails: " + (alert.getDetails() == null ? "" : alert.getDetails())
                + "\nLocation: " + (alert.getLocation() == null ? "" : alert.getLocation());

        Efir efir = new Efir(LocalDateTime.now(), station, efirDetails, alert.getId(), alert.getSenderUsername());
        return efir;
    }

    // haversine (km)
    private static double haversine(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat/2) * Math.sin(dLat/2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon/2) * Math.sin(dLon/2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
}
