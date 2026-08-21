package com.minictf.challenge;
import com.minictf.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController @RequestMapping("/api/admin/challenges") @PreAuthorize("hasRole('ADMIN')")
public class AdminChallengeController {
    private final ChallengeService service; public AdminChallengeController(ChallengeService service){this.service=service;}
    @GetMapping public ApiResponse<?> list(){return ApiResponse.ok(service.adminList());}
    @GetMapping("/{id}") public ApiResponse<?> detail(@PathVariable Long id){return ApiResponse.ok(service.adminDetail(id));}
    @PostMapping public ResponseEntity<ApiResponse<ChallengeDtos.AdminView>> create(@Valid @RequestBody ChallengeDtos.AdminRequest r){return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(r)));}
    @PutMapping("/{id}") public ApiResponse<ChallengeDtos.AdminView> update(@PathVariable Long id,@Valid @RequestBody ChallengeDtos.AdminRequest r){return ApiResponse.ok(service.update(id,r));}
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable Long id){service.delete(id);}
    @PostMapping(value="/{id}/artifact",consumes="multipart/form-data") public ApiResponse<ChallengeDtos.ArtifactView> uploadArtifact(@PathVariable Long id,@RequestPart("file") MultipartFile file){return ApiResponse.ok(service.uploadArtifact(id,file));}
    @DeleteMapping("/{id}/artifact") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteArtifact(@PathVariable Long id){service.deleteArtifact(id);}
}
