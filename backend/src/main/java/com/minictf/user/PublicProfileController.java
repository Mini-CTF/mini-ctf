package com.minictf.user;

import com.minictf.common.ApiResponse;
import java.nio.file.Path;
import org.springframework.core.io.FileSystemResource;
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
    Path image = profiles.avatar(username);
    MediaType mediaType =
        image.getFileName().toString().toLowerCase().endsWith(".png")
            ? MediaType.IMAGE_PNG
            : MediaType.IMAGE_JPEG;
    return ResponseEntity.ok()
        .contentType(mediaType)
        .header("X-Content-Type-Options", "nosniff")
        .body(new FileSystemResource(image));
  }
}
