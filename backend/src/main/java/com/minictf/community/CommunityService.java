package com.minictf.community;

import com.minictf.challenge.Challenge;
import com.minictf.challenge.ChallengeRepository;
import com.minictf.challenge.SolveRepository;
import com.minictf.common.RateLimitService;
import com.minictf.user.User;
import com.minictf.user.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.data.domain.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CommunityService {
  private final PostRepository posts;
  private final PostCommentRepository postComments;
  private final PostReactionRepository postReactions;
  private final ChallengeCommentRepository challengeComments;
  private final ChallengeRepository challenges;
  private final SolveRepository solves;
  private final UserRepository users;
  private final RateLimitService rateLimits;

  public CommunityService(
      PostRepository posts,
      PostCommentRepository postComments,
      PostReactionRepository postReactions,
      ChallengeCommentRepository challengeComments,
      ChallengeRepository challenges,
      SolveRepository solves,
      UserRepository users,
      RateLimitService rateLimits) {
    this.posts = posts;
    this.postComments = postComments;
    this.postReactions = postReactions;
    this.challengeComments = challengeComments;
    this.challenges = challenges;
    this.solves = solves;
    this.users = users;
    this.rateLimits = rateLimits;
  }

  @Transactional(readOnly = true)
  public CommunityDtos.PageView<CommunityDtos.PostSummary> listPosts(
      String category, int page, int size) {
    Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
    Page<Post> result =
        category == null || category.isBlank()
            ? posts.findVisibleAllByCreatedAtDesc(pageable)
            : posts.findVisibleByCategoryOrderByCreatedAtDesc(
                category.toUpperCase(Locale.ROOT), pageable);
    List<Post> posts = result.getContent();
    Map<Long, Long> commentCounts = new HashMap<>();
    Map<Long, Map<String, Long>> reactionCounts = new HashMap<>();
    if (!posts.isEmpty()) {
      List<Long> postIds = posts.stream().map(Post::getId).toList();
      postComments
          .countByPostIds(postIds)
          .forEach(count -> commentCounts.put(count.getPostId(), count.getTotal()));
      postReactions
          .countByPostIds(postIds)
          .forEach(
              count ->
                  reactionCounts
                      .computeIfAbsent(count.getPostId(), ignored -> new HashMap<>())
                      .put(count.getReactionType(), count.getTotal()));
    }
    List<CommunityDtos.PostSummary> content =
        posts.stream().map(post -> postSummary(post, commentCounts, reactionCounts)).toList();
    return new CommunityDtos.PageView<>(
        content,
        result.getNumber(),
        result.getSize(),
        result.getTotalElements(),
        result.getTotalPages());
  }

  @Transactional
  public CommunityDtos.PostDetail postDetail(Long id, String username) {
    Post post = getPost(id);
    posts.incrementViewCount(id);
    return postDetail(post, username, post.getViewCount() + 1);
  }

  @Transactional
  public CommunityDtos.PostDetail createPost(
      CommunityDtos.PostRequest request, String username, String ip) {
    User user = current(username);
    rateLimits.check("community-post", user.getId() + ":" + ip, 5, 60);
    String category = request.category().toUpperCase(Locale.ROOT);
    requireNoticeAdmin(category, user);
    Post post = new Post();
    post.setUser(user);
    apply(post, request);
    return postDetail(posts.save(post), username, 0);
  }

  @Transactional
  public CommunityDtos.PostDetail updatePost(
      Long id, CommunityDtos.PostRequest request, String username) {
    User user = current(username);
    Post post = getPost(id);
    requireOwnerOrAdmin(post.getUser(), user);
    requireNoticeAdmin(request.category().toUpperCase(Locale.ROOT), user);
    apply(post, request);
    return postDetail(post, username, post.getViewCount());
  }

  @Transactional
  public void deletePost(Long id, String username) {
    User user = current(username);
    Post post = getPost(id);
    requireOwnerOrAdmin(post.getUser(), user);
    posts.delete(post);
  }

  @Transactional(readOnly = true)
  public List<CommunityDtos.PostCommentView> listPostComments(Long postId, String username) {
    getPost(postId);
    return postComments.findVisibleByPostIdOrderByCreatedAtAsc(postId).stream()
        .sorted(
            (left, right) -> {
              int byParent = Boolean.compare(left.getParent() != null, right.getParent() != null);
              if (byParent != 0) return byParent;
              int byPinned =
                  Boolean.compare(right.getPinnedAt() != null, left.getPinnedAt() != null);
              if (byPinned != 0) return byPinned;
              return left.getCreatedAt().compareTo(right.getCreatedAt());
            })
        .map(c -> postCommentView(c, username))
        .toList();
  }

  @Transactional
  public CommunityDtos.PostCommentView createPostComment(
      Long postId, CommunityDtos.CommentRequest request, String username, String ip) {
    User user = current(username);
    Post post = getPost(postId);
    PostComment parent = null;
    if (request.parentId() != null) {
      parent = getPostComment(request.parentId());
      if (!parent.getPost().getId().equals(postId) || parent.getParent() != null)
        throw new IllegalArgumentException("Replies can only target a top-level comment");
    }
    rateLimits.check("post-comment", user.getId() + ":" + ip, 10, 60);
    PostComment comment = new PostComment();
    comment.setPost(post);
    comment.setUser(user);
    comment.setParent(parent);
    comment.setContent(clean(request.content()));
    return postCommentView(postComments.save(comment), username);
  }

  @Transactional
  public CommunityDtos.PostDetail reactToPost(
      Long postId, CommunityDtos.ReactionRequest request, String username) {
    User user = current(username);
    Post post = getPost(postId);
    String reaction = request.reaction().toUpperCase(Locale.ROOT);
    if ("RECOMMEND".equals(reaction)) {
      PostReaction recommend =
          postReactions
              .findByPostIdAndUserIdAndReactionType(postId, user.getId(), reaction)
              .orElse(null);
      if (recommend == null) {
        PostReaction next = new PostReaction();
        next.setPost(post);
        next.setUser(user);
        next.setReactionType(reaction);
        postReactions.save(next);
      } else {
        postReactions.delete(recommend);
      }
    } else {
      List<PostReaction> votes =
          postReactions.findByPostIdAndUserIdAndReactionTypeIn(
              postId, user.getId(), List.of("LIKE", "DISLIKE"));
      if (votes.stream().anyMatch(vote -> reaction.equals(vote.getReactionType()))) {
        postReactions.deleteAll(votes);
      } else {
        postReactions.deleteAll(votes);
        PostReaction next = new PostReaction();
        next.setPost(post);
        next.setUser(user);
        next.setReactionType(reaction);
        postReactions.save(next);
      }
    }
    return postDetail(post, username, post.getViewCount());
  }

  @Transactional
  public CommunityDtos.PostCommentView pinReply(Long postId, Long commentId, String username) {
    User user = current(username);
    Post post = getPost(postId);
    if (!post.getUser().getId().equals(user.getId()))
      throw new AccessDeniedException("Only the post author can pin a reply");
    PostComment reply = getPostComment(commentId);
    if (!reply.getPost().getId().equals(postId) || reply.getParent() == null)
      throw new IllegalArgumentException("Only replies can be pinned");
    postComments.clearPinnedByPostId(postId);
    reply.setPinnedAt(Instant.now());
    return postCommentView(reply, username);
  }

  @Transactional
  public CommunityDtos.PostCommentView updatePostComment(
      Long id, CommunityDtos.CommentRequest request, String username) {
    User user = current(username);
    PostComment comment = getPostComment(id);
    requireOwnerOrAdmin(comment.getUser(), user);
    comment.setContent(clean(request.content()));
    return postCommentView(comment, username);
  }

  @Transactional
  public void deletePostComment(Long id, String username) {
    User user = current(username);
    PostComment comment = getPostComment(id);
    requireOwnerOrAdmin(comment.getUser(), user);
    postComments.delete(comment);
  }

  @Transactional(readOnly = true)
  public List<CommunityDtos.ChallengeCommentView> listChallengeComments(
      Long challengeId, String type, String username) {
    Challenge challenge = getActiveChallenge(challengeId);
    String normalized = discussionType(type);
    if ("SOLVER".equals(normalized)) requireSolver(challenge, userOrNull(username));
    return challengeComments
        .findVisibleByChallengeIdAndDiscussionTypeOrderByCreatedAtAsc(challengeId, normalized)
        .stream()
        .map(c -> challengeCommentView(c, username))
        .toList();
  }

  @Transactional
  public CommunityDtos.ChallengeCommentView createChallengeComment(
      Long challengeId, CommunityDtos.ChallengeCommentRequest request, String username, String ip) {
    User user = current(username);
    Challenge challenge = getActiveChallenge(challengeId);
    String type = discussionType(request.discussionType());
    if ("SOLVER".equals(type)) requireSolver(challenge, user);
    rateLimits.check("challenge-comment", user.getId() + ":" + ip, 10, 60);
    ChallengeComment comment = new ChallengeComment();
    comment.setChallenge(challenge);
    comment.setUser(user);
    comment.setContent(clean(request.content()));
    comment.setDiscussionType(type);
    return challengeCommentView(challengeComments.save(comment), username);
  }

  @Transactional
  public CommunityDtos.ChallengeCommentView updateChallengeComment(
      Long challengeId, Long commentId, CommunityDtos.CommentRequest request, String username) {
    User user = current(username);
    ChallengeComment comment = getChallengeComment(commentId);
    if (!comment.getChallenge().getId().equals(challengeId))
      throw new EntityNotFoundException("Comment not found");
    requireOwnerOrAdmin(comment.getUser(), user);
    if ("SOLVER".equals(comment.getDiscussionType()) && !"ADMIN".equals(user.getRole()))
      requireSolver(comment.getChallenge(), user);
    comment.setContent(clean(request.content()));
    return challengeCommentView(comment, username);
  }

  @Transactional
  public void deleteChallengeComment(Long challengeId, Long commentId, String username) {
    User user = current(username);
    ChallengeComment comment = getChallengeComment(commentId);
    if (!comment.getChallenge().getId().equals(challengeId))
      throw new EntityNotFoundException("Comment not found");
    requireOwnerOrAdmin(comment.getUser(), user);
    challengeComments.delete(comment);
  }

  private void apply(Post post, CommunityDtos.PostRequest request) {
    post.setTitle(clean(request.title()));
    post.setContent(clean(request.content()));
    post.setCategory(request.category().toUpperCase(Locale.ROOT));
  }

  private String clean(String value) {
    String cleaned = value == null ? "" : value.trim();
    if (cleaned.isEmpty()) throw new IllegalArgumentException("Blank content");
    return cleaned;
  }

  private String discussionType(String value) {
    if (value == null) return "GENERAL";
    String type = value.toUpperCase(Locale.ROOT);
    if (!type.equals("GENERAL") && !type.equals("SOLVER"))
      throw new IllegalArgumentException("Invalid discussion type");
    return type;
  }

  private User current(String username) {
    if (username == null)
      throw new AuthenticationCredentialsNotFoundException("Authentication required");
    User user =
        users
            .findByUsernameIgnoreCase(username)
            .orElseThrow(
                () -> new AuthenticationCredentialsNotFoundException("Authentication required"));
    if ("DELETED".equals(user.getStatus()))
      throw new AuthenticationCredentialsNotFoundException("Authentication required");
    return user;
  }

  private User userOrNull(String username) {
    if (username == null) return null;
    return users
        .findByUsernameIgnoreCase(username)
        .filter(user -> !"DELETED".equals(user.getStatus()))
        .orElse(null);
  }

  private Post getPost(Long id) {
    Post post = posts.findById(id).orElseThrow(() -> new EntityNotFoundException("Post not found"));
    if ("DELETED".equals(post.getUser().getStatus()))
      throw new EntityNotFoundException("Post not found");
    return post;
  }

  private PostComment getPostComment(Long id) {
    return postComments
        .findById(id)
        .orElseThrow(() -> new EntityNotFoundException("Comment not found"));
  }

  private ChallengeComment getChallengeComment(Long id) {
    return challengeComments
        .findById(id)
        .orElseThrow(() -> new EntityNotFoundException("Comment not found"));
  }

  private Challenge getActiveChallenge(Long id) {
    Challenge c =
        challenges
            .findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Challenge not found"));
    if (!c.isActive()) throw new EntityNotFoundException("Challenge not found");
    return c;
  }

  private void requireSolver(Challenge challenge, User user) {
    if (user == null)
      throw new AuthenticationCredentialsNotFoundException("Authentication required");
    if (solves.findByUserAndChallenge(user.getId(), challenge.getId()).isEmpty())
      throw new AccessDeniedException("Solver only");
  }

  private void requireOwnerOrAdmin(User owner, User user) {
    if (!owner.getId().equals(user.getId()) && !"ADMIN".equals(user.getRole()))
      throw new AccessDeniedException("Forbidden");
  }

  private void requireNoticeAdmin(String category, User user) {
    if ("NOTICE".equals(category) && !"ADMIN".equals(user.getRole()))
      throw new AccessDeniedException("Admin only");
  }

  private boolean editable(User owner, String username) {
    User user = userOrNull(username);
    return user != null && (owner.getId().equals(user.getId()) || "ADMIN".equals(user.getRole()));
  }

  private CommunityDtos.PostSummary postSummary(Post p) {
    User u = p.getUser();
    return new CommunityDtos.PostSummary(
        p.getId(),
        p.getTitle(),
        p.getCategory(),
        u.getUsername(),
        u.getNickname(),
        titleFor(u),
        p.getViewCount(),
        postComments.countByVisibleUserPostId(p.getId()),
        reactionCount(p, "LIKE"),
        reactionCount(p, "DISLIKE"),
        reactionCount(p, "RECOMMEND"),
        viewerReaction(p, null),
        p.getCreatedAt(),
        p.getUpdatedAt());
  }

  private CommunityDtos.PostSummary postSummary(
      Post post, Map<Long, Long> commentCounts, Map<Long, Map<String, Long>> reactionCounts) {
    User user = post.getUser();
    Map<String, Long> reactions = reactionCounts.getOrDefault(post.getId(), Map.of());
    return new CommunityDtos.PostSummary(
        post.getId(),
        post.getTitle(),
        post.getCategory(),
        user.getUsername(),
        user.getNickname(),
        titleFor(user),
        post.getViewCount(),
        commentCounts.getOrDefault(post.getId(), 0L),
        reactions.getOrDefault("LIKE", 0L),
        reactions.getOrDefault("DISLIKE", 0L),
        reactions.getOrDefault("RECOMMEND", 0L),
        List.of(),
        post.getCreatedAt(),
        post.getUpdatedAt());
  }

  private CommunityDtos.PostDetail postDetail(Post p, String username, int views) {
    User u = p.getUser();
    CommunityDtos.PostSummary summary = postSummary(p, username);
    return new CommunityDtos.PostDetail(
        summary.id(),
        summary.title(),
        p.getContent(),
        summary.category(),
        summary.author(),
        summary.authorNickname(),
        summary.authorTitle(),
        summary.viewCount(),
        summary.commentCount(),
        summary.likeCount(),
        summary.dislikeCount(),
        summary.recommendCount(),
        summary.viewerReactions(),
        editable(u, username),
        p.getCreatedAt(),
        p.getUpdatedAt());
  }

  private CommunityDtos.PostCommentView postCommentView(PostComment c, String username) {
    User u = c.getUser();
    return new CommunityDtos.PostCommentView(
        c.getId(),
        c.getContent(),
        u.getUsername(),
        u.getNickname(),
        titleFor(u),
        editable(u, username),
        c.getParent() == null ? null : c.getParent().getId(),
        c.getPinnedAt() != null,
        c.getCreatedAt(),
        c.getUpdatedAt());
  }

  private CommunityDtos.PostSummary postSummary(Post p, String username) {
    User u = p.getUser();
    return new CommunityDtos.PostSummary(
        p.getId(),
        p.getTitle(),
        p.getCategory(),
        u.getUsername(),
        u.getNickname(),
        titleFor(u),
        p.getViewCount(),
        postComments.countByVisibleUserPostId(p.getId()),
        reactionCount(p, "LIKE"),
        reactionCount(p, "DISLIKE"),
        reactionCount(p, "RECOMMEND"),
        viewerReaction(p, username),
        p.getCreatedAt(),
        p.getUpdatedAt());
  }

  private long reactionCount(Post post, String reaction) {
    return postReactions.countByVisibleUserPostIdAndReactionType(post.getId(), reaction);
  }

  private List<String> viewerReaction(Post post, String username) {
    User user = userOrNull(username);
    return user == null
        ? List.of()
        : postReactions.findByPostIdAndUserId(post.getId(), user.getId()).stream()
            .map(PostReaction::getReactionType)
            .toList();
  }

  private CommunityDtos.ChallengeCommentView challengeCommentView(
      ChallengeComment c, String username) {
    User u = c.getUser();
    return new CommunityDtos.ChallengeCommentView(
        c.getId(),
        c.getContent(),
        c.getDiscussionType(),
        u.getUsername(),
        u.getNickname(),
        titleFor(u),
        editable(u, username),
        c.getCreatedAt(),
        c.getUpdatedAt());
  }

  private String titleFor(User user) {
    return user.getEquippedVaultTitle() != null
        ? user.getEquippedVaultTitle()
        : user.getAttendanceTitle();
  }
}
