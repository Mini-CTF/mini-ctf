package com.minictf.challenge;
import com.minictf.user.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="solves",uniqueConstraints=@UniqueConstraint(columnNames={"user_id","challenge_id"})) public class Solve {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id") @JsonIgnore private User user;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="challenge_id") @JsonIgnore private Challenge challenge;
    @Column(name="solved_at",nullable=false) private Instant solvedAt;
    @PrePersist void create(){if(solvedAt==null)solvedAt=Instant.now();}
    public void setUser(User v){user=v;} public void setChallenge(Challenge v){challenge=v;} public Long getChallengeId(){return challenge.getId();} public Instant getSolvedAt(){return solvedAt;}
}
