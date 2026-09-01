package com.minictf.common;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/** Lightweight, local moderation for account IDs and display names. */
@Component
public class AccountNameSafety {
  private static final List<Pattern> ABUSIVE_PATTERNS =
      List.of(
          Pattern.compile("(?:fuck|shit|bitch|bastard|asshole|dick|cock|cunt|nigg(?:a|er)?|faggot|retard|slut|whore)"),
          Pattern.compile("(?:씨발|시발|ㅅㅂ|ㅆㅂ|병신|ㅂㅅ|좆|조까|개새끼|개새|새끼|지랄|느금마|엠창|창녀|걸레|보지|자지)"));

  public void requireSafe(String value) {
    if (value == null || value.isBlank()) return;
    String normalized = normalize(value);
    if (ABUSIVE_PATTERNS.stream().anyMatch(pattern -> pattern.matcher(normalized).find()))
      throw new UnsafeAccountNameException();
  }

  private String normalize(String value) {
    String folded = Normalizer.normalize(value, Normalizer.Form.NFKC).toLowerCase(Locale.ROOT);
    return folded
        .replace('@', 'a')
        .replace('4', 'a')
        .replace('0', 'o')
        .replace('1', 'i')
        .replace('3', 'e')
        .replace('5', 's')
        .replace('7', 't')
        .replaceAll("[\\s_\\-./]", "")
        .replaceAll("(.)\\1{2,}", "$1$1");
  }

  public static class UnsafeAccountNameException extends RuntimeException {}
}
