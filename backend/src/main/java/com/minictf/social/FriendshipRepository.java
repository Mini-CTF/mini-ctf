package com.minictf.social;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {
  @Query(
      "select f from Friendship f where (f.requester.id=:first and f.recipient.id=:second) or (f.requester.id=:second and f.recipient.id=:first)")
  Optional<Friendship> findRelationship(@Param("first") Long first, @Param("second") Long second);

  @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @Query(
      "select f from Friendship f where (f.requester.id=:first and f.recipient.id=:second) or (f.requester.id=:second and f.recipient.id=:first)")
  Optional<Friendship> findRelationshipForUpdate(
      @Param("first") Long first, @Param("second") Long second);

  @Query(
      "select f from Friendship f join fetch f.requester join fetch f.recipient where (f.requester.id=:userId or f.recipient.id=:userId) and f.requester.status <> 'DELETED' and f.recipient.status <> 'DELETED' order by f.updatedAt desc")
  List<Friendship> findAllForUser(@Param("userId") Long userId);

  @Query(
      "select f from Friendship f join fetch f.requester join fetch f.recipient where (f.requester.id=:userId or f.recipient.id=:userId) and f.status = 'ACCEPTED' and f.requester.status <> 'DELETED' and f.recipient.status <> 'DELETED' order by f.updatedAt desc")
  List<Friendship> findAcceptedForUser(@Param("userId") Long userId);
}
