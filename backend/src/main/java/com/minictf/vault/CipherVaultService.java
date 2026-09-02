package com.minictf.vault;

import com.minictf.anticheat.ChallengeActivityEventRepository;
import com.minictf.attendance.AttendanceCheckinRepository;
import com.minictf.challenge.SolveRepository;
import com.minictf.user.User;
import com.minictf.user.UserRepository;
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
              false,
              false),
          new Item(
              "violet_circuit_frame",
              "Violet Circuit",
              "A charged circuit frame.",
              "FRAME",
              "STORE",
              90,
              0,
              false,
              false),
          new Item(
              "signal_orbit",
              "Signal Orbit",
              "An orbiting profile accent.",
              "ACCESSORY",
              "STORE",
              60,
              0,
              false,
              false),
          new Item(
              "vault_key",
              "Vault Key",
              "A key earned with rubies.",
              "ACCESSORY",
              "STORE",
              120,
              0,
              false,
              false),
          new Item(
              "hint_credit",
              "Hint Credit",
              "Spend one credit to reveal a challenge hint.",
              "CREDIT",
              "STORE",
              30,
              0,
              false,
              true),
          new Item(
              "ember_guard_frame",
              "Ember Guard",
              "A warm, focused profile frame.",
              "FRAME",
              "STORE",
              140,
              0,
              false,
              false),
          new Item(
              "tidal_line_frame",
              "Tidal Line",
              "A clean blue line around your profile.",
              "FRAME",
              "STORE",
              155,
              0,
              false,
              false),
          new Item(
              "compass_pin",
              "Compass Pin",
              "A small mark for steady learners.",
              "ACCESSORY",
              "STORE",
              75,
              0,
              false,
              false),
          new Item(
              "redline_mark",
              "Redline Mark",
              "A precise profile accent.",
              "ACCESSORY",
              "STORE",
              110,
              0,
              false,
              false),
          new Item(
              "steady_solver",
              "Steady Solver",
              "A title for learners who keep going.",
              "TITLE",
              "STORE",
              85,
              0,
              false,
              false),
          new Item(
              "signal_keeper",
              "Signal Keeper",
              "A title for thoughtful problem solvers.",
              "TITLE",
              "STORE",
              135,
              0,
              false,
              false),
          new Item(
              "neon_cipher_frame",
              "Neon Cipher",
              "A crafted neon frame.",
              "FRAME",
              "CRAFT",
              0,
              10,
              false,
              false),
          new Item(
              "spectral_core",
              "Spectral Core",
              "A rare crafted profile core.",
              "ACCESSORY",
              "CRAFT",
              0,
              15,
              false,
              false),
          new Item(
              "first_flag",
              "Flag Seeker",
              "Solve your first challenge.",
              "TITLE",
              "QUEST",
              0,
              0,
              false,
              false),
          new Item(
              "vault_breaker",
              "Vault Breaker",
              "Craft the Neon Cipher frame.",
              "TITLE",
              "QUEST",
              0,
              0,
              false,
              false),
          new Item(
              "ghost_protocol",
              "Ghost Protocol",
              "A legacy signal marker retained for existing vaults.",
              "FRAME",
              "HIDDEN",
              0,
              0,
              true,
              false),
          new Item(
              "crimson_lock_frame",
              "Crimson Lock",
              "A frame awarded only by the hidden operation.",
              "FRAME",
              "HIDDEN",
              0,
              0,
              true,
              false),
          new Item(
              "ruby_signal",
              "Ruby Signal",
              "A secret profile mark from beyond the visible vault.",
              "ACCESSORY",
              "HIDDEN",
              0,
              0,
              true,
              false),
          new Item(
              "super_user",
              "Super User",
              "Administrator-only title with unrestricted access.",
              "TITLE",
              "ADMIN",
              0,
              0,
              true,
              false),
          new Item(
              "zero_day_title",
              "Zero-Day Operative",
              "A title for operators who found the signal.",
              "TITLE",
              "HIDDEN",
              0,
              0,
              true,
              false));
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
  private static final List<HiddenMissionRule> HIDDEN_MISSIONS =
      List.of(
          new HiddenMissionRule(
              "hidden_signal",
              "Read the Signal",
              "The logo was only the entrance. Claim this first fragment.",
              "UNLOCK"),
          new HiddenMissionRule(
              "hidden_pulse",
              "Match the Pulse",
              "Complete today's attendance check-in.",
              "CHECKIN"),
          new HiddenMissionRule(
              "hidden_breaker",
              "Break the Cipher",
              "Solve at least one challenge on the platform.",
              "SOLVE"));

  private final VaultMissionCompletionRepository completions;
  private final VaultOwnedCosmeticRepository owned;
  private final VaultHiddenMissionRepository hiddenMissions;
  private final AttendanceCheckinRepository checkins;
  private final ChallengeActivityEventRepository activities;
  private final SolveRepository solves;
  private final UserRepository users;

  public CipherVaultService(
      VaultMissionCompletionRepository completions,
      VaultOwnedCosmeticRepository owned,
      VaultHiddenMissionRepository hiddenMissions,
      AttendanceCheckinRepository checkins,
      ChallengeActivityEventRepository activities,
      SolveRepository solves,
      UserRepository users) {
    this.completions = completions;
    this.owned = owned;
    this.hiddenMissions = hiddenMissions;
    this.checkins = checkins;
    this.activities = activities;
    this.solves = solves;
    this.users = users;
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
  public VaultDtos.HiddenSummary discoverHidden(User user) {
    user.setHiddenVaultUnlocked(true);
    users.save(user);
    return hiddenSummary(user);
  }

  @Transactional(readOnly = true)
  public VaultDtos.HiddenSummary hidden(User user) {
    if (!user.isHiddenVaultUnlocked() && !admin(user))
      throw new IllegalArgumentException("Hidden operation has not been discovered");
    return hiddenSummary(user);
  }

  @Transactional
  public VaultDtos.HiddenSummary completeHiddenMission(User user, String id) {
    if (!user.isHiddenVaultUnlocked() && !admin(user))
      throw new IllegalArgumentException("Hidden operation has not been discovered");
    HiddenMissionRule rule = hiddenMission(id);
    if (hiddenMissions.existsByUserIdAndMissionId(user.getId(), id))
      throw new IllegalArgumentException("This hidden mission is already complete");
    if (!admin(user) && !hiddenEligible(user, rule.requirement()))
      throw new IllegalArgumentException("Complete the hidden mission requirement first");
    VaultHiddenMission completion = new VaultHiddenMission();
    completion.setUser(user);
    completion.setMissionId(id);
    hiddenMissions.save(completion);
    if (HIDDEN_MISSIONS.stream()
        .allMatch(
            mission -> hiddenMissions.existsByUserIdAndMissionId(user.getId(), mission.id()))) {
      user.setHiddenVaultRewarded(true);
      grant(user, "crimson_lock_frame", "HIDDEN");
      grant(user, "ruby_signal", "HIDDEN");
      grant(user, "zero_day_title", "HIDDEN");
    }
    users.save(user);
    return hiddenSummary(user);
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
    users.save(user);
    return summaryFor(user);
  }

  @Transactional
  public VaultDtos.Summary buy(User user, String id) {
    Item item = item(id);
    if (!"STORE".equals(item.source()))
      throw new IllegalArgumentException("This item is not sold in the shop");
    if (!item.consumable() && !admin(user) && owned.existsByUserIdAndCosmeticId(user.getId(), id))
      throw new IllegalArgumentException("You already own this item");
    if (!admin(user)) {
      if (user.getCipherGems() < item.gemCost())
        throw new IllegalArgumentException("Not enough Red Rubies");
      user.setCipherGems(user.getCipherGems() - item.gemCost());
    }
    if ("hint_credit".equals(id)) user.setHintCredits(user.getHintCredits() + 1);
    else grant(user, id, "STORE");
    users.save(user);
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
    }
    grant(user, id, "CRAFT");
    users.save(user);
    return summaryFor(user);
  }

  @Transactional
  public VaultDtos.Summary equip(User user, String id) {
    Item item = item(id);
    if (!available(user, item))
      throw new IllegalArgumentException("This cosmetic has not been unlocked");
    switch (item.type()) {
      case "FRAME" -> user.setEquippedFrame(id.equals(user.getEquippedFrame()) ? null : id);
      case "ACCESSORY" ->
          user.setEquippedAccessory(id.equals(user.getEquippedAccessory()) ? null : id);
      case "TITLE" ->
          user.setEquippedVaultTitle(id.equals(user.getEquippedVaultTitle()) ? null : id);
      default -> throw new IllegalArgumentException("This item cannot be equipped");
    }
    users.save(user);
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
        admin(user) ? 999999 : user.getCipherGems(),
        user.getVaultFragments(),
        admin(user) ? 999999 : user.getHintCredits(),
        dailyStoreIds(),
        missionViews,
        ITEMS.stream()
            .filter(item -> !item.hidden() || admin(user) || available(user, item))
            .map(item -> view(user, item))
            .toList());
  }

  private VaultDtos.HiddenSummary hiddenSummary(User user) {
    List<VaultDtos.HiddenMission> missions =
        HIDDEN_MISSIONS.stream()
            .map(
                rule ->
                    new VaultDtos.HiddenMission(
                        rule.id(),
                        rule.name(),
                        rule.description(),
                        admin(user) || hiddenEligible(user, rule.requirement()),
                        hiddenMissions.existsByUserIdAndMissionId(user.getId(), rule.id())))
            .toList();
    List<VaultDtos.Cosmetic> rewards =
        ITEMS.stream()
            .filter(item -> item.source().equals("HIDDEN"))
            .map(item -> view(user, item))
            .toList();
    return new VaultDtos.HiddenSummary(
        user.isHiddenVaultUnlocked() || admin(user),
        user.isHiddenVaultRewarded() || admin(user),
        missions,
        rewards);
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
        equipped,
        item.consumable());
  }

  private boolean available(User user, Item item) {
    if (admin(user)) return true;
    if ("CREDIT".equals(item.type())) return false;
    if ("STORE".equals(item.source()))
      return owned.existsByUserIdAndCosmeticId(user.getId(), item.id());
    if ("TITLE".equals(item.type())) return titleEarned(user, item.id());
    return owned.existsByUserIdAndCosmeticId(user.getId(), item.id());
  }

  private List<String> dailyStoreIds() {
    List<String> daily =
        ITEMS.stream()
            .filter(item -> "STORE".equals(item.source()) && !"CREDIT".equals(item.type()))
            .map(Item::id)
            .collect(java.util.stream.Collectors.toCollection(ArrayList::new));
    Collections.shuffle(daily, new Random(today().toEpochDay()));
    return daily.subList(0, Math.min(6, daily.size()));
  }

  private boolean titleEarned(User user, String id) {
    return switch (id) {
      case "first_flag" -> solves.countByUser(user.getId()) >= 1;
      case "vault_breaker" -> owned.existsByUserIdAndCosmeticId(user.getId(), "neon_cipher_frame");
      case "zero_day_title" -> owned.existsByUserIdAndCosmeticId(user.getId(), "zero_day_title");
      default -> false;
    };
  }

  private boolean hiddenEligible(User user, String requirement) {
    return switch (requirement) {
      case "UNLOCK" -> user.isHiddenVaultUnlocked() || admin(user);
      case "CHECKIN" ->
          admin(user) || checkins.findByUserIdAndCheckinDate(user.getId(), today()).isPresent();
      case "SOLVE" -> admin(user) || solves.countByUser(user.getId()) > 0;
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

  /**
   * Administrator-only inventory adjustment. Kept here so the catalog remains the single source of
   * truth.
   */
  @Transactional
  public void setAdminGrant(User user, String cosmeticId, boolean granted) {
    Item item = item(cosmeticId);
    if ("CREDIT".equals(item.type()) || "ADMIN".equals(item.source()))
      throw new IllegalArgumentException("This item cannot be granted to a regular account");
    if (granted) {
      grant(user, item.id(), "ADMIN_GRANT");
      return;
    }
    owned.deleteByUserIdAndCosmeticId(user.getId(), item.id());
    if (item.id().equals(user.getEquippedFrame())) user.setEquippedFrame(null);
    if (item.id().equals(user.getEquippedAccessory())) user.setEquippedAccessory(null);
    if (item.id().equals(user.getEquippedVaultTitle())) user.setEquippedVaultTitle(null);
  }

  private Item item(String id) {
    return ITEMS.stream()
        .filter(item -> item.id().equals(id))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("Unknown cosmetic"));
  }

  private HiddenMissionRule hiddenMission(String id) {
    return HIDDEN_MISSIONS.stream()
        .filter(mission -> mission.id().equals(id))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("Unknown hidden mission"));
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

  private record HiddenMissionRule(
      String id, String name, String description, String requirement) {}

  private record Item(
      String id,
      String name,
      String description,
      String type,
      String source,
      int gemCost,
      int fragmentCost,
      boolean hidden,
      boolean consumable) {}
}
