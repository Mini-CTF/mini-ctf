package com.minictf.common;

import com.minictf.challenge.ChallengeRepository;
import com.minictf.challenge.SolveRepository;
import com.minictf.user.UserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stats")
public class StatsController {
  private final ChallengeRepository challenges;
  private final SolveRepository solves;
  private final UserRepository users;

  public StatsController(
      ChallengeRepository challenges, SolveRepository solves, UserRepository users) {
    this.challenges = challenges;
    this.solves = solves;
    this.users = users;
  }

  @GetMapping
  public ApiResponse<Stats> stats() {
    return ApiResponse.ok(
        new Stats(
            challenges.countByActiveTrue(),
            solves.countByActiveUsers(),
            users.countByStatusNot("DELETED")));
  }

  public record Stats(long challenges, long solves, long users) {}
}
