package com.minictf.challenge;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "solves", uniqueConstraints = @UniqueConstraint(name = "uq_solves_user_challenge", columnNames = {"user_id", "challenge_id"}))
public class Solve {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false) @JsonIgnore private com.minictf.user.User user;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "challenge_id", nullable = false) @JsonIgnore private Challenge challenge;
    @Column(name = "solved_at", nullable = false) private Instant solvedAt;
    @PrePersist void onCreate() { solvedAt = Instant.now(); }
    public Long getId() { return id; }
    public Long getChallengeId() { return challenge == null ? null : challenge.getId(); }
    public Instant getSolvedAt() { return solvedAt; }
    public void setUser(com.minictf.user.User user) { this.user = user; }
    public void setChallenge(Challenge challenge) { this.challenge = challenge; }
}
