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
    @GetMapping public ApiResponse<?> list(){return ApiResponse.ok(service.list());}
    @GetMapping("/{id}") public ApiResponse<?> detail(@PathVariable Long id){return ApiResponse.ok(service.detail(id));}
    @PostMapping("/{id}/submit") public ApiResponse<ChallengeDtos.SubmitResult> submit(@PathVariable Long id,@Valid @RequestBody ChallengeDtos.SubmitRequest req,Authentication auth,HttpServletRequest request){return ApiResponse.ok(service.submit(id,auth.getName(),req.flag(),request.getRemoteAddr()));}
    @GetMapping("/{id}/artifact") public ResponseEntity<Resource> artifact(@PathVariable Long id){Path p=service.artifact(id);return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM).header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=\""+p.getFileName()+"\"").body(new FileSystemResource(p));}
}
