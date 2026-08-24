package com.minictf.user;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {
  Optional<User> findByUsername(String username);

  Optional<User> findByUsernameIgnoreCase(String username);

  boolean existsByUsernameIgnoreCase(String username);

  boolean existsByUsername(String username);

  boolean existsByDeletedOriginalUsernameIgnoreCase(String username);

  List<User> findTop100ByStatusNotOrderByScoreDescUsernameAsc(String status);

  long countByScoreGreaterThanAndStatusNot(int score, String status);

  long countByStatusNot(String status);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select u from User u where lower(u.username) = lower(:username)")
  Optional<User> findByUsernameForUpdate(@Param("username") String username);
}
