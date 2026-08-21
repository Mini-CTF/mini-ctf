package com.minictf.challenge;
import com.minictf.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.file.Path;

@RestController @RequestMapping("/api/challenges")
public class ChallengeController {
    private final ChallengeService service; public ChallengeController(ChallengeService service){this.service=service;}
    @GetMapping public ApiResponse<?> list(Authentication auth){return ApiResponse.ok(service.list(auth==null?null:auth.getName()));}
    @GetMapping("/{id}") public ApiResponse<?> detail(@PathVariable Long id,Authentication auth){return ApiResponse.ok(service.detail(id,auth==null?null:auth.getName()));}
    @PostMapping("/{id}/submit") public ApiResponse<ChallengeDtos.SubmitResult> submit(@PathVariable Long id,@Valid @RequestBody ChallengeDtos.SubmitRequest req,Authentication auth,HttpServletRequest request){return ApiResponse.ok(service.submit(id,auth.getName(),req.flag(),request.getRemoteAddr()));}
    @GetMapping("/{id}/artifact") public ResponseEntity<Resource> artifact(@PathVariable Long id){Path p=service.artifact(id);ContentDisposition disposition=ContentDisposition.attachment().filename(p.getFileName().toString(),java.nio.charset.StandardCharsets.UTF_8).build();return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM).contentLength(p.toFile().length()).header(HttpHeaders.CONTENT_DISPOSITION,disposition.toString()).header("X-Content-Type-Options","nosniff").body(new FileSystemResource(p));}
}
