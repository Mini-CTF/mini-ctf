package com.minictf.user;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 50) private String username;
    @Column(length = 80) private String nickname;
    @Column(name = "password_hash") private String passwordHash;
    @Column(nullable = false, length = 20) private String role = "USER";
    @Column(nullable = false) private int score;
    @Column(name = "created_at", nullable = false) private Instant createdAt;

    @PrePersist void onCreate() { if (createdAt == null) createdAt = Instant.now(); }
    public Long getId() { return id; }
    public String getUsername() { return username; }
    public void setUsername(String value) { username = value; }
    public String getNickname() { return nickname; }
    public void setNickname(String value) { nickname = value; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String value) { passwordHash = value; }
    public String getRole() { return role; }
    public void setRole(String value) { role = value; }
    public int getScore() { return score; }
    public void setScore(int value) { score = value; }
}
