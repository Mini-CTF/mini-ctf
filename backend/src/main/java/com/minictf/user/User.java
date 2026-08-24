package com.minictf.user;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "users")
public class User {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, length = 50)
  private String username;

  @Column(length = 80)
  private String nickname;

  @JsonIgnore
  @Column(name = "password_hash")
  private String passwordHash;

  @Column(nullable = false, length = 20)
  private String role = "USER";

  @Column(nullable = false)
  private int score;

  @Column(nullable = false, length = 20)
  private String status = "ACTIVE";

  @Column(name = "suspension_reason", length = 500)
  private String suspensionReason;

  @Column(name = "suspended_at")
  private Instant suspendedAt;

  @Column(name = "status_message", length = 160)
  private String statusMessage;

  @Column(name = "avatar_path", length = 500)
  private String avatarPath;

  @Column(name = "attendance_title", length = 40)
  private String attendanceTitle;

  @Column(name = "cipher_gems", nullable = false)
  private int cipherGems;

  @Column(name = "vault_fragments", nullable = false)
  private int vaultFragments;

  @Column(name = "equipped_frame", length = 50)
  private String equippedFrame;

  @Column(name = "equipped_accessory", length = 50)
  private String equippedAccessory;

  @Column(name = "equipped_vault_title", length = 50)
  private String equippedVaultTitle;

  @Column(name = "hidden_vault_unlocked", nullable = false)
  private boolean hiddenVaultUnlocked;

  @Column(name = "hidden_vault_rewarded", nullable = false)
  private boolean hiddenVaultRewarded;

  @Column(name = "hint_credits", nullable = false)
  private int hintCredits;

  @Column(name = "deleted_original_username", length = 50)
  private String deletedOriginalUsername;

  @Column(name = "deleted_original_nickname", length = 80)
  private String deletedOriginalNickname;

  @Column(name = "deleted_original_score")
  private Integer deletedOriginalScore;

  @Column(name = "deleted_original_status", length = 20)
  private String deletedOriginalStatus;

  @Column(name = "deleted_original_suspension_reason", length = 500)
  private String deletedOriginalSuspensionReason;

  @Column(name = "deleted_original_suspended_at")
  private Instant deletedOriginalSuspendedAt;

  @Column(name = "deleted_at")
  private Instant deletedAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @PrePersist
  void onCreate() {
    if (createdAt == null) createdAt = Instant.now();
  }

  public Long getId() {
    return id;
  }

  public String getUsername() {
    return username;
  }

  public void setUsername(String value) {
    username = value;
  }

  public String getNickname() {
    return nickname;
  }

  public void setNickname(String value) {
    nickname = value;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public void setPasswordHash(String value) {
    passwordHash = value;
  }

  public String getRole() {
    return role;
  }

  public void setRole(String value) {
    role = value;
  }

  public int getScore() {
    return score;
  }

  public void setScore(int value) {
    score = value;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String value) {
    status = value;
  }

  public String getSuspensionReason() {
    return suspensionReason;
  }

  public void setSuspensionReason(String value) {
    suspensionReason = value;
  }

  public Instant getSuspendedAt() {
    return suspendedAt;
  }

  public void setSuspendedAt(Instant value) {
    suspendedAt = value;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public String getStatusMessage() {
    return statusMessage;
  }

  public void setStatusMessage(String value) {
    statusMessage = value;
  }

  public String getAvatarPath() {
    return avatarPath;
  }

  public void setAvatarPath(String value) {
    avatarPath = value;
  }

  public String getAttendanceTitle() {
    return attendanceTitle;
  }

  public void setAttendanceTitle(String value) {
    attendanceTitle = value;
  }

  public int getCipherGems() {
    return cipherGems;
  }

  public void setCipherGems(int value) {
    cipherGems = value;
  }

  public int getVaultFragments() {
    return vaultFragments;
  }

  public void setVaultFragments(int value) {
    vaultFragments = value;
  }

  public String getEquippedFrame() {
    return equippedFrame;
  }

  public void setEquippedFrame(String value) {
    equippedFrame = value;
  }

  public String getEquippedAccessory() {
    return equippedAccessory;
  }

  public void setEquippedAccessory(String value) {
    equippedAccessory = value;
  }

  public String getEquippedVaultTitle() {
    return equippedVaultTitle;
  }

  public void setEquippedVaultTitle(String value) {
    equippedVaultTitle = value;
  }

  public boolean isHiddenVaultUnlocked() {
    return hiddenVaultUnlocked;
  }

  public void setHiddenVaultUnlocked(boolean value) {
    hiddenVaultUnlocked = value;
  }

  public boolean isHiddenVaultRewarded() {
    return hiddenVaultRewarded;
  }

  public void setHiddenVaultRewarded(boolean value) {
    hiddenVaultRewarded = value;
  }

  public int getHintCredits() {
    return hintCredits;
  }

  public void setHintCredits(int value) {
    hintCredits = value;
  }

  public String getDeletedOriginalUsername() {
    return deletedOriginalUsername;
  }

  public void setDeletedOriginalUsername(String value) {
    deletedOriginalUsername = value;
  }

  public String getDeletedOriginalNickname() {
    return deletedOriginalNickname;
  }

  public void setDeletedOriginalNickname(String value) {
    deletedOriginalNickname = value;
  }

  public Integer getDeletedOriginalScore() {
    return deletedOriginalScore;
  }

  public void setDeletedOriginalScore(Integer value) {
    deletedOriginalScore = value;
  }

  public String getDeletedOriginalStatus() {
    return deletedOriginalStatus;
  }

  public void setDeletedOriginalStatus(String value) {
    deletedOriginalStatus = value;
  }

  public String getDeletedOriginalSuspensionReason() {
    return deletedOriginalSuspensionReason;
  }

  public void setDeletedOriginalSuspensionReason(String value) {
    deletedOriginalSuspensionReason = value;
  }

  public Instant getDeletedOriginalSuspendedAt() {
    return deletedOriginalSuspendedAt;
  }

  public void setDeletedOriginalSuspendedAt(Instant value) {
    deletedOriginalSuspendedAt = value;
  }

  public Instant getDeletedAt() {
    return deletedAt;
  }

  public void setDeletedAt(Instant value) {
    deletedAt = value;
  }
}
