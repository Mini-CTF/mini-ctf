package com.minictf.community;

import com.minictf.common.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController @Validated @RequestMapping("/api/challenges/{challengeId}/comments")
public class ChallengeDiscussionController {
    private final CommunityService service;
    public ChallengeDiscussionController(CommunityService service){this.service=service;}
    @GetMapping public ApiResponse<?> list(@PathVariable Long challengeId,@RequestParam(defaultValue="GENERAL") @Pattern(regexp="(?i)GENERAL|SOLVER") String discussionType,Authentication auth){return ApiResponse.ok(service.listChallengeComments(challengeId,discussionType,name(auth)));}
    @PostMapping public ResponseEntity<?> create(@PathVariable Long challengeId,@Valid @RequestBody CommunityDtos.ChallengeCommentRequest request,Authentication auth,HttpServletRequest http){return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createChallengeComment(challengeId,request,name(auth),http.getRemoteAddr())));}
    @PutMapping("/{commentId}") public ApiResponse<?> update(@PathVariable Long challengeId,@PathVariable Long commentId,@Valid @RequestBody CommunityDtos.CommentRequest request,Authentication auth){return ApiResponse.ok(service.updateChallengeComment(challengeId,commentId,request,name(auth)));}
    @DeleteMapping("/{commentId}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable Long challengeId,@PathVariable Long commentId,Authentication auth){service.deleteChallengeComment(challengeId,commentId,name(auth));}
    private String name(Authentication auth){return auth==null?null:auth.getName();}
}
