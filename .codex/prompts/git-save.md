# Git Save

이 프로젝트의 Git 저장 및 GitHub 업로드 작업을 수행한다.

작업 디렉터리는 `D:\mini-ctf`이다.

규칙:

1. 먼저 `git status --short`, `git branch --show-current`, `git remote -v`를 확인한다.
2. 변경된 파일 목록과 변경 내용을 짧게 요약한다.
3. `.env`, 비밀번호, API 키, JWT Secret, OAuth Secret, 인증 토큰은 절대 stage하지 않는다.
4. 사용자가 별도 커밋 메시지를 주지 않았다면 변경 내용을 바탕으로 짧은 영어 커밋 메시지를 만든다.
5. 안전한 변경 파일만 `git add`하고 `git diff --cached --stat`으로 stage 결과를 확인한다.
6. `git commit`을 실행한다.
7. 커밋 후 `git log --oneline -1`과 `git status --short`로 확인한다.
8. 사용자가 “GitHub에 올려”, “push해”, “저장하고 업로드해”라고 명시한 경우에만 `git push -u origin main` 또는 현재 브랜치의 upstream push를 실행한다. 단순히 “저장해”라고 한 경우에는 로컬 commit까지만 한다.
9. 명령 실패 시 오류 원인과 사용자가 실행할 다음 명령을 한국어로 설명한다.
10. `git reset --hard`, `git clean`, 강제 push(`--force`)는 사용자가 정확히 요청하지 않는 한 실행하지 않는다.

답변은 다음 형식으로 간단히 보고한다:

- 변경 파일 수
- 커밋 메시지와 커밋 ID
- push 여부
- 현재 `git status` 결과
