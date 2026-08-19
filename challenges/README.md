# Challenge artifacts

문제별 분석 파일은 `web/`, `crypto/`, `forensics/`, `misc/` 아래에 둡니다.
DB의 `artifact_path`에는 이 디렉터리를 기준으로 한 상대 경로만 저장하고, API가 경로를 정규화해 Path Traversal을 차단합니다.
