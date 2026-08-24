package com.minictf.vault;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VaultOwnedCosmeticRepository extends JpaRepository<VaultOwnedCosmetic, Long> {
  boolean existsByUserIdAndCosmeticId(Long userId, String cosmeticId);

  List<VaultOwnedCosmetic> findByUserId(Long userId);
}
