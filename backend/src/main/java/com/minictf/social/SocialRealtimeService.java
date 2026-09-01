package com.minictf.social;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class SocialRealtimeService {
  private final ConcurrentHashMap<String, CopyOnWriteArraySet<SseEmitter>> listeners =
      new ConcurrentHashMap<>();

  public SseEmitter subscribe(String username) {
    SseEmitter emitter = new SseEmitter(25 * 60 * 1000L);
    listeners.computeIfAbsent(username, ignored -> new CopyOnWriteArraySet<>()).add(emitter);
    Runnable remove = () -> remove(username, emitter);
    emitter.onCompletion(remove);
    emitter.onTimeout(remove);
    emitter.onError(ignored -> remove.run());
    return emitter;
  }

  public void publishAfterCommit(String recipientUsername, SocialDtos.MessageView message) {
    Runnable publish = () -> send(recipientUsername, "direct-message", message);
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.registerSynchronization(
          new TransactionSynchronization() {
            @Override
            public void afterCommit() {
              publish.run();
            }
          });
    } else {
      publish.run();
    }
  }

  public void publishMessageDeletedAfterCommit(
      String recipientUsername, SocialDtos.MessageDeletedView message) {
    Runnable publish = () -> send(recipientUsername, "direct-message-deleted", message);
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.registerSynchronization(
          new TransactionSynchronization() {
            @Override
            public void afterCommit() {
              publish.run();
            }
          });
    } else {
      publish.run();
    }
  }

  public void publishFriendshipAfterCommit(String username, SocialDtos.FriendView friendship) {
    Runnable publish = () -> send(username, "friendship", friendship);
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.registerSynchronization(
          new TransactionSynchronization() {
            @Override
            public void afterCommit() {
              publish.run();
            }
          });
    } else {
      publish.run();
    }
  }

  private void send(String username, String eventName, Object data) {
    for (SseEmitter emitter : listeners.getOrDefault(username, new CopyOnWriteArraySet<>())) {
      try {
        emitter.send(SseEmitter.event().name(eventName).data(data));
      } catch (IOException | IllegalStateException ex) {
        remove(username, emitter);
      }
    }
  }

  private void remove(String username, SseEmitter emitter) {
    listeners.computeIfPresent(
        username,
        (ignored, emitters) -> {
          emitters.remove(emitter);
          return emitters.isEmpty() ? null : emitters;
        });
  }
}
