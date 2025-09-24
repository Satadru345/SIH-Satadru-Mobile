package com.satadru.mobile.controller;

import com.satadru.mobile.model.Tourist;
import com.satadru.mobile.repository.TouristRepository;

// add imports
import com.satadru.mobile.model.Alert;
import com.satadru.mobile.model.Efir;
import com.satadru.mobile.repository.AlertRepository;
import com.satadru.mobile.repository.EfirRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/tourists")
@CrossOrigin(origins = "*")
public class DatabaseController {

    @Autowired
    private TouristRepository touristRepository;

    @Autowired
    private AlertRepository alertRepository;

    @Autowired
    private EfirRepository efirRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Create (register) a tourist
    @PostMapping
    public ResponseEntity<Tourist> createTourist(@RequestBody Tourist tourist) {
        Tourist saved = touristRepository.save(tourist);
        messagingTemplate.convertAndSend("/topic/locations", touristRepository.findAll());
        return ResponseEntity.ok(saved);
    }

    // Update only location for an existing tourist (by DB id)
    @PutMapping("/{id}/location")
    public ResponseEntity<?> updateLocation(@PathVariable Long id, @RequestBody LocationPayload payload) {
        Optional<Tourist> opt = touristRepository.findById(id);
        if (opt.isEmpty())
            return ResponseEntity.notFound().build();
        Tourist t = opt.get();
        t.setLatitude(payload.getLatitude());
        t.setLongitude(payload.getLongitude());
        touristRepository.save(t);
        messagingTemplate.convertAndSend("/topic/locations", touristRepository.findAll());
        return ResponseEntity.ok().build();
    }

    // Get all for map initial load
    @GetMapping("/locations")
    public List<Tourist> getAllLocations() {
        return touristRepository.findAll();
    }

    // find by username
    @GetMapping("/by-username")
    public ResponseEntity<Tourist> getByUsername(@RequestParam String username) {
        return touristRepository.findByUsername(username)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // New: create alert (also broadcasts single alert)
    @PostMapping("/alerts")
    public ResponseEntity<Alert> createAlert(@RequestBody Alert alert) {
        Alert saved = alertRepository.save(alert);
        // broadcast the new alert object to STOMP topic /topic/alerts
        messagingTemplate.convertAndSend("/topic/alerts", saved);
        return ResponseEntity.ok(saved);
    }

    // New: get all alerts
    @GetMapping("/alerts")
    public List<Alert> getAllAlerts() {
        return alertRepository.findAll();
    }

    // New: create efir (broadcast)
    @PostMapping("/efirs")
    public ResponseEntity<Efir> createEfir(@RequestBody Efir efir) {
        Efir saved = efirRepository.save(efir);
        // broadcast to /topic/efirs
        messagingTemplate.convertAndSend("/topic/efirs", saved);
        return ResponseEntity.ok(saved);
    }

    // New: get all efirs
    @GetMapping("/efirs")
    public List<Efir> getAllEfirs() {
        return efirRepository.findAll();
    }

    // small DTO class for location updates
    public static class LocationPayload {
        private Double latitude;
        private Double longitude;

        public LocationPayload() {
        }

        public Double getLatitude() {
            return latitude;
        }

        public void setLatitude(Double latitude) {
            this.latitude = latitude;
        }

        public Double getLongitude() {
            return longitude;
        }

        public void setLongitude(Double longitude) {
            this.longitude = longitude;
        }
    }
}
