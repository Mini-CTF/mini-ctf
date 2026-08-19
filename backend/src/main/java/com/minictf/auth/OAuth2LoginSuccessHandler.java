package com.minictf.auth;

import com.minictf.user.User;
import com.minictf.user.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {
    private final OAuthAccountRepository accounts;
    private final UserRepository users;
    private final JwtService jwtService;
    private final String redirect;

    public OAuth2LoginSuccessHandler(OAuthAccountRepository accounts, UserRepository users, JwtService jwtService,
                                     @Value("${app.oauth.success-redirect}") String redirect) {
        this.accounts = accounts;
        this.users = users;
        this.jwtService = jwtService;
        this.redirect = redirect;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        OAuth2AuthenticationToken oauth = (OAuth2AuthenticationToken) authentication;
        OAuth2User principal = oauth.getPrincipal();
        String provider = oauth.getAuthorizedClientRegistrationId().toLowerCase();
        String subject = attribute(principal, "sub", "id");
        if (subject == null || subject.isBlank()) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "OAuth subject is missing");
            return;
        }

        User user = accounts.findByProviderAndProviderSubject(provider, subject)
                .map(OAuthAccount::getUser)
                .orElseGet(() -> createUser(provider, subject, principal));
        String jwt = jwtService.createToken(user.getUsername(), user.getRole());
        response.sendRedirect(redirect + (redirect.contains("?") ? "&" : "?")
                + "token=" + URLEncoder.encode(jwt, StandardCharsets.UTF_8));
    }

    private User createUser(String provider, String subject, OAuth2User principal) {
        String username = provider + "_" + shortHash(subject);
        User user = new User();
        user.setUsername(username);
        String email = attribute(principal, "email");
        String name = attribute(principal, "name", "nickname");
        user.setNickname(firstNonBlank(name, email, username));
        user.setRole("USER");
        user.setScore(0);
        user = users.save(user);

        OAuthAccount account = new OAuthAccount();
        account.setUser(user);
        account.setProvider(provider);
        account.setProviderSubject(subject);
        accounts.save(account);
        return user;
    }

    private static String attribute(OAuth2User user, String... keys) {
        for (String key : keys) {
            Object value = user.getAttributes().get(key);
            if (value != null && !value.toString().isBlank()) return value.toString();
        }
        return null;
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) if (value != null && !value.isBlank()) return value;
        return "OAuth User";
    }

    private static String shortHash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder();
            for (byte b : digest) result.append(String.format("%02x", b));
            return result.substring(0, 24);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to create OAuth username", ex);
        }
    }
}
