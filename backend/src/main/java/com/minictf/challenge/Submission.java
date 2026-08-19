package com.minictf.challenge;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "submissions")
public class Submission {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false) @JsonIgnore private com.minictf.user.User user;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "challenge_id", nullable = false) @JsonIgnore private Challenge challenge;
    @Column(name = "is_correct", nullable = false) private boolean correct;
    @Column(name = "submitted_at", nullable = false) private Instant submittedAt;
    @PrePersist void onCreate() { submittedAt = Instant.now(); }
    public Long getId() { return id; }
    public boolean isCorrect() { return correct; }
    public void setCorrect(boolean correct) { this.correct = correct; }
    public Instant getSubmittedAt() { return submittedAt; }
    public void setUser(com.minictf.user.User user) { this.user = user; }
    public void setChallenge(Challenge challenge) { this.challenge = challenge; }
}
