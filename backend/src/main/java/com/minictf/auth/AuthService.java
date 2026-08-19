package com.minictf.auth;

import com.minictf.user.User;
import com.minictf.user.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository users; private final PasswordEncoder encoder; private final JwtService jwt;
    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt) { this.users=users; this.encoder=encoder; this.jwt=jwt; }
    @Transactional public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest request) {
        if (!request.password().equals(request.passwordConfirmation())) throw new IllegalArgumentException("비밀번호 확인이 일치하지 않습니다.");
        if (users.existsByUsername(request.username())) throw new IllegalArgumentException("이미 존재하는 username입니다.");
        User user = new User(); user.setUsername(request.username()); user.setNickname(request.nickname()==null || request.nickname().isBlank()?request.username():request.nickname());
        user.setPasswordHash(encoder.encode(request.password())); user.setRole("USER"); user.setScore(0); return issue(users.save(user));
    }
    @Transactional(readOnly=true) public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        User user=users.findByUsername(request.username()).orElseThrow(()->new EntityNotFoundException("아이디 또는 비밀번호가 올바르지 않습니다."));
        if (user.getPasswordHash()==null || !encoder.matches(request.password(), user.getPasswordHash())) throw new EntityNotFoundException("아이디 또는 비밀번호가 올바르지 않습니다.");
        return issue(user);
    }
    public AuthDtos.AuthResponse issue(User user) { return new AuthDtos.AuthResponse(jwt.createToken(user.getUsername(), user.getRole()), toView(user)); }
    public AuthDtos.UserView toView(User user) { return new AuthDtos.UserView(user.getId(), user.getUsername(), user.getNickname(), user.getRole(), user.getScore()); }
}
