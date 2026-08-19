package com.minictf.challenge;
import com.minictf.user.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="submissions") public class Submission {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id") @JsonIgnore private User user;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="challenge_id") @JsonIgnore private Challenge challenge;
    @Column(name="is_correct",nullable=false) private boolean correct;
    @Column(name="submitted_at",nullable=false) private Instant submittedAt;
    @PrePersist void create(){if(submittedAt==null)submittedAt=Instant.now();}
    public void setUser(User v){user=v;} public void setChallenge(Challenge v){challenge=v;} public void setCorrect(boolean v){correct=v;} public boolean isCorrect(){return correct;} public Instant getSubmittedAt(){return submittedAt;}
}
