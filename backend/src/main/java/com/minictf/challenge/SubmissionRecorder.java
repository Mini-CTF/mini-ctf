package com.minictf.challenge;

import com.minictf.user.User;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SubmissionRecorder {
    private final SubmissionRepository submissions;
    private final EntityManager entityManager;

    public SubmissionRecorder(SubmissionRepository submissions, EntityManager entityManager) {
        this.submissions = submissions;
        this.entityManager = entityManager;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(Long userId, Long challengeId, boolean correct) {
        Submission submission = new Submission();
        submission.setUser(entityManager.getReference(User.class, userId));
        submission.setChallenge(entityManager.getReference(Challenge.class, challengeId));
        submission.setCorrect(correct);
        submissions.save(submission);
    }
}
