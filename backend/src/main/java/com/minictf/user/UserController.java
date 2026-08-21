package com.minictf.user;

import com.minictf.challenge.SolveRepository;
import com.minictf.challenge.SubmissionRepository;
import com.minictf.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users/me")
public class UserController {
  private final UserRepository users;
  private final SolveRepository solves;
  private final SubmissionRepository submissions;
  private final UserProfileService profiles;

  public UserController(
      UserRepository users,
      SolveRepository solves,
      SubmissionRepository submissions,
      UserProfileService profiles) {
    this.users = users;
    this.solves = solves;
    this.submissions = submissions;
    this.profiles = profiles;
  }

  @GetMapping
  public ApiResponse<UserDtos.Profile> me(Authentication auth) {
    return ApiResponse.ok(profiles.profile(user(auth)));
  }

  @PutMapping("/profile")
  public ApiResponse<UserDtos.Profile> updateProfile(
      @Valid @RequestBody UserDtos.ProfileUpdateRequest request, Authentication auth) {
    return ApiResponse.ok(profiles.update(user(auth), request));
  }

  @PostMapping(value = "/avatar", consumes = "multipart/form-data")
  public ApiResponse<UserDtos.Profile> uploadAvatar(
      @RequestPart("file") MultipartFile file, Authentication auth) {
    return ApiResponse.ok(profiles.uploadAvatar(user(auth), file));
  }

  @DeleteMapping("/avatar")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteAvatar(Authentication auth) {
    profiles.deleteAvatar(user(auth));
  }

  @GetMapping("/solves")
  public ApiResponse<?> mySolves(Authentication auth) {
    return ApiResponse.ok(
        solves.findByUserId(user(auth).getId()).stream()
            .map(
                s ->
                    new UserDtos.SolveView(
                        s.getChallengeId(), s.getChallengeTitle(), s.getScore(), s.getSolvedAt()))
            .toList());
  }

  @GetMapping("/submissions")
  public ApiResponse<?> mySubmissions(Authentication auth) {
    return ApiResponse.ok(
        submissions.findByUserId(user(auth).getId(), PageRequest.of(0, 100)).stream()
            .map(
                s ->
                    new UserDtos.SubmissionView(
                        s.getChallengeId(),
                        s.getChallengeTitle(),
                        s.isCorrect(),
                        s.getSubmittedAt()))
            .toList());
  }

  @GetMapping("/dashboard")
  public ApiResponse<UserDtos.Dashboard> dashboard(Authentication auth) {
    User current = user(auth);
    return ApiResponse.ok(
        new UserDtos.Dashboard(
            profiles.profile(current),
            solves.findByUserId(current.getId()).stream()
                .map(
                    s ->
                        new UserDtos.SolveView(
                            s.getChallengeId(),
                            s.getChallengeTitle(),
                            s.getScore(),
                            s.getSolvedAt()))
                .toList(),
            submissions.findByUserId(current.getId(), PageRequest.of(0, 20)).stream()
                .map(
                    s ->
                        new UserDtos.SubmissionView(
                            s.getChallengeId(),
                            s.getChallengeTitle(),
                            s.isCorrect(),
                            s.getSubmittedAt()))
                .toList()));
  }

  private User user(Authentication auth) {
    return users.findByUsername(auth.getName()).orElseThrow();
  }
}
