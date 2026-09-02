package com.minictf.admin;

import com.minictf.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SecurityEventService {
  private final SecurityEventRepository events;

  public SecurityEventService(SecurityEventRepository events) {
    this.events = events;
  }

  @Transactional
  public void record(User user, String type, String subject, String ip, String detail) {
    save(user, type, subject, ip, null, detail);
  }

  @Transactional
  public void record(
      User user, String type, String subject, String ip, String deviceFingerprint, String detail) {
    save(user, type, subject, ip, deviceFingerprint, detail);
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void recordIndependent(User user, String type, String subject, String ip, String detail) {
    save(user, type, subject, ip, null, detail);
  }

  private void save(
      User user, String type, String subject, String ip, String deviceFingerprint, String detail) {
    SecurityEvent event = new SecurityEvent();
    event.setUser(user);
    event.setEventType(type);
    event.setSubject(subject);
    event.setIpAddress(ip);
    event.setDeviceFingerprint(deviceFingerprint);
    event.setDetail(detail);
    events.save(event);
  }
}
