package com.minictf.assistant;

import com.minictf.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/assistant")
public class AssistantController {
  private final AssistantService service;

  public AssistantController(AssistantService service) {
    this.service = service;
  }

  @PostMapping("/chat")
  public ApiResponse<AssistantDtos.ChatReply> chat(
      @Valid @RequestBody AssistantDtos.ChatRequest request, Authentication authentication) {
    return ApiResponse.ok(service.reply(authentication.getName(), request));
  }
}
