package com.minictf.community;

import com.minictf.challenge.Challenge;
import com.minictf.user.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name="challenge_comments")
public class ChallengeComment {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="challenge_id",nullable=false) private Challenge challenge;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id",nullable=false) private User user;
    @Column(nullable=false,columnDefinition="TEXT") private String content;
    @Column(name="discussion_type",nullable=false,length=20) private String discussionType;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    @Column(name="updated_at",nullable=false) private Instant updatedAt;
    @PrePersist void create(){Instant now=Instant.now();createdAt=now;updatedAt=now;} @PreUpdate void update(){updatedAt=Instant.now();}
    public Long getId(){return id;} public Challenge getChallenge(){return challenge;} public void setChallenge(Challenge v){challenge=v;} public User getUser(){return user;} public void setUser(User v){user=v;} public String getContent(){return content;} public void setContent(String v){content=v;} public String getDiscussionType(){return discussionType;} public void setDiscussionType(String v){discussionType=v;} public Instant getCreatedAt(){return createdAt;} public Instant getUpdatedAt(){return updatedAt;}
}
