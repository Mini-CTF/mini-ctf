package com.minictf.common;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class RateLimitService {
  private final Map<String, ArrayDeque<Instant>> attempts = new ConcurrentHashMap<>();
  private final Clock clock;

  public RateLimitService() {
    this(Clock.systemUTC());
  }

  RateLimitService(Clock clock) {
    this.clock = clock;
  }

  public void check(String scope, String key, int maximumAttempts, long windowSeconds) {
    String bucketKey = scope + ":" + key;
    Instant now = clock.instant();
    Instant cutoff = now.minusSeconds(windowSeconds);
    ArrayDeque<Instant> bucket = attempts.computeIfAbsent(bucketKey, ignored -> new ArrayDeque<>());

    synchronized (bucket) {
      while (!bucket.isEmpty() && !bucket.peekFirst().isAfter(cutoff)) {
        bucket.removeFirst();
      }
      if (bucket.size() >= maximumAttempts) {
        long retryAfter =
            Math.max(
                1, windowSeconds - (now.getEpochSecond() - bucket.peekFirst().getEpochSecond()));
        throw new RateLimitedException(retryAfter);
      }
      bucket.addLast(now);
    }

    if (attempts.size() > 10_000) {
      attempts
          .entrySet()
          .removeIf(
              entry -> {
                ArrayDeque<Instant> value = entry.getValue();
                synchronized (value) {
                  return value.isEmpty() || !value.peekLast().isAfter(cutoff);
                }
              });
    }
  }

  public static class RateLimitedException extends RuntimeException {
    private final long retryAfterSeconds;

    public RateLimitedException(long retryAfterSeconds) {
      this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() {
      return retryAfterSeconds;
    }
  }
}
