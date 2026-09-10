package com.minictf.challenge;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ChallengeRepository extends JpaRepository<Challenge, Long> {
  boolean existsByTitle(String title);

  java.util.Optional<Challenge> findByTitle(String title);

  List<Challenge> findByActiveTrueOrderByIdAsc();

  @Query(
      "select c.id as id, c.title as title, c.category as category, c.difficulty as difficulty, "
          + "c.score as score, c.artifactPath as artifactPath "
          + "from Challenge c where c.active = true order by c.id asc")
  List<PublicListRow> findActivePublicList();

  long countByActiveTrue();

  interface PublicListRow {
    Long getId();

    String getTitle();

    String getCategory();

    String getDifficulty();

    int getScore();

    String getArtifactPath();
  }
}
