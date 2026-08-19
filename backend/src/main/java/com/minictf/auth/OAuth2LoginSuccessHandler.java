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
    private final OAuthAccountRepository accounts; private final UserRepository users; private final JwtService jwt; private final String redirect;
    public OAuth2LoginSuccessHandler(OAuthAccountRepository accounts, UserRepository users, JwtService jwt, @Value("${app.oauth.success-redirect}") String redirect) { this.accounts=accounts;this.users=users;this.jwt=jwt;this.redirect=redirect; }
    @Override public void onAuthenticationSuccess(HttpServletRequest request,HttpServletResponse response,Authentication authentication) throws IOException,ServletException {
        OAuth2AuthenticationToken token=(OAuth2AuthenticationToken)authentication; OAuth2User principal=token.getPrincipal(); String provider=token.getAuthorizedClientRegistrationId().toLowerCase();
        String subject=attribute(principal,"sub","id"); if(subject==null||subject.isBlank()){response.sendError(400,"OAuth subject is missing");return;}
        User user=accounts.findByProviderAndProviderSubject(provider,subject).map(OAuthAccount::getUser).orElseGet(()->create(provider,subject,principal));
        response.sendRedirect(redirect+(redirect.contains("?")?"&":"?")+"token="+URLEncoder.encode(jwt.createToken(user.getUsername(),user.getRole()),StandardCharsets.UTF_8));
    }
    private User create(String provider,String subject,OAuth2User principal){
        String username=provider+"_"+hash(subject); User user=new User();user.setUsername(username);user.setNickname(first(attribute(principal,"name","nickname","email"),username));user.setRole("USER");user.setScore(0);user=users.save(user);
        OAuthAccount account=new OAuthAccount();account.setUser(user);account.setProvider(provider);account.setProviderSubject(subject);accounts.save(account);return user;
    }
    private static String attribute(OAuth2User user,String...keys){for(String key:keys){Object v=user.getAttributes().get(key);if(v!=null&&!v.toString().isBlank())return v.toString();}return null;}
    private static String first(String value,String fallback){return value==null||value.isBlank()?fallback:value;}
    private static String hash(String value){try{byte[] bytes=MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));StringBuilder s=new StringBuilder();for(byte b:bytes)s.append(String.format("%02x",b));return s.substring(0,24);}catch(Exception e){throw new IllegalStateException(e);}}
}
