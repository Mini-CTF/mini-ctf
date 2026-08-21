package com.minictf.community;

import com.minictf.common.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController @Validated @RequestMapping("/api/community")
public class CommunityController {
    private final CommunityService service;
    public CommunityController(CommunityService service){this.service=service;}

    @GetMapping("/posts")
    public ApiResponse<?> posts(@RequestParam(required=false) @Pattern(regexp="(?i)FREE|QUESTION|CTF|NOTICE") String category,@RequestParam(defaultValue="0") @Min(0) int page,@RequestParam(defaultValue="20") @Min(1) @Max(50) int size){return ApiResponse.ok(service.listPosts(category,page,size));}
    @GetMapping("/posts/{id}") public ApiResponse<?> post(@PathVariable Long id,Authentication auth){return ApiResponse.ok(service.postDetail(id,name(auth)));}
    @PostMapping("/posts") public ResponseEntity<?> createPost(@Valid @RequestBody CommunityDtos.PostRequest request,Authentication auth,HttpServletRequest http){return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createPost(request,name(auth),http.getRemoteAddr())));}
    @PutMapping("/posts/{id}") public ApiResponse<?> updatePost(@PathVariable Long id,@Valid @RequestBody CommunityDtos.PostRequest request,Authentication auth){return ApiResponse.ok(service.updatePost(id,request,name(auth)));}
    @DeleteMapping("/posts/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deletePost(@PathVariable Long id,Authentication auth){service.deletePost(id,name(auth));}

    @GetMapping("/posts/{postId}/comments") public ApiResponse<?> comments(@PathVariable Long postId,Authentication auth){return ApiResponse.ok(service.listPostComments(postId,name(auth)));}
    @PostMapping("/posts/{postId}/comments") public ResponseEntity<?> createComment(@PathVariable Long postId,@Valid @RequestBody CommunityDtos.CommentRequest request,Authentication auth,HttpServletRequest http){return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createPostComment(postId,request,name(auth),http.getRemoteAddr())));}
    @PutMapping("/comments/{id}") public ApiResponse<?> updateComment(@PathVariable Long id,@Valid @RequestBody CommunityDtos.CommentRequest request,Authentication auth){return ApiResponse.ok(service.updatePostComment(id,request,name(auth)));}
    @DeleteMapping("/comments/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteComment(@PathVariable Long id,Authentication auth){service.deletePostComment(id,name(auth));}
    private String name(Authentication auth){return auth==null?null:auth.getName();}
}
