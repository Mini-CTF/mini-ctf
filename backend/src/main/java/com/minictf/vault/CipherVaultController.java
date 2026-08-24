package com.minictf.vault;

import com.minictf.common.ApiResponse;
import com.minictf.user.User;
import com.minictf.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/vault")
public class CipherVaultController {
  private final CipherVaultService service;
  private final UserRepository users;

  public CipherVaultController(CipherVaultService service, UserRepository users) {
    this.service = service;
    this.users = users;
  }

  @GetMapping
  public ApiResponse<VaultDtos.Summary> summary(Authentication auth) {
    return ApiResponse.ok(service.summary(user(auth)));
  }

  @PostMapping("/discover")
  public ApiResponse<VaultDtos.Summary> discover(Authentication auth) {
    return ApiResponse.ok(service.discover(user(auth)));
  }

  @PostMapping("/hidden/discover")
  public ApiResponse<VaultDtos.HiddenSummary> discoverHidden(Authentication auth) {
    return ApiResponse.ok(service.discoverHidden(user(auth)));
  }

  @GetMapping("/hidden")
  public ApiResponse<VaultDtos.HiddenSummary> hidden(Authentication auth) {
    return ApiResponse.ok(service.hidden(user(auth)));
  }

  @PostMapping("/hidden/missions/{id}/claim")
  public ApiResponse<VaultDtos.HiddenSummary> claimHidden(
      @PathVariable String id, Authentication auth) {
    return ApiResponse.ok(service.completeHiddenMission(user(auth), id));
  }

  @PostMapping("/missions/{id}/claim")
  public ApiResponse<VaultDtos.Summary> claim(@PathVariable String id, Authentication auth) {
    return ApiResponse.ok(service.completeMission(user(auth), id));
  }

  @PostMapping("/shop/buy")
  public ApiResponse<VaultDtos.Summary> buy(
      @Valid @RequestBody VaultDtos.IdRequest request, Authentication auth) {
    return ApiResponse.ok(service.buy(user(auth), request.id()));
  }

  @PostMapping("/craft")
  public ApiResponse<VaultDtos.Summary> craft(
      @Valid @RequestBody VaultDtos.IdRequest request, Authentication auth) {
    return ApiResponse.ok(service.craft(user(auth), request.id()));
  }

  @PutMapping("/equip")
  public ApiResponse<VaultDtos.Summary> equip(
      @Valid @RequestBody VaultDtos.IdRequest request, Authentication auth) {
    return ApiResponse.ok(service.equip(user(auth), request.id()));
  }

  private User user(Authentication auth) {
    return users.findByUsernameIgnoreCase(auth.getName()).orElseThrow();
  }
}
