package com.minictf.attendance;

import com.minictf.common.ApiResponse;
import com.minictf.user.User;
import com.minictf.user.UserRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {
  private final AttendanceService service;
  private final UserRepository users;

  public AttendanceController(AttendanceService service, UserRepository users) {
    this.service = service;
    this.users = users;
  }

  @GetMapping
  public ApiResponse<AttendanceDtos.Summary> summary(Authentication auth) {
    return ApiResponse.ok(service.summary(user(auth)));
  }

  @PostMapping("/check-in")
  @ResponseStatus(HttpStatus.CREATED)
  public ApiResponse<AttendanceDtos.Summary> checkIn(Authentication auth) {
    return ApiResponse.ok(service.checkIn(user(auth)));
  }

  @GetMapping("/ranking")
  public ApiResponse<List<AttendanceDtos.RankingRow>> ranking() {
    return ApiResponse.ok(service.ranking());
  }

  private User user(Authentication auth) {
    return users.findByUsernameIgnoreCase(auth.getName()).orElseThrow();
  }
}
