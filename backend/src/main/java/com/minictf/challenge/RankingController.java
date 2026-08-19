package com.minictf.challenge;
import com.minictf.common.ApiResponse;
import com.minictf.user.User;
import com.minictf.user.UserRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/ranking") public class RankingController {
    private final UserRepository users; private final SolveRepository solves;
    public RankingController(UserRepository users,SolveRepository solves){this.users=users;this.solves=solves;}
    @GetMapping public ApiResponse<?> ranking(){List<RankingRow> rows=users.findTop100ByOrderByScoreDescUsernameAsc().stream().map(u->new RankingRow(u.getUsername(),u.getNickname(),u.getScore(),solves.countByUser(u.getId()))).toList();return ApiResponse.ok(rows);}
    public record RankingRow(String username,String nickname,int score,long solvedCount){}
}
