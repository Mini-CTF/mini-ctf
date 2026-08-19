package com.minictf.user;

import com.minictf.challenge.Solve;
import com.minictf.challenge.SolveRepository;
import com.minictf.challenge.Submission;
import com.minictf.challenge.SubmissionRepository;
import com.minictf.common.ApiResponse;
import com.minictf.auth.AuthDtos;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users/me")
public class UserController {
    private final UserRepository users;
    private final SolveRepository solves;
    private final SubmissionRepository submissions;

    public UserController(UserRepository users, SolveRepository solves, SubmissionRepository submissions) {
        this.users = users; this.solves = solves; this.submissions = submissions;
    }

    @GetMapping
    public ApiResponse<AuthDtos.UserView> me(Authentication auth) { return ApiResponse.ok(view(user(auth))); }

    @GetMapping("/solves")
    public ApiResponse<?> mySolves(Authentication auth) { return ApiResponse.ok(solves.findByUserId(user(auth).getId())); }

    @GetMapping("/submissions")
    public ApiResponse<?> mySubmissions(Authentication auth) { return ApiResponse.ok(submissions.findByUserId(user(auth).getId(), PageRequest.of(0, 100))); }

    private User user(Authentication auth) { return users.findByUsername(auth.getName()).orElseThrow(); }
    private AuthDtos.UserView view(User user) { return new AuthDtos.UserView(user.getId(), user.getUsername(), user.getNickname(), user.getRole(), user.getScore()); }
}
