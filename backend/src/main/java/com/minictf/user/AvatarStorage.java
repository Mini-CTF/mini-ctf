package com.minictf.user;

import org.springframework.http.MediaType;

public interface AvatarStorage {
  void store(String key, byte[] content, MediaType mediaType);

  AvatarAsset load(String key);

  void delete(String key);
}
