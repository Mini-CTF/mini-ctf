package com.minictf.config;

import com.minictf.auth.JwtAuthenticationFilter;
import com.minictf.auth.OAuth2LoginFailureHandler;
import com.minictf.auth.OAuth2LoginSuccessHandler;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestCustomizers;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
@EnableScheduling
public class SecurityConfig {
  @Bean
  PasswordEncoder passwordEncoder() {
    return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
  }

  @Bean
  OAuth2AuthorizationRequestResolver oauth2AuthorizationRequestResolver(
      ClientRegistrationRepository registrations) {
    DefaultOAuth2AuthorizationRequestResolver pkceResolver =
        new DefaultOAuth2AuthorizationRequestResolver(registrations, "/oauth2/authorization");
    pkceResolver.setAuthorizationRequestCustomizer(OAuth2AuthorizationRequestCustomizers.withPkce());
    DefaultOAuth2AuthorizationRequestResolver discordResolver =
        new DefaultOAuth2AuthorizationRequestResolver(registrations, "/oauth2/authorization");
    return new OAuth2AuthorizationRequestResolver() {
      @Override
      public org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest resolve(
          HttpServletRequest request) {
        return isDiscord(request) ? discordResolver.resolve(request) : pkceResolver.resolve(request);
      }

      @Override
      public org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest resolve(
          HttpServletRequest request, String registrationId) {
        return "discord".equalsIgnoreCase(registrationId)
            ? discordResolver.resolve(request, registrationId)
            : pkceResolver.resolve(request, registrationId);
      }

      private boolean isDiscord(HttpServletRequest request) {
        return request.getRequestURI().endsWith("/oauth2/authorization/discord");
      }
    };
  }

  @Bean
  SecurityFilterChain securityFilterChain(
      HttpSecurity http,
      JwtAuthenticationFilter jwtFilter,
      OAuth2LoginSuccessHandler oauthHandler,
      OAuth2LoginFailureHandler oauthFailureHandler,
      RestSecurityHandlers handlers,
      OAuth2AuthorizationRequestResolver oauthResolver)
      throws Exception {
    return http.csrf(c -> c.disable())
        .cors(c -> {})
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
        .authorizeHttpRequests(
            a ->
                a.requestMatchers(
                        "/api/auth/register",
                        "/api/auth/login",
                        "/api/auth/oauth/**",
                        "/oauth2/**",
                        "/login/**",
                        "/v3/api-docs/**",
                        "/swagger-ui/**",
                        "/swagger-ui.html",
                        "/error")
                    .permitAll()
                    .requestMatchers(
                        HttpMethod.GET,
                        "/api/challenges",
                        "/api/challenges/*",
                        "/api/challenges/*/comments",
                        "/api/ranking",
                        "/api/stats",
                        "/api/users/*/profile",
                        "/api/users/*/avatar",
                        "/api/community/**")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .exceptionHandling(
            e ->
                e.authenticationEntryPoint(
                        (request, response, exception) -> handlers.unauthorized(response))
                    .accessDeniedHandler(
                        (request, response, exception) -> handlers.forbidden(response)))
        .oauth2Login(
            o ->
                o.authorizationEndpoint(
                        endpoint -> endpoint.authorizationRequestResolver(oauthResolver))
                    .successHandler(oauthHandler)
                    .failureHandler(oauthFailureHandler))
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
        .build();
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource(
      @Value("${app.cors.allowed-origins}") String origins) {
    CorsConfiguration c = new CorsConfiguration();
    c.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).toList());
    c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    c.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    c.setExposedHeaders(List.of("Retry-After", "Content-Disposition"));
    UrlBasedCorsConfigurationSource s = new UrlBasedCorsConfigurationSource();
    s.registerCorsConfiguration("/**", c);
    return s;
  }
}
