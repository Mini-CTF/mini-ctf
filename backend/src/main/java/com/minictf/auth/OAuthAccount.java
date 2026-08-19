package com.minictf.auth;

import com.minictf.user.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name="oauth_accounts", uniqueConstraints=@UniqueConstraint(columnNames={"provider","provider_subject"}))
public class OAuthAccount {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="user_id", nullable=false) private User user;
    @Column(nullable=false,length=30) private String provider;
    @Column(name="provider_subject",nullable=false,length=255) private String providerSubject;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    @PrePersist void onCreate(){if(createdAt==null)createdAt=Instant.now();}
    public User getUser(){return user;} public void setUser(User v){user=v;}
    public void setProvider(String v){provider=v;} public void setProviderSubject(String v){providerSubject=v;}
}
