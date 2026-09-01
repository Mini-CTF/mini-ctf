package com.minictf.user;

import com.minictf.challenge.SolveRepository;
import com.minictf.common.AccountNameSafety;
import com.minictf.social.FriendshipRepository;
import jakarta.persistence.EntityNotFoundException;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Paths;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class UserProfileService {
  private static final long MAX_AVATAR_SIZE = 2L * 1024 * 1024;
  private static final Set<String> IMAGE_EXTENSIONS = Set.of("png", "jpg", "jpeg");
  private final UserRepository users;
  private final SolveRepository solves;
  private final FriendshipRepository friendships;
  private final AvatarStorage avatars;
  private final AccountNameSafety accountNameSafety;

  public UserProfileService(
      UserRepository users,
      SolveRepository solves,
      FriendshipRepository friendships,
      AvatarStorage avatars,
      AccountNameSafety accountNameSafety) {
    this.users = users;
    this.solves = solves;
    this.friendships = friendships;
    this.avatars = avatars;
    this.accountNameSafety = accountNameSafety;
  }

  @Transactional
  public UserDtos.Profile update(User current, UserDtos.ProfileUpdateRequest request) {
    if (request.nickname() != null && !request.nickname().isBlank()) {
      String nickname = request.nickname().trim();
      accountNameSafety.requireSafe(nickname);
      current.setNickname(nickname);
    }
    current.setStatusMessage(cleanOptional(request.statusMessage(), 160));
    users.save(current);
    return profile(current);
  }

  @Transactional
  public UserDtos.Profile uploadAvatar(User current, MultipartFile upload) {
    if (upload == null || upload.isEmpty() || upload.getSize() > MAX_AVATAR_SIZE)
      throw new IllegalArgumentException("Invalid avatar size");
    String original = upload.getOriginalFilename();
    if (original == null) throw new IllegalArgumentException("Avatar filename is required");
    String fileName = Paths.get(original).getFileName().toString();
    int dot = fileName.lastIndexOf('.');
    if (dot < 1 || dot == fileName.length() - 1)
      throw new IllegalArgumentException("Invalid avatar format");
    String extension = fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    if (!IMAGE_EXTENSIONS.contains(extension))
      throw new IllegalArgumentException("Avatar must be PNG or JPEG");
    try (var input = upload.getInputStream()) {
      BufferedImage image = ImageIO.read(input);
      if (image == null
          || image.getWidth() < 1
          || image.getHeight() < 1
          || image.getWidth() > 4096
          || image.getHeight() > 4096) throw new IllegalArgumentException("Invalid avatar image");
    } catch (IOException ex) {
      throw new IllegalArgumentException("Invalid avatar image");
    }
    String relative = "avatars/" + current.getId() + "/" + UUID.randomUUID() + "." + extension;
    try {
      avatars.store(relative, upload.getBytes(), LocalAvatarStorage.mediaType(relative));
      deleteManagedAvatar(current);
      current.setAvatarPath(relative);
      users.save(current);
      return profile(current);
    } catch (IOException ex) {
      throw new IllegalStateException("Could not store avatar", ex);
    }
  }

  @Transactional
  public void deleteAvatar(User current) {
    deleteManagedAvatar(current);
    current.setAvatarPath(null);
    users.save(current);
  }

  @Transactional(readOnly = true)
  public UserDtos.PublicProfile publicProfile(String username) {
    User user = byUsername(username);
    return new UserDtos.PublicProfile(
        user.getUsername(),
        user.getNickname(),
        user.getScore(),
        solves.countByActiveUser(user.getId()),
        user.getStatusMessage(),
        avatarUrl(user),
        user.getEquippedFrame(),
        user.getEquippedAccessory(),
        displayTitle(user),
        friendships.findAcceptedForUser(user.getId()).stream()
            .map(
                friendship ->
                    friendship.getRequester().getId().equals(user.getId())
                        ? friendship.getRecipient()
                        : friendship.getRequester())
            .map(
                friend ->
                    new UserDtos.PublicFriend(
                        friend.getUsername(),
                        friend.getNickname(),
                        avatarUrl(friend),
                        friend.getEquippedFrame(),
                        friend.getEquippedAccessory(),
                        friend.getEquippedVaultTitle()))
            .toList(),
        UserTier.forScore(user.getScore()).id());
  }

  @Transactional(readOnly = true)
  public AvatarAsset avatar(String username) {
    User user = byUsername(username);
    if (user.getAvatarPath() == null) throw new EntityNotFoundException("Avatar not found");
    try {
      return avatars.load(user.getAvatarPath());
    } catch (LocalAvatarStorage.AvatarNotFoundException ex) {
      throw new EntityNotFoundException("Avatar not found");
    }
  }

  public UserDtos.Profile profile(User user) {
    return new UserDtos.Profile(
        user.getId(),
        user.getUsername(),
        user.getNickname(),
        user.getRole(),
        user.getScore(),
        users.countByScoreGreaterThanAndStatusNot(user.getScore(), "DELETED") + 1,
        solves.countByActiveUser(user.getId()),
        user.getStatusMessage(),
        avatarUrl(user),
        user.getEquippedFrame(),
        user.getEquippedAccessory(),
        user.getEquippedVaultTitle(),
        UserTier.forScore(user.getScore()).id());
  }

  private User byUsername(String username) {
    String reference = username == null ? "" : username.trim();
    User user =
        users
            .findByUsernameIgnoreCase(reference)
            .orElseGet(
                () -> {
                  List<User> matches =
                      users.findTop2ByNicknameIgnoreCaseAndStatusNot(reference, "DELETED");
                  if (matches.size() == 1) return matches.get(0);
                  throw new EntityNotFoundException("User not found");
                });
    if ("DELETED".equals(user.getStatus())) throw new EntityNotFoundException("User not found");
    return user;
  }

  private String avatarUrl(User user) {
    if (user.getAvatarPath() == null) return null;
    String version = Integer.toUnsignedString(user.getAvatarPath().hashCode());
    return "/api/users/" + user.getUsername() + "/avatar?v=" + version;
  }

  private String displayTitle(User user) {
    if (user.getEquippedVaultTitle() != null) return user.getEquippedVaultTitle();
    return "NONE".equals(user.getAttendanceTitle()) ? null : user.getAttendanceTitle();
  }

  private String cleanOptional(String value, int max) {
    if (value == null || value.isBlank()) return null;
    String cleaned = value.trim();
    if (cleaned.length() > max) throw new IllegalArgumentException("Text is too long");
    return cleaned;
  }

  private void deleteManagedAvatar(User user) {
    String relative = user.getAvatarPath();
    if (relative == null || !relative.startsWith("avatars/" + user.getId() + "/")) return;
    avatars.delete(relative);
  }
}
