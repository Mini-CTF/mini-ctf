# FlagBox 운영 설정

## 계정 복구 이메일

아이디 찾기와 비밀번호 재설정 메일은 SMTP 설정이 있어야 실제로 발송됩니다. 아래 값은 Git에 올리지 말고 Render의 **Environment**에 추가합니다.

```text
PASSWORD_RESET_URL=https://flagbox.vercel.app/login
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM=FlagBox <onboarding@resend.dev>
```

Render Free blocks outbound SMTP ports (25, 465, and 587), so Gmail SMTP cannot
deliver production recovery email there. Use a Resend API key instead: its API is
HTTPS-based. The `onboarding@resend.dev` sender can be used for a private test;
verify a domain in Resend and replace `RESEND_FROM` before sending to all users.

Google 계정에는 일반 비밀번호가 아니라 **2단계 인증을 켠 뒤 발급한 앱 비밀번호**를 사용합니다. 발급한 앱 비밀번호는 공백 없이 `MAIL_PASSWORD`에 넣습니다.

저장한 뒤 Render에서 최신 배포를 실행하고, FlagBox 로그인 화면의 `아이디를 잊으셨나요?`에서 실제 가입 이메일로 발송을 확인합니다.

## 로컬 개발

동일한 키를 저장소 루트의 실제 `.env` 파일에 넣되, `PASSWORD_RESET_URL`만 아래처럼 변경합니다.

```text
PASSWORD_RESET_URL=http://localhost:5173/login
```

`.env`는 개인 비밀값 파일이므로 커밋하지 않습니다. `.env.example`은 키 이름만 공유하는 템플릿입니다.
