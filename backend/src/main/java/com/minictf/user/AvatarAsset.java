package com.minictf.user;

import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;

public record AvatarAsset(Resource resource, MediaType mediaType) {}
