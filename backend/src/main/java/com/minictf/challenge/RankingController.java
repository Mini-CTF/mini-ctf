package com.minictf.challenge;
import com.minictf.common.ApiResponse;
import com.minictf.user.User;
import com.minictf.user.UserRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.ArrayList;

@RestController @RequestMapping("/api/ranking") public class RankingController {
    private final UserRepository users; private final SolveRepository solves;
    public RankingController(UserRepository users,SolveRepository solves){this.users=users;this.solves=solves;}
    @GetMapping public ApiResponse<?> ranking(){List<User> ranked=users.findTop100ByOrderByScoreDescUsernameAsc();List<RankingRow> rows=new ArrayList<>();int displayedRank=0;Integer previousScore=null;for(int i=0;i<ranked.size();i++){User u=ranked.get(i);if(previousScore==null||u.getScore()!=previousScore)displayedRank=i+1;rows.add(new RankingRow(displayedRank,u.getUsername(),u.getNickname(),u.getScore(),solves.countByUser(u.getId())));previousScore=u.getScore();}return ApiResponse.ok(rows);}
    public record RankingRow(int rank,String username,String nickname,int score,long solvedCount){}
}
