package com.minictf.user;

import com.minictf.auth.AuthDtos;
import com.minictf.auth.AuthService;
import com.minictf.challenge.Solve;
import com.minictf.challenge.SolveRepository;
import com.minictf.challenge.Submission;
import com.minictf.challenge.SubmissionRepository;
import com.minictf.common.ApiResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users/me")
public class UserController {
    private final UserRepository userRepository;
    private final AuthService authService;
    private final SolveRepository solveRepository;
    private final SubmissionRepository submissionRepository;

    public UserController(UserRepository userRepository, AuthService authService,
                          SolveRepository solveRepository, SubmissionRepository submissionRepository) {
        this.userRepository = userRepository;
        this.authService = authService;
        this.solveRepository = solveRepository;
        this.submissionRepository = submissionRepository;
    }

    @GetMapping
    public ApiResponse<AuthDtos.UserView> me(Authentication authentication) {
        return ApiResponse.ok(authService.toView(userRepository.findByUsername(authentication.getName()).orElseThrow()));
    }

    @GetMapping("/solves")
    public ApiResponse<List<Solve>> solves(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName()).orElseThrow();
        return ApiResponse.ok(solveRepository.findByUserIdOrderBySolvedAtDesc(user.getId()));
    }

    @GetMapping("/submissions")
    public ApiResponse<List<Submission>> submissions(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName()).orElseThrow();
        return ApiResponse.ok(submissionRepository.findTop100ByUserIdOrderBySubmittedAtDesc(user.getId(), org.springframework.data.domain.PageRequest.of(0, 100)));
    }
}
