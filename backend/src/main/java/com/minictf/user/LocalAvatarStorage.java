package com.minictf.user;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.profile.storage", havingValue = "local", matchIfMissing = true)
public class LocalAvatarStorage implements AvatarStorage {
  private final Path root;

  public LocalAvatarStorage(@Value("${app.profile.storage-root}") String storageRoot) {
    root = Paths.get(storageRoot).toAbsolutePath().normalize();
  }

  @Override
  public void store(String key, byte[] content, MediaType mediaType) {
    Path target = managed(key);
    try {
      Files.createDirectories(target.getParent());
      Files.write(target, content);
    } catch (IOException ex) {
      throw new IllegalStateException("Could not store avatar", ex);
    }
  }

  @Override
  public AvatarAsset load(String key) {
    Path image = managed(key);
    if (!Files.isRegularFile(image)) throw new AvatarNotFoundException();
    return new AvatarAsset(new FileSystemResource(image), mediaType(key));
  }

  @Override
  public void delete(String key) {
    try {
      Files.deleteIfExists(managed(key));
    } catch (IOException ex) {
      throw new IllegalStateException("Could not delete avatar", ex);
    }
  }

  private Path managed(String key) {
    Path path = root.resolve(key).normalize();
    if (!path.startsWith(root)) throw new IllegalArgumentException("Invalid avatar path");
    return path;
  }

  static MediaType mediaType(String key) {
    return key.toLowerCase().endsWith(".png") ? MediaType.IMAGE_PNG : MediaType.IMAGE_JPEG;
  }

  static class AvatarNotFoundException extends RuntimeException {}
}
