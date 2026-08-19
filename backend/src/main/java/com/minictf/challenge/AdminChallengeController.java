package com.minictf.challenge;

import com.minictf.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/challenges")
@PreAuthorize("hasRole('ADMIN')")
public class AdminChallengeController {
    private final ChallengeService service;
    public AdminChallengeController(ChallengeService service) { this.service = service; }
    @PostMapping public org.springframework.http.ResponseEntity<ApiResponse<Challenge>> create(@Valid @RequestBody ChallengeDtos.AdminRequest request) {
        return org.springframework.http.ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(request)));
    }
    @PutMapping("/{id}") public ApiResponse<Challenge> update(@PathVariable Long id, @Valid @RequestBody ChallengeDtos.AdminRequest request) {
        return ApiResponse.ok(service.update(id, request));
    }
    @DeleteMapping("/{id}") public org.springframework.http.ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id); return org.springframework.http.ResponseEntity.noContent().build();
    }
}
