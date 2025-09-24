package com.satadru.mobile.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "alerts")
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String type; // distress | crime | missing

    @Column(name = "sender_username")
    private String senderUsername;

    @Column(name = "sender_tourist_id")
    private String senderTouristId;

    @Column(name = "date_time")
    private LocalDateTime dateTime;

    private String location;

    @Lob
    @Column(name = "details")
    private String details;

    @Column(name = "missing_name")
    private String missingName;

    @Column(name = "missing_tourist_id")
    private String missingTouristId;

    @Column(name = "missing_last_seen")
    private String missingLastSeen;

    public Alert() {
    }

    public Alert(String type, String senderUsername, String senderTouristId,
            LocalDateTime dateTime, String location, String details) {
        this.type = type;
        this.senderUsername = senderUsername;
        this.senderTouristId = senderTouristId;
        this.dateTime = dateTime;
        this.location = location;
        this.details = details;
    }

    // --- Getters & Setters ---
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getSenderUsername() {
        return senderUsername;
    }

    public void setSenderUsername(String senderUsername) {
        this.senderUsername = senderUsername;
    }

    public String getSenderTouristId() {
        return senderTouristId;
    }

    public void setSenderTouristId(String senderTouristId) {
        this.senderTouristId = senderTouristId;
    }

    public LocalDateTime getDateTime() {
        return dateTime;
    }

    public void setDateTime(LocalDateTime dateTime) {
        this.dateTime = dateTime;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public String getMissingName() {
        return missingName;
    }

    public void setMissingName(String missingName) {
        this.missingName = missingName;
    }

    public String getMissingTouristId() {
        return missingTouristId;
    }

    public void setMissingTouristId(String missingTouristId) {
        this.missingTouristId = missingTouristId;
    }

    public String getMissingLastSeen() {
        return missingLastSeen;
    }

    public void setMissingLastSeen(String missingLastSeen) {
        this.missingLastSeen = missingLastSeen;
    }
}
