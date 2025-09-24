package com.satadru.mobile.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "efirs")
public class Efir {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "date_time")
    private LocalDateTime dateTime;

    private String station;

    @Lob
    @Column(name = "details")
    private String details;

    @Column(name = "alert_id")
    private Long alertId;

    @Column(name = "sender_username")
    private String senderUsername;

    public Efir() {}

    public Efir(LocalDateTime dateTime, String station, String details, Long alertId, String senderUsername) {
        this.dateTime = dateTime;
        this.station = station;
        this.details = details;
        this.alertId = alertId;
        this.senderUsername = senderUsername;
    }

    // --- Getters & Setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDateTime getDateTime() { return dateTime; }
    public void setDateTime(LocalDateTime dateTime) { this.dateTime = dateTime; }

    public String getStation() { return station; }
    public void setStation(String station) { this.station = station; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public Long getAlertId() { return alertId; }
    public void setAlertId(Long alertId) { this.alertId = alertId; }

    public String getSenderUsername() { return senderUsername; }
    public void setSenderUsername(String senderUsername) { this.senderUsername = senderUsername; }
}
