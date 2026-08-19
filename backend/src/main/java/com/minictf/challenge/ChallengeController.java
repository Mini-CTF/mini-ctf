package com.minictf.challenge;

import com.minictf.common.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/challenges")
public class ChallengeController {
    private final ChallengeService service;
    public ChallengeController(ChallengeService service) { this.service = service; }

    @GetMapping public ApiResponse<List<ChallengeDtos.Summary>> list(Authentication authentication) {
        return ApiResponse.ok(service.list(authentication == null ? null : authentication.getName()));
    }

    @GetMapping("/{id}") public ApiResponse<ChallengeDtos.Detail> detail(@PathVariable Long id, Authentication authentication) {
        return ApiResponse.ok(service.detail(id, authentication == null ? null : authentication.getName()));
    }

    @PostMapping("/{id}/submit") public ApiResponse<ChallengeDtos.SubmitResult> submit(@PathVariable Long id,
            @Valid @RequestBody ChallengeDtos.SubmitRequest request, Authentication authentication, HttpServletRequest http) {
        return ApiResponse.ok(service.submit(id, authentication.getName(), http.getRemoteAddr(), request.flag()));
    }

    @GetMapping("/{id}/artifact") public ResponseEntity<Resource> artifact(@PathVariable Long id) {
        Resource resource = service.artifact(id);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }
}
