package com.minictf.learning;

import com.minictf.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/learning")
public class LearningController {
  private final LearningService service;

  public LearningController(LearningService service) {
    this.service = service;
  }

  @GetMapping("/overview")
  public ApiResponse<?> overview(Authentication auth) {
    return ApiResponse.ok(service.overview(auth.getName()));
  }

  @GetMapping("/bookmarks")
  public ApiResponse<?> bookmarks(Authentication auth) {
    return ApiResponse.ok(service.bookmarks(auth.getName()));
  }

  @PutMapping("/bookmarks/{challengeId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void bookmark(@PathVariable Long challengeId, Authentication auth) {
    service.bookmark(auth.getName(), challengeId);
  }

  @DeleteMapping("/bookmarks/{challengeId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void removeBookmark(@PathVariable Long challengeId, Authentication auth) {
    service.removeBookmark(auth.getName(), challengeId);
  }

  @PutMapping("/goal")
  public ApiResponse<?> updateGoal(
      @Valid @RequestBody LearningDtos.GoalRequest request, Authentication auth) {
    return ApiResponse.ok(service.updateGoal(auth.getName(), request.weeklyTarget()));
  }
}
