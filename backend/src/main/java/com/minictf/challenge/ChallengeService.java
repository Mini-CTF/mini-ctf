package com.minictf.challenge;

import com.minictf.user.User;
import com.minictf.user.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ChallengeService {
    private final ChallengeRepository challenges; private final UserRepository users; private final SubmissionRepository submissions; private final SolveRepository solves; private final PasswordEncoder encoder; private final Path artifactRoot;
    private final Map<String,ArrayDeque<Instant>> attempts=new ConcurrentHashMap<>();
    public ChallengeService(ChallengeRepository challenges,UserRepository users,SubmissionRepository submissions,SolveRepository solves,PasswordEncoder encoder,@Value("${app.artifact.storage-root}")String root){this.challenges=challenges;this.users=users;this.submissions=submissions;this.solves=solves;this.encoder=encoder;this.artifactRoot=Paths.get(root).toAbsolutePath().normalize();}
    @Transactional(readOnly=true) public List<ChallengeDtos.Summary> list(){return challenges.findByActiveTrueOrderByIdAsc().stream().map(c->summary(c,false)).toList();}
    @Transactional(readOnly=true) public ChallengeDtos.Detail detail(Long id){Challenge c=get(id);return new ChallengeDtos.Detail(c.getId(),c.getTitle(),c.getDescription(),c.getCategory(),c.getDifficulty(),c.getScore(),false,c.getArtifactPath()!=null);}
    @Transactional public ChallengeDtos.SubmitResult submit(Long id,String username,String flag,String ip){Challenge c=get(id);User u=users.findByUsername(username).orElseThrow();limit(username+":"+ip+":"+id);if(solves.findByUserAndChallenge(u.getId(),id).isPresent())return new ChallengeDtos.SubmitResult("already_solved",0);boolean correct=encoder.matches(flag,c.getFlagHash());Submission submission=new Submission();submission.setUser(u);submission.setChallenge(c);submission.setCorrect(correct);submissions.save(submission);if(!correct)throw new InvalidFlagException();Solve solve=new Solve();solve.setUser(u);solve.setChallenge(c);solves.save(solve);u.setScore(u.getScore()+c.getScore());users.save(u);return new ChallengeDtos.SubmitResult("correct",c.getScore());}
    @Transactional public Challenge create(ChallengeDtos.AdminRequest r){Challenge c=new Challenge();apply(c,r);return challenges.save(c);}
    @Transactional public Challenge update(Long id,ChallengeDtos.AdminRequest r){Challenge c=get(id);apply(c,r);return challenges.save(c);}
    @Transactional public void delete(Long id){challenges.delete(get(id));}
    public Path artifact(Long id){Challenge c=get(id);if(!c.isActive()||c.getArtifactPath()==null)throw new EntityNotFoundException("Artifact not found");Path file=artifactRoot.resolve(c.getArtifactPath()).normalize();if(!file.startsWith(artifactRoot)||!Files.isRegularFile(file))throw new EntityNotFoundException("Artifact not found");return file;}
    private void apply(Challenge c,ChallengeDtos.AdminRequest r){c.setTitle(r.title());c.setDescription(r.description());c.setCategory(r.category().toUpperCase());c.setDifficulty(r.difficulty().toUpperCase());c.setScore(r.score());c.setFlagHash(encoder.encode(r.flag()));c.setArtifactPath(r.artifactPath());c.setActive(r.active());}
    private Challenge get(Long id){return challenges.findById(id).orElseThrow(()->new EntityNotFoundException("Challenge not found"));}
    private ChallengeDtos.Summary summary(Challenge c,boolean solved){return new ChallengeDtos.Summary(c.getId(),c.getTitle(),c.getCategory(),c.getDifficulty(),c.getScore(),solved,c.getArtifactPath()!=null);}
    private void limit(String key){Instant now=Instant.now();ArrayDeque<Instant> q=attempts.computeIfAbsent(key,k->new ArrayDeque<>());synchronized(q){while(!q.isEmpty()&&q.peekFirst().isBefore(now.minusSeconds(60)))q.removeFirst();if(q.size()>=20)throw new RateLimitedException();q.addLast(now);}}
    public static class InvalidFlagException extends RuntimeException{}
    public static class RateLimitedException extends RuntimeException{}
}
