package com.minictf.user;

import com.minictf.common.ApiResponse;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class PublicProfileController {
  private final UserProfileService profiles;

  public PublicProfileController(UserProfileService profiles) {
    this.profiles = profiles;
  }

  @GetMapping("/{username}/profile")
  public ApiResponse<UserDtos.PublicProfile> profile(@PathVariable String username) {
    return ApiResponse.ok(profiles.publicProfile(username));
  }

  @GetMapping("/{username}/avatar")
  public ResponseEntity<Resource> avatar(@PathVariable String username) {
    AvatarAsset image = profiles.avatar(username);
    return ResponseEntity.ok()
        .contentType(image.mediaType())
        .header("X-Content-Type-Options", "nosniff")
        .cacheControl(CacheControl.maxAge(java.time.Duration.ofHours(1)).cachePublic())
        .body(image.resource());
  }
}
