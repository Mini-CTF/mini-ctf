package com.minictf.vault;

import com.minictf.anticheat.ChallengeActivityEventRepository;
import com.minictf.attendance.AttendanceCheckinRepository;
import com.minictf.challenge.SolveRepository;
import com.minictf.user.User;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CipherVaultService {
  private static final ZoneId PLATFORM_ZONE = ZoneId.of("Asia/Seoul");
  private static final List<Item> ITEMS =
      List.of(
          new Item(
              "blue_terminal_frame",
              "Blue Terminal",
              "A calm signal frame.",
              "FRAME",
              "STORE",
              45,
              0,
              false),
          new Item(
              "violet_circuit_frame",
              "Violet Circuit",
              "A charged circuit frame.",
              "FRAME",
              "STORE",
              90,
              0,
              false),
          new Item(
              "signal_orbit",
              "Signal Orbit",
              "An orbiting profile accent.",
              "ACCESSORY",
              "STORE",
              60,
              0,
              false),
          new Item(
              "vault_key",
              "Vault Key",
              "A key earned with gems.",
              "ACCESSORY",
              "STORE",
              120,
              0,
              false),
          new Item(
              "neon_cipher_frame",
              "Neon Cipher",
              "A crafted neon frame.",
              "FRAME",
              "CRAFT",
              0,
              10,
              false),
          new Item(
              "spectral_core",
              "Spectral Core",
              "A rare crafted profile core.",
              "ACCESSORY",
              "CRAFT",
              0,
              15,
              false),
          new Item(
              "ghost_protocol",
              "Ghost Protocol",
              "A signal only the curious can see.",
              "FRAME",
              "HIDDEN",
              0,
              0,
              true),
          new Item(
              "first_flag",
              "Flag Seeker",
              "Solve your first challenge.",
              "TITLE",
              "QUEST",
              0,
              0,
              false),
          new Item(
              "vault_breaker",
              "Vault Breaker",
              "Craft the Neon Cipher frame.",
              "TITLE",
              "QUEST",
              0,
              0,
              false),
          new Item(
              "signal_ghost",
              "Signal Ghost",
              "Discover the hidden vault signal.",
              "TITLE",
              "HIDDEN",
              0,
              0,
              true));
  private static final Map<String, MissionRule> MISSIONS =
      Map.of(
          "daily_checkin",
              new MissionRule(
                  "daily_checkin", "Signal Check", "Complete today's attendance check-in.", 10, 0),
          "daily_explorer",
              new MissionRule("daily_explorer", "Open Channel", "Open any challenge today.", 8, 0),
          "daily_solver",
              new MissionRule(
                  "daily_solver", "Break the Lock", "Solve one challenge today.", 25, 1));

  private final VaultMissionCompletionRepository completions;
  private final VaultOwnedCosmeticRepository owned;
  private final AttendanceCheckinRepository checkins;
  private final ChallengeActivityEventRepository activities;
  private final SolveRepository solves;

  public CipherVaultService(
      VaultMissionCompletionRepository completions,
      VaultOwnedCosmeticRepository owned,
      AttendanceCheckinRepository checkins,
      ChallengeActivityEventRepository activities,
      SolveRepository solves) {
    this.completions = completions;
    this.owned = owned;
    this.checkins = checkins;
    this.activities = activities;
    this.solves = solves;
  }

  @Transactional(readOnly = true)
  public VaultDtos.Summary summary(User user) {
    return summaryFor(user);
  }

  @Transactional
  public VaultDtos.Summary discover(User user) {
    grant(user, "ghost_protocol", "HIDDEN");
    return summaryFor(user);
  }

  @Transactional
  public VaultDtos.Summary completeMission(User user, String id) {
    MissionRule rule =
        Optional.ofNullable(MISSIONS.get(id))
            .orElseThrow(() -> new IllegalArgumentException("Unknown vault mission"));
    LocalDate today = today();
    if (completions.existsByUserIdAndMissionIdAndMissionDate(user.getId(), id, today))
      throw new IllegalArgumentException("This mission has already been claimed today");
    if (!eligible(user, id, startOfToday()))
      throw new IllegalArgumentException("Complete the mission requirement first");
    VaultMissionCompletion completion = new VaultMissionCompletion();
    completion.setUser(user);
    completion.setMissionId(id);
    completion.setMissionDate(today);
    completions.save(completion);
    user.setCipherGems(user.getCipherGems() + rule.gems());
    user.setVaultFragments(user.getVaultFragments() + rule.fragments());
    return summaryFor(user);
  }

  @Transactional
  public VaultDtos.Summary buy(User user, String id) {
    Item item = item(id);
    if (!"STORE".equals(item.source()))
      throw new IllegalArgumentException("This item is not sold in the shop");
    if (!admin(user) && owned.existsByUserIdAndCosmeticId(user.getId(), id))
      throw new IllegalArgumentException("You already own this item");
    if (!admin(user)) {
      if (user.getCipherGems() < item.gemCost())
        throw new IllegalArgumentException("Not enough Cipher Gems");
      user.setCipherGems(user.getCipherGems() - item.gemCost());
      grant(user, id, "STORE");
    }
    return summaryFor(user);
  }

  @Transactional
  public VaultDtos.Summary craft(User user, String id) {
    Item item = item(id);
    if (!"CRAFT".equals(item.source()))
      throw new IllegalArgumentException("This item cannot be crafted");
    if (!admin(user) && owned.existsByUserIdAndCosmeticId(user.getId(), id))
      throw new IllegalArgumentException("You already crafted this item");
    if (!admin(user)) {
      if (user.getVaultFragments() < item.fragmentCost())
        throw new IllegalArgumentException("Not enough Vault Fragments");
      user.setVaultFragments(user.getVaultFragments() - item.fragmentCost());
      grant(user, id, "CRAFT");
    }
    return summaryFor(user);
  }

  @Transactional
  public VaultDtos.Summary equip(User user, String id) {
    Item item = item(id);
    if (!available(user, item))
      throw new IllegalArgumentException("This cosmetic has not been unlocked");
    switch (item.type()) {
      case "FRAME" -> user.setEquippedFrame(id);
      case "ACCESSORY" -> user.setEquippedAccessory(id);
      case "TITLE" -> user.setEquippedVaultTitle(id);
      default -> throw new IllegalArgumentException("Unsupported cosmetic type");
    }
    return summaryFor(user);
  }

  private VaultDtos.Summary summaryFor(User user) {
    LocalDate today = today();
    Instant start = startOfToday();
    Set<String> completed = completions.findMissionIdsByUserAndDate(user.getId(), today);
    List<VaultDtos.Mission> missionViews =
        MISSIONS.values().stream()
            .sorted(Comparator.comparing(MissionRule::id))
            .map(
                rule ->
                    new VaultDtos.Mission(
                        rule.id(),
                        rule.name(),
                        rule.description(),
                        rule.gems(),
                        rule.fragments(),
                        eligible(user, rule.id(), start),
                        completed.contains(rule.id())))
            .toList();
    return new VaultDtos.Summary(
        user.getCipherGems(),
        user.getVaultFragments(),
        missionViews,
        ITEMS.stream()
            .filter(item -> !item.hidden() || admin(user) || available(user, item))
            .map(item -> view(user, item))
            .toList());
  }

  private VaultDtos.Cosmetic view(User user, Item item) {
    boolean available = available(user, item);
    boolean equipped =
        switch (item.type()) {
          case "FRAME" -> item.id().equals(user.getEquippedFrame());
          case "ACCESSORY" -> item.id().equals(user.getEquippedAccessory());
          case "TITLE" -> item.id().equals(user.getEquippedVaultTitle());
          default -> false;
        };
    return new VaultDtos.Cosmetic(
        item.id(),
        item.name(),
        item.description(),
        item.type(),
        item.source(),
        item.gemCost(),
        item.fragmentCost(),
        item.hidden(),
        available,
        equipped);
  }

  private boolean available(User user, Item item) {
    if (admin(user)) return true;
    if ("TITLE".equals(item.type())) return titleEarned(user, item.id());
    return owned.existsByUserIdAndCosmeticId(user.getId(), item.id());
  }

  private boolean titleEarned(User user, String id) {
    return switch (id) {
      case "first_flag" -> solves.countByUser(user.getId()) >= 1;
      case "vault_breaker" -> owned.existsByUserIdAndCosmeticId(user.getId(), "neon_cipher_frame");
      case "signal_ghost" -> owned.existsByUserIdAndCosmeticId(user.getId(), "ghost_protocol");
      default -> false;
    };
  }

  private boolean eligible(User user, String id, Instant start) {
    return switch (id) {
      case "daily_checkin" ->
          checkins.findByUserIdAndCheckinDate(user.getId(), today()).isPresent();
      case "daily_explorer" ->
          activities.existsByUserIdAndActivityTypeAndOccurredAtGreaterThanEqual(
              user.getId(), "OPENED", start);
      case "daily_solver" -> solves.existsByUserIdAndSolvedAtGreaterThanEqual(user.getId(), start);
      default -> false;
    };
  }

  private void grant(User user, String id, String source) {
    if (owned.existsByUserIdAndCosmeticId(user.getId(), id)) return;
    VaultOwnedCosmetic cosmetic = new VaultOwnedCosmetic();
    cosmetic.setUser(user);
    cosmetic.setCosmeticId(id);
    cosmetic.setSource(source);
    owned.save(cosmetic);
  }

  private Item item(String id) {
    return ITEMS.stream()
        .filter(item -> item.id().equals(id))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("Unknown cosmetic"));
  }

  private boolean admin(User user) {
    return "ADMIN".equals(user.getRole());
  }

  private LocalDate today() {
    return LocalDate.now(PLATFORM_ZONE);
  }

  private Instant startOfToday() {
    return today().atStartOfDay(PLATFORM_ZONE).toInstant();
  }

  private record MissionRule(String id, String name, String description, int gems, int fragments) {}

  private record Item(
      String id,
      String name,
      String description,
      String type,
      String source,
      int gemCost,
      int fragmentCost,
      boolean hidden) {}
}
