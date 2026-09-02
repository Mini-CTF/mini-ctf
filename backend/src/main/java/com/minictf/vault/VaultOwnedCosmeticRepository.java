package com.minictf.vault;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VaultOwnedCosmeticRepository extends JpaRepository<VaultOwnedCosmetic, Long> {
  boolean existsByUserIdAndCosmeticId(Long userId, String cosmeticId);

  List<VaultOwnedCosmetic> findByUserId(Long userId);

  @Modifying
  @Query(
      "delete from VaultOwnedCosmetic cosmetic where cosmetic.user.id = :userId and cosmetic.cosmeticId = :cosmeticId")
  void deleteByUserIdAndCosmeticId(
      @Param("userId") Long userId, @Param("cosmeticId") String cosmeticId);
}
