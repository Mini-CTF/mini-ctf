package com.minictf.social;

import com.minictf.common.RateLimitService;
import com.minictf.user.User;
import com.minictf.user.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SocialService {
  private final UserRepository users;
  private final FriendshipRepository friendships;
  private final DirectMessageRepository messages;
  private final RateLimitService rateLimits;
  private final SocialRealtimeService realtime;

  public SocialService(
      UserRepository users,
      FriendshipRepository friendships,
      DirectMessageRepository messages,
      RateLimitService rateLimits,
      SocialRealtimeService realtime) {
    this.users = users;
    this.friendships = friendships;
    this.messages = messages;
    this.rateLimits = rateLimits;
    this.realtime = realtime;
  }

  @Transactional(readOnly = true)
  public List<SocialDtos.FriendView> friends(User current) {
    return friendships.findAllForUser(current.getId()).stream()
        .map(f -> friendView(current, f))
        .toList();
  }

  @Transactional
  public SocialDtos.FriendView request(User current, String username, String ip) {
    User other = byUsername(username);
    if (current.getId().equals(other.getId()))
      throw new IllegalArgumentException("Cannot add yourself");
    rateLimits.check("friend-request", current.getId() + ":" + ip, 20, 3600);
    Friendship relationship =
        friendships.findRelationshipForUpdate(current.getId(), other.getId()).orElse(null);
    if (relationship != null) {
      if ("DECLINED".equals(relationship.getStatus())
          && relationship.getRequester().getId().equals(current.getId())) {
        relationship.setStatus("PENDING");
        SocialDtos.FriendView view = friendView(current, relationship);
        realtime.publishFriendshipAfterCommit(other.getUsername(), friendView(other, relationship));
        return view;
      }
      throw new IllegalArgumentException("Friend relationship already exists");
    }
    Friendship friend = new Friendship();
    friend.setRequester(current);
    friend.setRecipient(other);
    try {
      Friendship saved = friendships.saveAndFlush(friend);
      SocialDtos.FriendView view = friendView(current, saved);
      realtime.publishFriendshipAfterCommit(other.getUsername(), friendView(other, saved));
      return view;
    } catch (DataIntegrityViolationException ex) {
      throw new IllegalArgumentException("Friend relationship already exists");
    }
  }

  @Transactional
  public SocialDtos.FriendView accept(User current, String username) {
    User other = byUsername(username);
    Friendship friend = relationship(current, other);
    if (!friend.getRecipient().getId().equals(current.getId())
        || !"PENDING".equals(friend.getStatus()))
      throw new AccessDeniedException("No incoming friend request");
    friend.setStatus("ACCEPTED");
    SocialDtos.FriendView view = friendView(current, friend);
    realtime.publishFriendshipAfterCommit(other.getUsername(), friendView(other, friend));
    return view;
  }

  @Transactional
  public void remove(User current, String username) {
    friendships.delete(relationship(current, byUsername(username)));
  }

  @Transactional
  public List<SocialDtos.MessageView> conversation(User current, String username) {
    User other = byUsername(username);
    requireAccepted(current, other);
    List<DirectMessage> result = messages.conversation(current.getId(), other.getId());
    result.stream()
        .filter(message -> message.getRecipient().getId().equals(current.getId()))
        .filter(message -> message.getReadAt() == null)
        .forEach(
            message -> {
              message.markRead();
              // The sender also receives the updated message so "Read" changes without refresh.
              realtime.publishAfterCommit(message.getSender().getUsername(), messageView(message));
            });
    return result.stream().map(this::messageView).toList();
  }

  public org.springframework.web.servlet.mvc.method.annotation.SseEmitter stream(User current) {
    return realtime.subscribe(current.getUsername());
  }

  @Transactional
  public SocialDtos.MessageView send(
      User current, String username, SocialDtos.MessageRequest request, String ip) {
    User other = byUsername(username);
    requireAccepted(current, other);
    rateLimits.check("direct-message", current.getId() + ":" + ip, 30, 60);
    DirectMessage message = new DirectMessage();
    message.setSender(current);
    message.setRecipient(other);
    message.setContent(request.content().trim());
    SocialDtos.MessageView view = messageView(messages.save(message));
    realtime.publishAfterCommit(other.getUsername(), view);
    return view;
  }

  @Transactional
  public SocialDtos.MessageView updateMessage(
      User current, Long messageId, SocialDtos.MessageRequest request) {
    DirectMessage message = ownedMessage(current, messageId);
    message.setContent(request.content().trim());
    return messageView(message);
  }

  @Transactional
  public void deleteMessage(User current, Long messageId) {
    messages.delete(ownedMessage(current, messageId));
  }

  private Friendship relationship(User current, User other) {
    return friendships
        .findRelationship(current.getId(), other.getId())
        .orElseThrow(() -> new EntityNotFoundException("Friend relationship not found"));
  }

  private DirectMessage ownedMessage(User current, Long messageId) {
    DirectMessage message =
        messages
            .findById(messageId)
            .orElseThrow(() -> new EntityNotFoundException("Message not found"));
    if (!message.getSender().getId().equals(current.getId()))
      throw new AccessDeniedException("Only the sender can change this message");
    return message;
  }

  private void requireAccepted(User current, User other) {
    Friendship friend = relationship(current, other);
    if (!"ACCEPTED".equals(friend.getStatus()))
      throw new AccessDeniedException("Friendship is not accepted");
  }

  private User byUsername(String username) {
    String normalized = normalizeUserReference(username);
    return users
        .findByUsernameIgnoreCase(normalized)
        .orElseGet(
            () -> {
              List<User> matches =
                  users.findTop2ByNicknameIgnoreCaseAndStatusNot(normalized, "DELETED");
              if (matches.size() > 1)
                throw new IllegalArgumentException(
                    "Multiple users use this display name. Enter their @account ID instead");
              if (matches.size() == 1) return matches.get(0);
              throw new EntityNotFoundException("User not found");
            });
  }

  private String normalizeUserReference(String username) {
    if (username == null) throw new IllegalArgumentException("Username is required");
    String normalized = username.trim();
    if (normalized.startsWith("@")) normalized = normalized.substring(1).trim();
    if (normalized.isBlank() || normalized.length() > 80) {
      throw new IllegalArgumentException(
          "Enter an account ID or a display name up to 80 characters");
    }
    if (!normalized.matches("[A-Za-z0-9_]+")) {
      throw new IllegalArgumentException("Use letters, numbers, and underscores only");
    }
    return normalized;
  }

  private SocialDtos.FriendView friendView(User current, Friendship friendship) {
    boolean incoming = friendship.getRecipient().getId().equals(current.getId());
    User other = incoming ? friendship.getRequester() : friendship.getRecipient();
    return new SocialDtos.FriendView(
        other.getUsername(),
        other.getNickname(),
        other.getStatusMessage(),
        other.getAvatarPath() == null ? null : "/api/users/" + other.getUsername() + "/avatar",
        friendship.getStatus(),
        incoming && "PENDING".equals(friendship.getStatus()),
        friendship.getCreatedAt());
  }

  private SocialDtos.MessageView messageView(DirectMessage message) {
    return new SocialDtos.MessageView(
        message.getId(),
        message.getSender().getUsername(),
        message.getRecipient().getUsername(),
        message.getContent(),
        message.getCreatedAt(),
        message.getReadAt() != null);
  }
}
