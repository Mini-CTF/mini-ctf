package com.minictf.user;

import java.util.Objects;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Stores avatar bytes in PostgreSQL so they survive Render instance restarts. */
@Component
@ConditionalOnProperty(name = "app.profile.storage", havingValue = "database")
public class DatabaseAvatarStorage implements AvatarStorage {
  private final JdbcTemplate jdbc;

  public DatabaseAvatarStorage(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @Override
  public void store(String key, byte[] content, MediaType mediaType) {
    requireKey(key);
    jdbc.update(
        """
        INSERT INTO avatar_assets (storage_key, content, content_type)
        VALUES (?, ?, ?)
        ON CONFLICT (storage_key) DO UPDATE
        SET content = EXCLUDED.content, content_type = EXCLUDED.content_type
        """,
        key,
        content,
        mediaType.toString());
  }

  @Override
  public AvatarAsset load(String key) {
    requireKey(key);
    try {
      return jdbc.queryForObject(
          "SELECT content, content_type FROM avatar_assets WHERE storage_key = ?",
          (result, row) ->
              new AvatarAsset(
                  new ByteArrayResource(Objects.requireNonNull(result.getBytes("content"))),
                  MediaType.parseMediaType(result.getString("content_type"))),
          key);
    } catch (org.springframework.dao.EmptyResultDataAccessException ex) {
      throw new LocalAvatarStorage.AvatarNotFoundException();
    }
  }

  @Override
  public void delete(String key) {
    requireKey(key);
    jdbc.update("DELETE FROM avatar_assets WHERE storage_key = ?", key);
  }

  private static void requireKey(String key) {
    if (key == null || !key.startsWith("avatars/") || key.contains(".."))
      throw new IllegalArgumentException("Invalid avatar key");
  }
}
