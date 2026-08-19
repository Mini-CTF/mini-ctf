package com.minictf.auth;

import com.minictf.user.User;
import com.minictf.user.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest request) {
        if (!request.password().equals(request.passwordConfirmation())) {
            throw new IllegalArgumentException("비밀번호 확인이 일치하지 않습니다.");
        }
        if (userRepository.existsByUsername(request.username())) {
            throw new IllegalArgumentException("이미 존재하는 username입니다.");
        }
        User user = new User();
        user.setUsername(request.username());
        user.setNickname(request.nickname() == null || request.nickname().isBlank() ? request.username() : request.nickname());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole("USER");
        user.setScore(0);
        return issue(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        User user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new EntityNotFoundException("아이디 또는 비밀번호가 올바르지 않습니다."));
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new EntityNotFoundException("아이디 또는 비밀번호가 올바르지 않습니다.");
        }
        return issue(user);
    }

    public AuthDtos.AuthResponse issue(User user) {
        return new AuthDtos.AuthResponse(jwtService.createToken(user.getUsername(), user.getRole()), toView(user));
    }

    public AuthDtos.UserView toView(User user) {
        return new AuthDtos.UserView(user.getId(), user.getUsername(), user.getNickname(), user.getRole(), user.getScore());
    }
}
