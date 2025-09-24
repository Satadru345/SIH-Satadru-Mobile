package com.satadru.mobile.config;

import com.satadru.mobile.model.Tourist;
import com.satadru.mobile.repository.TouristRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class DataLoader implements CommandLineRunner {

    @Autowired
    private TouristRepository touristRepository;

    // optional: used to broadcast locations on startup (so map clients get initial snapshot via WS)
    @Autowired
    private SimpMessagingTemplate simpMessagingTemplate;

    @Override
    public void run(String... args) throws Exception {
        
        var seeds = List.of(
            new Tourist("T002", "Aritra Banerjee",   "aritra123",   "ari123", 22.4865, 88.3136),
            new Tourist("T003", "Mehul Roy",   "mehul123",     "meh123", 22.4843, 88.3399),
            new Tourist("T004", "Nikunj Agarwal",     "nikunj123",   "nik123", 22.7100, 88.3200),
            new Tourist("T005", "Ishita Mandal","ishita123",   "ish123", 22.516525, 88.418213),
            new Tourist("T006", "Kaushik Harsha",     "kaushik123",     "kau123", 22.5667,  88.3475)
        );

        for (Tourist s : seeds) {
            Optional<Tourist> exists = touristRepository.findByUsername(s.getUsername());
            if (exists.isEmpty()) {
                touristRepository.save(s);
            } else {
                // optional: update coords if you want to force them on restart
                Tourist t = exists.get();
                t.setLatitude(s.getLatitude());
                t.setLongitude(s.getLongitude());
                touristRepository.save(t);
            }
        }

        // optional: broadcast initial locations to any connected WebSocket clients
        try {
            var all = touristRepository.findAll();
            simpMessagingTemplate.convertAndSend("/topic/locations", all);
        } catch (Exception ignored) {
            // if no websocket configured/available yet, ignore.
        }
    }
}
