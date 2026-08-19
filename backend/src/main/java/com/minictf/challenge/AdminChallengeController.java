package com.minictf.challenge;
import com.minictf.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/admin/challenges") @PreAuthorize("hasRole('ADMIN')")
public class AdminChallengeController {
    private final ChallengeService service; public AdminChallengeController(ChallengeService service){this.service=service;}
    @PostMapping public ApiResponse<Challenge> create(@Valid @RequestBody ChallengeDtos.AdminRequest r){return ApiResponse.ok(service.create(r));}
    @PutMapping("/{id}") public ApiResponse<Challenge> update(@PathVariable Long id,@Valid @RequestBody ChallengeDtos.AdminRequest r){return ApiResponse.ok(service.update(id,r));}
    @DeleteMapping("/{id}") public void delete(@PathVariable Long id){service.delete(id);}
}
