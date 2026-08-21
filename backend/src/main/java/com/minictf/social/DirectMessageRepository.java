package com.minictf.social;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DirectMessageRepository extends JpaRepository<DirectMessage, Long> {
  @Query(
      "select m from DirectMessage m join fetch m.sender join fetch m.recipient where (m.sender.id=:first and m.recipient.id=:second) or (m.sender.id=:second and m.recipient.id=:first) order by m.createdAt asc")
  List<DirectMessage> conversation(@Param("first") Long first, @Param("second") Long second);
}
