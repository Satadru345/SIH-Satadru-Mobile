package com.satadru.mobile.model;

import jakarta.persistence.*;

@Entity
@Table(name = "tourist")
public class Tourist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;                  // database row ID

    @Column(name = "tourist_id", unique = true, nullable = false)
    private String touristId;         // unique tourist ID

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    private Double latitude = 0.0;
    private Double longitude = 0.0;

    public Tourist() {}

    // constructors (optional)
    public Tourist(String touristId, String name, String username, String password, Double latitude, Double longitude) {
        this.touristId = touristId;
        this.name = name;
        this.username = username;
        this.password = password;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTouristId() { return touristId; }
    public void setTouristId(String touristId) { this.touristId = touristId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
}