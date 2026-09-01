package com.minictf.common;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class AccountNameSafetyTest {
  private final AccountNameSafety safety = new AccountNameSafety();

  @Test
  void acceptsOrdinaryKoreanAndEnglishNames() {
    assertDoesNotThrow(() -> safety.requireSafe("flagbox_beginner"));
    assertDoesNotThrow(() -> safety.requireSafe("보안 입문자"));
  }

  @Test
  void rejectsKoreanAndEnglishAbusiveExpressionsIncludingSimpleObfuscation() {
    assertThrows(
        AccountNameSafety.UnsafeAccountNameException.class, () -> safety.requireSafe("시_발"));
    assertThrows(
        AccountNameSafety.UnsafeAccountNameException.class, () -> safety.requireSafe("f_u_c_k"));
  }
}
