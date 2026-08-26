package com.minictf.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Persists short-lived OAuth state so cross-site callbacks do not depend on a server session. */
@Component
public class DatabaseOAuth2AuthorizationRequestRepository
    implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {
  private static final Duration LIFETIME = Duration.ofMinutes(10);
  private final OAuthAuthorizationRequestEntityRepository requests;

  public DatabaseOAuth2AuthorizationRequestRepository(
      OAuthAuthorizationRequestEntityRepository requests) {
    this.requests = requests;
  }

  @Override
  @Transactional(readOnly = true)
  public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
    String state = request.getParameter("state");
    if (state == null || state.isBlank()) return null;
    return requests
        .findById(state)
        .filter(item -> item.getExpiresAt().isAfter(Instant.now()))
        .map(item -> deserialize(item.getPayload()))
        .orElse(null);
  }

  @Override
  @Transactional
  public void saveAuthorizationRequest(
      OAuth2AuthorizationRequest authorizationRequest,
      HttpServletRequest request,
      HttpServletResponse response) {
    if (authorizationRequest == null) {
      removeAuthorizationRequest(request, response);
      return;
    }
    OAuthAuthorizationRequestEntity entity = new OAuthAuthorizationRequestEntity();
    entity.setState(authorizationRequest.getState());
    entity.setPayload(serialize(authorizationRequest));
    entity.setExpiresAt(Instant.now().plus(LIFETIME));
    requests.save(entity);
  }

  @Override
  @Transactional
  public OAuth2AuthorizationRequest removeAuthorizationRequest(
      HttpServletRequest request, HttpServletResponse response) {
    String state = request.getParameter("state");
    if (state == null || state.isBlank()) return null;
    return requests
        .findById(state)
        .map(
            item -> {
              requests.delete(item);
              return item.getExpiresAt().isAfter(Instant.now())
                  ? deserialize(item.getPayload())
                  : null;
            })
        .orElse(null);
  }

  private static String serialize(OAuth2AuthorizationRequest request) {
    try (ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ObjectOutputStream output = new ObjectOutputStream(bytes)) {
      output.writeObject(request);
      return Base64.getEncoder().encodeToString(bytes.toByteArray());
    } catch (Exception exception) {
      throw new IllegalStateException("Could not persist OAuth authorization request", exception);
    }
  }

  private static OAuth2AuthorizationRequest deserialize(String value) {
    try (ObjectInputStream input =
        new ObjectInputStream(new ByteArrayInputStream(Base64.getDecoder().decode(value)))) {
      Object item = input.readObject();
      if (item instanceof OAuth2AuthorizationRequest request) return request;
      throw new IllegalStateException("Unexpected OAuth authorization request payload");
    } catch (Exception exception) {
      throw new IllegalStateException("Could not restore OAuth authorization request", exception);
    }
  }
}
