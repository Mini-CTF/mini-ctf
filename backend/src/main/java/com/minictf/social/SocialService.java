package com.minictf.social;

import com.minictf.common.RateLimitService;
import com.minictf.user.User;
import com.minictf.user.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SocialService {
  private final UserRepository users;
  private final FriendshipRepository friendships;
  private final DirectMessageRepository messages;
  private final RateLimitService rateLimits;

  public SocialService(
      UserRepository users,
      FriendshipRepository friendships,
      DirectMessageRepository messages,
      RateLimitService rateLimits) {
    this.users = users;
    this.friendships = friendships;
    this.messages = messages;
    this.rateLimits = rateLimits;
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
        friendships.findRelationship(current.getId(), other.getId()).orElse(null);
    if (relationship != null) {
      if ("DECLINED".equals(relationship.getStatus())
          && relationship.getRequester().getId().equals(current.getId())) {
        relationship.setStatus("PENDING");
        return friendView(current, relationship);
      }
      throw new IllegalArgumentException("Friend relationship already exists");
    }
    Friendship friend = new Friendship();
    friend.setRequester(current);
    friend.setRecipient(other);
    return friendView(current, friendships.save(friend));
  }

  @Transactional
  public SocialDtos.FriendView accept(User current, String username) {
    User other = byUsername(username);
    Friendship friend = relationship(current, other);
    if (!friend.getRecipient().getId().equals(current.getId())
        || !"PENDING".equals(friend.getStatus()))
      throw new AccessDeniedException("No incoming friend request");
    friend.setStatus("ACCEPTED");
    return friendView(current, friend);
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
        .forEach(DirectMessage::markRead);
    return result.stream().map(this::messageView).toList();
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
    return messageView(messages.save(message));
  }

  private Friendship relationship(User current, User other) {
    return friendships
        .findRelationship(current.getId(), other.getId())
        .orElseThrow(() -> new EntityNotFoundException("Friend relationship not found"));
  }

  private void requireAccepted(User current, User other) {
    Friendship friend = relationship(current, other);
    if (!"ACCEPTED".equals(friend.getStatus()))
      throw new AccessDeniedException("Friendship is not accepted");
  }

  private User byUsername(String username) {
    return users
        .findByUsernameIgnoreCase(username)
        .orElseThrow(() -> new EntityNotFoundException("User not found"));
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
