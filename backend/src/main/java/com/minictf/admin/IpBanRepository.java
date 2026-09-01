package com.minictf.admin;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IpBanRepository extends JpaRepository<IpBan, Long> {
  Optional<IpBan> findByIpAddress(String ipAddress);
}
