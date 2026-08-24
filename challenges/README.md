Mini-CTF는 보안을 처음 접하는 사람도 안전하고 재미있게 해킹 기초를 학습할 수 있는 게임형 보안 교육 플랫폼입니다.

# Challenge Artifact 저장소

이 디렉터리는 `ARTIFACT_STORAGE_ROOT`의 기본값입니다. 문제 제작자가 관리하는 배포 파일은 Category별 디렉터리에 둘 수 있습니다.

```text
challenges/
├─ web/
├─ crypto/
├─ forensics/
├─ misc/
└─ uploads/      관리자 API의 런타임 업로드, Git 제외
```

- DB의 `artifact_path`에는 이 디렉터리를 기준으로 한 상대 경로만 저장합니다.
- 관리자 업로드는 무작위 파일명으로 `uploads/{challengeId}/` 아래에 저장됩니다.
- API는 경로를 정규화해 저장 루트 밖 접근을 차단합니다.
- FLAG, Secret, 실행 중 생성된 파일은 이 디렉터리에 커밋하지 않습니다.
- 수동으로 배포할 Artifact만 검토 후 Git에 추가합니다.
