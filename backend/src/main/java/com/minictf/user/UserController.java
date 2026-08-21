package com.minictf.user;

import com.minictf.challenge.Solve;
import com.minictf.challenge.SolveRepository;
import com.minictf.challenge.Submission;
import com.minictf.challenge.SubmissionRepository;
import com.minictf.common.ApiResponse;
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
    public ApiResponse<UserDtos.Profile> me(Authentication auth) { User current=user(auth);return ApiResponse.ok(profile(current)); }

    @GetMapping("/solves")
    public ApiResponse<?> mySolves(Authentication auth) { return ApiResponse.ok(solves.findByUserId(user(auth).getId()).stream().map(s->new UserDtos.SolveView(s.getChallengeId(),s.getChallengeTitle(),s.getScore(),s.getSolvedAt())).toList()); }

    @GetMapping("/submissions")
    public ApiResponse<?> mySubmissions(Authentication auth) { return ApiResponse.ok(submissions.findByUserId(user(auth).getId(), PageRequest.of(0, 100)).stream().map(s->new UserDtos.SubmissionView(s.getChallengeId(),s.getChallengeTitle(),s.isCorrect(),s.getSubmittedAt())).toList()); }

    @GetMapping("/dashboard")
    public ApiResponse<UserDtos.Dashboard> dashboard(Authentication auth) { User current=user(auth);return ApiResponse.ok(new UserDtos.Dashboard(profile(current),solves.findByUserId(current.getId()).stream().map(s->new UserDtos.SolveView(s.getChallengeId(),s.getChallengeTitle(),s.getScore(),s.getSolvedAt())).toList(),submissions.findByUserId(current.getId(),PageRequest.of(0,20)).stream().map(s->new UserDtos.SubmissionView(s.getChallengeId(),s.getChallengeTitle(),s.isCorrect(),s.getSubmittedAt())).toList())); }

    private User user(Authentication auth) { return users.findByUsername(auth.getName()).orElseThrow(); }
    private UserDtos.Profile profile(User user) { return new UserDtos.Profile(user.getId(),user.getUsername(),user.getNickname(),user.getRole(),user.getScore(),users.countByScoreGreaterThan(user.getScore())+1,solves.countByUser(user.getId())); }
}
