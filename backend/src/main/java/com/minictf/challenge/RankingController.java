package com.minictf.challenge;

import com.minictf.common.ApiResponse;
import com.minictf.user.User;
import com.minictf.user.UserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/ranking")
public class RankingController {
    private final UserRepository userRepository;
    private final SolveRepository solveRepository;

    public RankingController(UserRepository userRepository, SolveRepository solveRepository) {
        this.userRepository = userRepository;
        this.solveRepository = solveRepository;
    }

    @GetMapping
    public ApiResponse<List<RankingRow>> ranking() {
        List<RankingRow> rows = userRepository.findTop100ByOrderByScoreDescUsernameAsc().stream()
                .map(user -> new RankingRow(user.getUsername(), user.getNickname(), user.getScore(), solveRepository.countByUserId(user.getId())))
                .toList();
        return ApiResponse.ok(rows);
    }

    public record RankingRow(String username, String nickname, int score, long solvedCount) {}
}
