package com.minictf.config;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.function.UnaryOperator;

/**
 * FlagBox 워게임 60문제 카탈로그.
 *
 * <p>플래그는 저장소에 커밋하지 않고 실행 시점에 무작위로 생성한다(규칙: AGENTS.md). 각 문제의 지문과 첨부 파일은 플래그에서 파생되므로, 풀이자는 지시된 변환을
 * 되돌려 실행 시점의 실제 플래그를 얻는다.
 */
final class FlagboxChallengeCatalog {

  private FlagboxChallengeCatalog() {}

  /** 단일 문제 정의. description/artifact는 실행 시점 플래그를 받아 내용을 만든다. */
  record Seed(
      String key,
      String title,
      String category,
      String difficulty,
      int score,
      UnaryOperator<String> description,
      ArtifactWriter artifact) {}

  /** 첨부 파일 생성기. null이 아닌 값을 반환하면 파일로 저장된다. */
  @FunctionalInterface
  interface ArtifactWriter {
    byte[] write(String flag);

    static ArtifactWriter none() {
      return null;
    }
  }

  private static final String STANDARD_ALPHABET =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

  static final List<Seed> SEEDS =
      List.of(
          // ───────────────────────────── WEB · EASY (10)

          new Seed(
              "w01",
              "첫 발견의 기쁨",
              "WEB",
              "BEGINNER",
              50,
              flag ->
                  """
              동료가 만든 홈페이지 소스를 열어보다 이상한 주석을 발견했어요.

              ```html
              <h1>우리 팀 소개</h1>
              <!-- TODO: 아래 줄은 배포 전에 지우기 -->
              <!-- FLAG: %s -->
              ```

              개발자가 지우는 걸 깜빡한 값이 바로 플래그예요. 그대로 제출해 보세요!
              """
                      .formatted(flag),
              null),
          new Seed(
              "w02",
              "보이지 않는 입력칸",
              "WEB",
              "BEGINNER",
              50,
              flag ->
                  """
              회원가입 폼을 살펴보던 중 화면에는 보이지 않는 입력칸을 찾았어요.

              ```html
              <form action="/join" method="post">
                <input name="id" placeholder="아이디">
                <input name="pw" type="password">
                <input type="hidden" name="invite" value="%s">
              </form>
              ```

              `type="hidden"`은 화면에서 숨겨졌을 뿐, 소스에는 값이 고스란히 남아요.
              """
                      .formatted(flag),
              null),
          new Seed(
              "w03",
              "로봇에게만 알려준 길",
              "WEB",
              "BEGINNER",
              50,
              flag ->
                  """
              웹사이트는 검색 로봇에게 보여줄 위치를 /robots.txt에 적어두곤 해요.

              ```
              # http://example.com/robots.txt
              User-agent: *
              Disallow: /private/notes.txt
              ```

              숨긴다고 적어 둔 주소를 직접 열면 이런 내용이 있었어요.

              ```
              개인 메모: 운영자 확인 코드는 %s
              ```

              "숨긴다"고 적는 건 존재를 알려주는 것과 같다는 점이 포인트예요.
              """
                      .formatted(flag),
              null),
          new Seed(
              "w04",
              "쿠키 속 암호",
              "WEB",
              "EASY",
              150,
              flag ->
                  """
              개발자 도구(F12)의 Application 탭에서 이런 쿠키를 발견했어요.

              ```
              guest_note = %s
              ```

              값 끝에 `=`가 붙는 걸 보니 Base64로 보여요. 디코더에 넣어보세요!
              """
                      .formatted(b64(flag)),
              null),
          new Seed(
              "w05",
              "페이지의 명함",
              "WEB",
              "BEGINNER",
              50,
              flag ->
                  """
              사이트 head를 살펴보던 중 낯선 meta 태그를 찾았어요.

              ```html
              <head>
                <title>FlagBox 소개</title>
                <meta name="description" content="입문자를 위한 보안 워게임">
                <meta name="builder-note" content="%s">
              </head>
              ```

              화면엔 안 보여도 head 안에는 이런 정보들이 숨어 있을 수 있어요.
              """
                      .formatted(flag),
              null),
          new Seed(
              "w06",
              "스크립트 속 변수",
              "WEB",
              "BEGINNER",
              50,
              flag ->
                  """
              페이지를 불러오는 스크립트 파일에서 흥미로운 줄을 발견했어요.

              ```js
              const ADMIN_NOTE = "%s";
              console.log("환영합니다!");
              ```

              변수 이름이 값을 말해주고 있네요. 이 값이 플래그예요.
              """
                      .formatted(flag),
              null),
          new Seed(
              "w07",
              "주소창의 암호",
              "WEB",
              "EASY",
              150,
              flag -> {
                String encoded = b64(flag);
                return """
                공유 버튼을 눌렀더니 이상한 주소가 복사됐어요.

                ```
                https://example.com/welcome?data=%s
                ```

                `?data=` 뒤는 서버가 붙여준 Base64 메시지예요. 디코딩해 보세요!
                """
                    .formatted(encoded);
              },
              null),
          new Seed(
              "w08",
              "응답 헤더의 쪽지",
              "WEB",
              "EASY",
              150,
              flag ->
                  """
              개발자 도구 Network 탭에서 응답 헤더를 들여다봤어요.

              ```
              HTTP/1.1 200 OK
              Content-Type: text/html
              X-Server-Build: 2026.08
              X-Memory-Lane: %s
              ```

              `X-`로 시작하는 헤더는 개발자가 몰래 넣은 쪽지일 때가 많아요.
              """
                      .formatted(flag),
              null),
          new Seed(
              "w09",
              "16진수로 쓰인 편지",
              "WEB",
              "EASY",
              150,
              flag -> {
                String encoded = hex(flag);
                return """
                오래된 게시판에 16진수로 쓰인 댓글이 있었어요.

                ```
                %s...
                ```

                두 글자가 글자 하나를 말해요. 16진수 → 텍스트 변환기에 넣어보세요!
                """
                    .formatted(shorten(encoded));
              },
              null),
          new Seed(
              "w10",
              "엔터티의 옷을 벗기면",
              "WEB",
              "EASY",
              150,
              flag ->
                  """
              웹페이지 소스에 이렇게 생긴 문자열이 숨어 있었어요.

              ```
              %s
              ```

              `&#숫자;`는 글자 하나를 숫자로 표현한 HTML 엔터티예요. 브라우저 콘솔에서
              아래 한 줄로 풀 수 있어요.

              ```js
              // 위 문자열을 s에 넣고 실행
              [...s.matchAll(/&#(\\d+);/g)].map(m => String.fromCharCode(m[1])).join("")
              ```
              """
                      .formatted(htmlEntities(flag)),
              null),

          // ───────────────────────────── WEB · MEDIUM (6)

          new Seed(
              "w11",
              "지워지지 않은 발자국",
              "WEB",
              "EASY",
              150,
              flag ->
                  """
              웹 서버 접속 기록(access.log)이 첨부돼 있어요. 대부분 평범하지만, 누군가
              BASE64처럼 생긴 이름의 파일을 올리고 다시 받아 갔어요. 그 파일명을 디코딩해 보세요.
              """,
              flag -> logArtifact(flag)),
          new Seed(
              "w12",
              "난독화 입문",
              "WEB",
              "NORMAL",
              300,
              flag ->
                  """
              사이트에서 이상하게 생긴 스크립트 파일 하나가 다운로드됐어요. 겉보기엔 알 수 없지만
              안쪽에는 eval과 atob이라는 친숙한 함수가 있어요. Base64를 풀고 나온 코드를
              콘솔에서 그대로 실행해 보세요!
              """,
              flag -> jsObfuscated(flag)),
          new Seed(
              "w13",
              "열어본 JWT",
              "WEB",
              "NORMAL",
              300,
              flag -> {
                String payload =
                    "{\"sub\":\"guest\",\"role\":\"viewer\",\"memo\":\"" + flag + "\"}";
                String token =
                    b64Url("{\"alg\":\"HS256\",\"typ\":\"JWT\"}")
                        + "."
                        + b64Url(payload)
                        + ".SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJVadQssw5c";
                return """
                어떤 서비스가 로그인 후 이 토큰을 줬어요. JWT는 점(.)으로 세 칸으로 나뉘고,
                앞 두 칸은 그냥 Base64예요. 서명은 못 바꿔도 내용은 누구나 읽을 수 있죠.

                ```
                %s
                ```

                가운데 칸을 디코딩해 보세요. (`-`와 `_`가 섞여 있다면 Base64URL 형제입니다.)
                """
                    .formatted(token);
              },
              null),
          new Seed(
              "w14",
              "두 겹의 포장",
              "WEB",
              "NORMAL",
              300,
              flag -> {
                String outer = hex(b64(flag));
                return """
                배달원이 포장을 두 겹이나 했어요. 겉 포장은 16진수, 그 안은 Base64라고 쪽지가 있어요.

                ```
                %s...
                ```

                16진수 → 텍스트로 한 번, 그 결과를 Base64로 한 번 더 풀면 돼요.
                """
                    .formatted(shorten(outer));
              },
              null),
          new Seed(
              "w15",
              "꺼져 있는 문은 잠긴 걸까",
              "WEB",
              "NORMAL",
              300,
              flag ->
                  """
              쿠폰 입력 폼이 비활성화(disabled)돼 있었어요.

              ```html
              <form action="/checkout" method="post">
                <input name="item" value="pen">
                <input name="coupon" value="SUMMER2026" disabled>
              </form>
              ```

              개발 중이던 응답 예시가 남아 있었어요.

              ```
              POST /checkout   item=pen&coupon=SPRINGHIDE
              200 OK  { "message": "쿠폰 적용!", "receipt": "%s" }
              ```

              화면에서 막는 건 진짜 차단이 아니라는 걸 배우는 문제예요. receipt 값이 플래그예요.
              """
                      .formatted(flag),
              null),
          new Seed(
              "w16",
              "리다이렉트 미로",
              "WEB",
              "ADVANCED",
              600,
              flag -> {
                String part1 = flag.substring(0, flag.length() / 3);
                String part2 = flag.substring(flag.length() / 3, flag.length() * 2 / 3);
                String part3 = flag.substring(flag.length() * 2 / 3);
                return """
                한 서비스가 로그인 후 여러 번 되돌려 보냈어요. 거치는 곳마다 쿠키 조각을 하나씩 줬어요.

                ```
                302 /enter   Set-Cookie: piece1=%s
                302 /verify  Set-Cookie: piece2=%s
                302 /done    Set-Cookie: piece3=%s
                200 최종 페이지: "조각을 이름 순서대로 이으면 무언가가 보여요."
                ```
                """
                    .formatted(part1, part2, part3);
              },
              null),

          // ───────────────────────────── WEB · HARD (4)

          new Seed(
              "w17",
              "블랙박스 검증기",
              "WEB",
              "EXPERT",
              1000,
              flag -> {
                int[] target = shiftedCodes(flag, 3);
                return """
                어떤 사이트의 초대 코드 검증기가 이렇게 생겼어요.

                ```js
                function check(code) {
                  const out = [...code].map(c => c.charCodeAt(0) + 3);
                  return out.join(",") === TARGET;
                }
                const TARGET = "%s";
                ```

                TARGET을 만족하는 원래 코드가 초대 코드, 즉 플래그예요. 각 숫자에서 3을 빼고
                문자로 되돌리면 됩니다.
                """
                    .formatted(joinInts(target));
              },
              null),
          new Seed(
              "w18",
              "세 겹의 포장",
              "WEB",
              "ADVANCED",
              600,
              flag -> {
                String wrapped = reverse(rot13(b64(flag)));
                return """
                보내는 사람은 이 순서로 포장했어요.

                1. 평문을 Base64로
                2. 그 결과를 ROT13으로
                3. 마지막으로 문자열을 통째로 뒤집기

                도착한 물건:

                ```
                %s
                ```

                뒤집기 → ROT13 → Base64 디코드 순서로 되감아 보세요.
                """
                    .formatted(wrapped);
              },
              null),
          new Seed(
              "w19",
              "흩어진 조각",
              "WEB",
              "ADVANCED",
              600,
              flag -> {
                String[] pieces = slice(flag, 3);
                return """
                공격자가 플래그를 세 군데에 흘리고 갔어요. 조각마다 번호가 적혀 있으니 순서대로 이어 보세요.

                - 쿠키에서: `%s`
                - 로그 한 줄에서: `%s`
                - 페이지 주석에서: `%s`
                """
                    .formatted(pieces[0], pieces[1], pieces[2]);
              },
              null),
          new Seed(
              "w20",
              "관리자의 실수",
              "WEB",
              "EXPERT",
              1000,
              flag ->
                  """
              백업 설정 파일이 그대로 노출됐어요. 가짜가 여러 개 섞여 있지만 진짜만 골라내세요.

              ```
              # deploy-backup.env
              DEBUG_FLAG=CTF{this_is_a_decoy_01}
              LEGACY_TOKEN=CTF{old_token_retired_99}
              APP_ENV=production

              # 2026-08-01 운영 배포 최종본 (real)
              APP_REAL_FLAG=%s

              SAMPLE_FLAG=CTF{example_only_do_not_submit}
              TEMPLATE_FLAG=CTF{replace_me_before_release}
              ```

              변수 이름과 주석이 힌트예요. 가짜를 제출하면 오답 처리돼요!
              """
                      .formatted(flag),
              null),

          // ───────────────────────────── FORENSIC · EASY (10)

          new Seed(
              "f01",
              "정체불명의 파일",
              "FORENSIC",
              "EASY",
              150,
              flag ->
                  """
              다운로드 폴더에서 확장자 없는 파일을 발견했어요. 파일 시그니처(매직 넘버) 규칙상
              `89 50 4E 47`로 시작하면 PNG 이미지예요.

              ```
              00000000  89 50 4e 47 0d 0a 1a 0a ...  |.PNG....        |
              ```

              PNG는 `IEND`로 끝나는데, 첨부 파일의 그 뒤에 누가 문자를 몰래 붙였네요.
              메모장으로 열어 끝부분을 확인해 보세요!
              """,
              flag -> pngWithTail(flag)),
          new Seed(
              "f02",
              "반복된 실패",
              "FORENSIC",
              "EASY",
              150,
              flag ->
                  """
              로그인 기록이에요. 계정 하나가 유난히 여러 번 실패하고 있네요.

              ```
              03:11:02 LOGIN FAIL user=guest1 ip=198.51.100.9
              03:11:09 LOGIN FAIL user=guest1 ip=198.51.100.9
              03:11:15 LOGIN FAIL user=guest1 ip=198.51.100.9
              03:12:40 LOGIN FAIL user=guest1 ip=198.51.100.9
              03:13:01 LOGIN OK   user=guest1 ip=198.51.100.9 memo=%s
              ```

              성공한 줄의 memo가 플래그예요. 실패가 몰려 있는 계정을 찾았다면 이미 답 옆에 서 있는 거예요.
              """
                      .formatted(flag),
              null),
          new Seed(
              "f03",
              "사진이 말해주는 것",
              "FORENSIC",
              "BEGINNER",
              50,
              flag ->
                  """
              사진 파일에는 촬영 정보(EXIF)가 함께 저장돼요. 발췌한 메타데이터를 볼까요?

              ```
              Make         : ExampleCorp
              Model        : Cam-X100
              DateTime     : 2026:08:15 18:42:03
              UserComment  : gate 7 점검 완료, 인증 코드 %s
              ```

              카메라가 적은 게 아니라 누가 나중에 적어 넣은 것 같네요.
              """
                      .formatted(flag),
              null),
          new Seed(
              "f04",
              "휴지통의 흔적",
              "FORENSIC",
              "EASY",
              150,
              flag ->
                  """
              윈도우 휴지통에는 삭제 기록이 남아요. 조사 도구 출력을 발췌했어요.

              ```
              $I8KQ2T1.index   원본: C:\\Users\\guest\\Documents\\plan.txt  삭제: 2026-08-20 21:14
              $R8KQ2T1.content 일부 복구됨:
                "...프로젝트는 취소. 최종 인증 문구만 남긴다 -> %s ..."
              ```

              삭제해도 내용 일부는 복구될 수 있다는 걸 보여주는 문제예요.
              """
                      .formatted(flag),
              null),
          new Seed(
              "f05",
              "목록에 없는 파일",
              "FORENSIC",
              "EASY",
              150,
              flag ->
                  """
              백업 압축파일의 목록(tar -tvf)이에요. 분위기가 다른 녀석이 하나 섞여 있어요.

              ```
              -rw-r--r-- guest/guest   1024 2026-08-10 09:00 docs/report.docx
              -rw-r--r-- guest/guest    512 2026-08-10 09:00 img/logo.png
              -rw-r--r-- guest/guest     96 2026-08-10 09:01 ..n0te..txt
              ```

              목록 아래에 이런 설명이 붙어 있었어요. "숨은 파일 내용: %s"
              """
                      .formatted(flag),
              null),
          new Seed(
              "f06",
              "USB 연결 기록",
              "FORENSIC",
              "BEGINNER",
              50,
              flag ->
                  """
              USB가 꽂힌 기록은 윈도우 설정 로그에 남아요. 발췌 내용이에요.

              ```
              [2026-08-12 10:22:31] Device Install (USBSTOR)
              Disk&Prod_ExampleFlash&Rev_1.00
              Serial: 0c1d2e3f
              FriendlyName: Example Flash
              OperatorNote: %s
              ```

              장치 기록에 누가 메모 필드에 뭔가를 적어뒀네요.
              """
                      .formatted(flag),
              null),
          new Seed(
              "f07",
              "덤프의 오른쪽 열",
              "FORENSIC",
              "EASY",
              150,
              flag -> {
                String dump = hexDump(flag);
                return """
                hexdump는 왼쪽에 16진수, 오른쪽에 읽을 수 있는 문자를 보여줘요.

                ```
                %s
                ```

                오른쪽 열만 쭉 읽어보세요. 이미 답이 적혀 있어요.
                """
                    .formatted(dump.strip());
              },
              null),
          new Seed(
              "f08",
              "편지의 겉봉",
              "FORENSIC",
              "BEGINNER",
              50,
              flag ->
                  """
              이메일 헤더를 발췌했어요. 본문보다 헤더에 흥미로운 게 숨어 있기도 해요.

              ```
              From: friend@example.com
              To: me@example.com
              Subject: 지난 주 약속
              X-Mailer: MailApp 3.2
              X-Sender-Note: %s
              ```

              표준이 아닌 X- 헤더는 프로그램이 자유롭게 쓰는 공간이에요.
              """
                      .formatted(flag),
              null),
          new Seed(
              "f09",
              "방문 기록의 이상한 항목",
              "FORENSIC",
              "BEGINNER",
              50,
              flag ->
                  """
              브라우저 방문 기록이에요. 한 줄이 분위기가 달라요.

              ```
              2026-08-18 09:02  https://search.example.com/q=weather   제목: 날씨
              2026-08-18 09:05  https://mail.example.com/inbox         제목: 받은편지함
              2026-08-18 09:07  http://192.0.2.77:8081/n0te            제목: %s
              2026-08-18 09:11  https://news.example.com/              제목: 뉴스
              ```

              사설 IP로 직접 열었다는 기록의 제목이 곧 플래그예요.
              """
                      .formatted(flag),
              null),
          new Seed(
              "f10",
              "압축파일의 여백",
              "FORENSIC",
              "BEGINNER",
              50,
              flag ->
                  """
              ZIP 파일은 끝에 짧은 코멘트를 달 수 있어요. zipinfo 출력을 발췌했어요.

              ```
              Archive:  old-backup.zip
              Comment: %s
              Length  Name
              -----   ----
               2048   docs/readme.txt
              ```

              파일 내용이 아니라 '압축파일 자체'의 코멘트에 숨어 있었네요.
              """
                      .formatted(flag),
              null),

          // ───────────────────────────── FORENSIC · MEDIUM (6)

          new Seed(
              "f11",
              "와이어 위의 신호",
              "FORENSIC",
              "NORMAL",
              300,
              flag ->
                  """
              패킷 캡처를 텍스트로 정리한 파일이 첨부돼 있어요. HTTP GET 한 줄이 유독 길어요.
              주소 뒤 `p=` 매개변수는 Base64예요. 누가 비밀번호를 평문으로나마 실어 보낸 모양이네요.
              """,
              flag -> pcapTextArtifact(b64(flag))),
          new Seed(
              "f12",
              "새벽의 방문자",
              "FORENSIC",
              "EASY",
              150,
              flag -> {
                String encoded = b64(flag);
                return """
                로그인 기록 CSV예요. 대부분 출근 시간대인데, 한 계정만 매일 새벽에 접속해요.

                ```csv
                time,user,ip,memo
                2026-08-11 09:02,hr01,10.0.0.11,
                2026-08-11 09:05,dev02,10.0.0.12,
                2026-08-12 03:41,srv-batch,10.0.0.90,%s
                2026-08-12 09:01,hr01,10.0.0.11,
                2026-08-13 03:39,srv-batch,10.0.0.90,%s
                ```

                새벽 접속 계정의 memo 값(같은 값이 반복돼요)을 Base64 디코딩하면 끝!
                """
                    .formatted(encoded, encoded);
              },
              null),
          new Seed(
              "f13",
              "자동 시작의 그림자",
              "FORENSIC",
              "NORMAL",
              300,
              flag -> {
                String encoded = b64Url("echo " + flag);
                return """
                윈도우 시작 프로그램 등록(Run 키) 발췌예요. 한 줄이 Base64 명령을 숨기고 있어요.

                ```
                HKCU\\...\\Run
                  OneDriveSync   = "C:\\Program Files\\OneDrive\\OneDrive.exe"
                  SysHelper      = powershell -enc %s
                ```

                `-enc` 뒤는 PowerShell이 읽는 Base64 명령이에요. 디코딩하면 이 줄이 하는 일과
                함께 플래그가 나와요.
                """
                    .formatted(encoded);
              },
              null),
          new Seed(
              "f14",
              "사진 뒤에 붙은 것",
              "FORENSIC",
              "NORMAL",
              300,
              flag ->
                  """
              사진 파일 뒤에는 아무 데이터나 붙일 수 있어요. 첨부 bin 파일에서 `PK` 시그니처를
              찾아보세요. 그 지점부터는 ZIP이에요. 확장자를 zip으로 바꾸고 열면 note.txt가 있어요.
              """,
              FlagboxChallengeCatalog::jpegWithZipAppendix),
          new Seed(
              "f15",
              "메모리 속 문자열",
              "FORENSIC",
              "NORMAL",
              300,
              flag ->
                  """
              메모리 덤프에서 뽑아낸 문자열 목록이 첨부돼 있어요. `CTF{`로 검색하면 여러 개가
              나오지만, 'session note' 문맥 옆에 있는 진짜만 정답이에요. 나머지는 샘플/템플릿이에요!
              """,
              flag -> memDumpArtifact(flag)),
          new Seed(
              "f16",
              "시간을 거슬러 간 문서",
              "FORENSIC",
              "ADVANCED",
              600,
              flag ->
                  """
              문서 관리 시스템의 버전 기록이 이상해요. 수정일이 생성일보다 빠르다니?

              ```
              report-v1.docx  created 2026-08-01 09:00  modified 2026-08-01 09:00
              report-v2.docx  created 2026-08-05 11:20  modified 2026-07-30 18:03  ← ?
              ```

              v2 내용 발췌:

              ```
              ... 2학기 계획은 다음과 같다.
              (v2에서 이 문단은 통째로 지워졌다: 최종 승인 코드 %s ...)
              ```

              시간 조작으로 지워진 흔적을 따라가면 플래그가 나와요.
              """
                      .formatted(flag),
              null),

          // ───────────────────────────── FORENSIC · HARD (4)

          new Seed(
              "f17",
              "두 로그의 교차",
              "FORENSIC",
              "ADVANCED",
              600,
              flag -> {
                String[] parts = slice(flag, 3);
                return """
                웹 접속 로그와 인증 로그를 나란히 놓고 시간순으로 읽어보세요.

                ```
                web : 01:02:11 GET /kb/%s
                auth: 01:02:29 LOGIN FAIL user=admin ip=198.51.100.66
                web : 01:02:44 GET /kb/%s
                web : 01:03:02 POST /login (admin) ip=198.51.100.66
                auth: 01:03:05 LOGIN OK   user=admin ip=198.51.100.66
                web : 01:03:20 GET /export/%s
                ```

                공격자가 순서대로 들른 경로 조각들을 URL 디코딩해서 이으면 플래그가 돼요.
                """
                    .formatted(parts[0], parts[1], parts[2]);
              },
              null),
          new Seed(
              "f18",
              "찢어진 편지",
              "FORENSIC",
              "EXPERT",
              1000,
              flag -> {
                String whole = b64(flag);
                int cut = whole.length() / 3;
                String a = whole.substring(0, cut);
                String b = whole.substring(cut, cut * 2);
                String c = whole.substring(cut * 2);
                return """
                Base64 문장이 세 조각으로 찢겨 왔어요. 순서표는 없어요!

                ```
                조각-가 (%d글자): %s
                조각-나 (%d글자): %s
                조각-다 (%d글자): %s
                ```

                전체 길이는 %d글자. 세 조각을 알맞게 이어 붙이면 단 한 가지 순서만
                올바른 Base64가 돼요. 그것만 디코딩하세요.
                """
                    .formatted(a.length(), a, b.length(), b, c.length(), c, whole.length());
              },
              null),
          new Seed(
              "f19",
              "보이지 않는 백색소음",
              "FORENSIC",
              "EXPERT",
              1000,
              flag ->
                  """
              메모장 파일이 첨부돼 있어요. 겉보기엔 평범한 짧은 문장들이지만,
              **각 줄 끝에 붙은 공백의 개수**가 의미가 있어요.

              규칙: 첫째 줄 끝 공백 개수 = 플래그 첫 글자의 아스키 코드,
              둘째 줄 = 둘째 글자 … 이런 식이에요. 개수를 세서 문자로 바꿔보세요!
              """,
              FlagboxChallengeCatalog::spaceStego),
          new Seed(
              "f20",
              "덮어쓴 일기장",
              "FORENSIC",
              "ADVANCED",
              600,
              flag ->
                  """
              USB가 포맷됐지만 복구 도구가 옛 조각을 찾아냈어요. 같은 자리에 새 파일이 덮어썼는데,
              이전 파일의 끝부분이 그대로 남아 있었어요.

              ```
              === 현재 파일 (diary.txt, 2026-08-24) ===
              오늘은 하루 종일 비가 왔다. 별일 없었다.

              === 복구된 잔여 조각 (이전 diary.txt, 2026-08-10) ===
              ...(앞부분 유실)...
              ...비밀 약속 기록은 여기까지. 인증 문구: %s
              ```

              덮어쓴 파일이 짧으면 옛 내용의 꼬리가 남는다는 걸 배우는 문제예요.
              """
                      .formatted(flag),
              null),

          // ───────────────────────────── REVERSING · EASY (10)

          new Seed(
              "r01",
              "거꾸로 세계",
              "REVERSING",
              "BEGINNER",
              50,
              flag -> {
                String stored = reverse(flag);
                return """
                어떤 프로그램이 문자열을 뒤집어 저장하고 있었어요.

                ```python
                stored = "%s"
                print(stored[::-1])
                ```

                파이썬의 `[::1]`은 뒤집기예요. 뒤집으면 플래그!
                """
                    .formatted(stored);
              },
              null),
          new Seed(
              "r02",
              "열세 뒤집기",
              "REVERSING",
              "BEGINNER",
              50,
              flag ->
                  """
                인터넷 초창기부터 쓰인 ROT13 암호예요. 알파벳을 13글자씩 밀면 됩니다.

                ```
                %s
                ```

                ROT13은 다시 적용하면 원래대로 돌아와요. 온라인 변환기에 넣어보세요.
                """
                      .formatted(rot13(flag)),
              null),
          new Seed(
              "r03",
              "작은 검문소",
              "REVERSING",
              "EASY",
              150,
              flag ->
                  """
              첨부된 check.py는 입력을 받아 검사만 해요. 코드를 읽어볼까요?
              비교 대상이 코드에 그대로 적혀 있다면, 그게 정답이에요.
              읽는 것부터가 리버싱의 첫걸음이에요!
              """,
              flag -> pyCheckScript(flag)),
          new Seed(
              "r04",
              "열쇠 하나짜리 잠금",
              "REVERSING",
              "EASY",
              150,
              flag -> {
                String locked = xorHex(flag, "K");
                return """
                모든 글자에 같은 열쇠 글자 'K'(0x4B)로 XOR을 했어요.

                ```
                lock = "%s"
                ```

                XOR은 같은 연산을 두 번 하면 원래대로 돌아와요. 16진수를 바이트로 만들고
                각 바이트에 0x4B를 다시 XOR해 보세요.
                """
                    .formatted(locked);
              },
              null),
          new Seed(
              "r05",
              "숫자의 나열",
              "REVERSING",
              "BEGINNER",
              50,
              flag -> {
                String codes = joinInts(charCodes(flag));
                return """
                프로그램 로그에 숫자들이 줄지어 있어요.

                ```
                bytes_out = [%s]
                ```

                하나하나가 아스키 코드예요. 67=C, 84=T, 70=F… 순서대로 문자로 바꿔 보세요.
                """
                    .formatted(codes);
              },
              null),
          new Seed(
              "r06",
              "두 번 포장된 상자",
              "REVERSING",
              "BEGINNER",
              50,
              flag -> {
                String boxed = b64(b64(flag));
                return """
                포장을 두 번 했어요. 벗기는 것도 두 번!

                ```
                box = "%s"
                ```

                Base64 디코더에서 두 번 돌리면 끝이에요.
                """
                    .formatted(boxed);
              },
              null),
          new Seed(
              "r07",
              "시저의 서신",
              "REVERSING",
              "BEGINNER",
              50,
              flag -> {
                String shifted = caesar(flag, 3);
                return """
                로마의 시저가 썼다는 방식이에요. 글자를 3칸씩 밀었어요.

                ```
                %s
                ```

                3칸을 되돌리면 원문이 돼요. `{`, `}`, 숫자도 같이 밀렸다는 점에 주의!
                (보이는 문자 범위 32~126 안에서 순환해요.)
                """
                    .formatted(shifted);
              },
              null),
          new Seed(
              "r08",
              "조건문 수업",
              "REVERSING",
              "EASY",
              150,
              flag -> {
                String printed = reverse(flag);
                return """
                이 프로그램은 규칙을 통과한 입력을 뒤집어 출력해요.

                ```python
                word = input()
                if len(word) >= 8 and word.startswith("C"):
                    print(word[::-1])
                ```

                실행 결과가 이렇게 나왔다면, 원래 입력은 무엇이었을까요?

                ```
                %s
                ```
                """
                    .formatted(printed);
              },
              null),
          new Seed(
              "r09",
              "앞뒤가 바뀐 니블",
              "REVERSING",
              "EASY",
              150,
              flag -> {
                String encoded = swapNibbles(flag);
                return """
                16진수에서 각 바이트의 앞 4비트와 뒤 4비트를 서로 맞바꿨어요. (예: 43 → 34)

                ```
                %s
                ```

                같은 뒤집기를 한 번 더 하면 원래대로! 16진수 에디터나 짧은 스크립트로 해볼 수 있어요.
                """
                    .formatted(encoded);
              },
              null),
          new Seed(
              "r10",
              "한 줄 마법",
              "REVERSING",
              "EASY",
              150,
              flag -> {
                String encoded = shiftPrintable(flag, 1);
                return """
                파이썬 한 줄이 모든 글자를 조금 밀어냈어요.

                ```python
                print("".join(chr(ord(c) - 1) for c in s))
                ```

                이 코드에 아래 문자열을 넣으면 플래그가 나와요.

                ```
                s = "%s"
                ```
                """
                    .formatted(encoded);
              },
              null),

          // ───────────────────────────── REVERSING · MEDIUM (6)

          new Seed(
              "r11",
              "세 단계 우체부",
              "REVERSING",
              "EASY",
              150,
              flag -> {
                String parcel = hex(reverse(b64(flag)));
                return """
                편지는 이 순서로 포장됐어요: Base64 → 문자열 뒤집기 → 16진수.

                ```
                parcel = %s...
                ```

                받는 쪽은 반대로! 16진수 디코드 → 뒤집기 → Base64 디코드.
                """
                    .formatted(shorten(parcel));
              },
              null),
          new Seed(
              "r12",
              "변환 함수의 심장",
              "REVERSING",
              "NORMAL",
              300,
              flag -> {
                int[] expected = rotateSwap(flag, 5);
                return """
                첨부된 transform.py는 글자를 보이는 영역(32~126)에서 5칸 민 뒤,
                이웃끼리 둘씩 자리를 바꿔요. 기대 출력이 숫자 리스트로 주어져 있어요.
                역함수를 만들어 원래 입력(플래그)을 구해 보세요!
                """;
              },
              flag -> pyTransformScript(rotateSwap(flag, 5))),
          new Seed(
              "r13",
              "규칙을 찾아서",
              "REVERSING",
              "NORMAL",
              300,
              flag -> {
                String encoded = alternateShift(flag);
                return """
                검증기는 0번째 글자는 +1, 1번째 글자는 -1, 2번째는 +1 … 이렇게 번갈아 적용해서
                비교해요. (범위는 보이는 문자 32~126을 순환해요.)

                검증기를 통과하는 문자열:

                ```
                %s
                ```

                반대로 -1/+1을 적용하면 원래 입력이 나와요.
                """
                    .formatted(encoded);
              },
              null),
          new Seed(
              "r14",
              "어셈블리 맛보기",
              "REVERSING",
              "ADVANCED",
              600,
              flag -> {
                String outHex = indexAddHex(flag);
                return """
                초간단 루프 의사코드예요. i번째 바이트에 i를 더해서 저장해요.

                ```asm
                xor rcx, rcx        ; i = 0
                loop:
                  mov al, [src+rcx]
                  add al, cl        ; al += i
                  mov [out+rcx], al
                  inc rcx
                  cmp rcx, LEN
                  jne loop
                ```

                출력(16진수):

                ```
                %s
                ```

                이번엔 각 자리에서 i를 빼면 원래 바이트가 돌아와요.
                """
                    .formatted(outHex);
              },
              null),
          new Seed(
              "r15",
              "반복 열쇠의 문",
              "REVERSING",
              "NORMAL",
              300,
              flag -> {
                String locked = xorHex(flag, "key");
                return """
                열쇠가 글자 하나가 아니라 "key" 세 글자예요. 첫 글자엔 k, 둘째엔 e, 셋째엔 y,
                넷째엔 다시 k… 돌아가면서 XOR했어요.

                ```
                cipher_hex = "%s"
                ```

                같은 열쇠로 다시 XOR하면 풀려요. 입력 길이가 열쇠 배수가 아니어도 괜찮아요!
                """
                    .formatted(locked);
              },
              null),
          new Seed(
              "r16",
              "길이가 힌트",
              "REVERSING",
              "NORMAL",
              300,
              flag -> {
                String encoded = positionalShift(flag, new int[] {3, 1, 4, 1, 5});
                return """
                이동량이 자리마다 달라요. 열쇠 숫자는 **3, 1, 4, 1, 5**로 반복돼요.

                ```
                %s
                ```

                각 글자를 보이는 영역(32~126) 안에서 해당 숫자만큼 뒤로 밀면 돼요.
                """
                    .formatted(encoded);
              },
              null),

          // ───────────────────────────── REVERSING · HARD (4)

          new Seed(
              "r17",
              "두 라운드의 관문",
              "REVERSING",
              "ADVANCED",
              600,
              flag ->
                  """
              첨부된 gate.py는 두 라운드에 걸쳐 XOR과 덧셈을 섞어 검증해요.
              기대 출력(부호 없는 바이트 리스트)이 파일 안에 주어져 있어요.
              역순으로 되감는 스크립트를 만들어 원래 암호문구(플래그)를 찾아보세요. 키는 gate7!
              """,
              flag -> pyGateScript(twoRoundTransform(flag, "gate7"))),
          new Seed(
              "r18",
              "예측 가능한 무작위",
              "REVERSING",
              "EXPERT",
              1000,
              flag -> {
                String cipherHex = xorBytesHex(flag, lcgStream(20260826L, flag.length()));
                return """
                이 암호는 "무작위"라고 썼지만 LCG라는 예측 가능한 생성기를 썼어요.

                ```
                x0 = 20260826
                x(n+1) = (x(n) * 1103515245 + 12345) mod 67108864
                키 스트림: x1, x2, ... 를 차례로 256으로 나눈 나머지
                cipher_hex = %s
                ```

                같은 시드로 키 스트림을 다시 만들어 암호문과 XOR하면 원문이 나와요.
                재현 가능한 무작위는 비밀이 될 수 없다는 교훈!
                """
                    .formatted(cipherHex);
              },
              null),
          new Seed(
              "r19",
              "나만의 베이스64",
              "REVERSING",
              "ADVANCED",
              600,
              flag -> {
                String mapped = mapAlphabet(b64(flag));
                return """
                어떤 프로그램은 Base64인데 알파벳 순서를 제멋대로 바꿨어요.

                ```
                표준표: %s
                사용표 : %s
                암호문 : %s
                ```

                암호문의 각 글자를 '사용표'에서 찾아, 같은 위치의 '표준표' 글자로 바꾼 뒤
                일반 Base64로 디코딩하면 끝!
                """
                    .formatted(STANDARD_ALPHABET, customAlphabet(), mapped);
              },
              null),
          new Seed(
              "r20",
              "최소 가상 머신",
              "REVERSING",
              "EXPERT",
              1000,
              flag -> {
                int[] program = {3, 1, 5, 2, 42};
                String outHex = vmRun(flag, program);
                return """
                명령어 3개짜리 초미니 VM이 있어요. 프로그램은 왼쪽부터 차례로 실행돼요.

                ```
                3       : 바이트 순서를 뒤집는다
                1 k     : 모든 바이트에 k를 더한다 (mod 256)
                2 k     : 모든 바이트와 k를 XOR한다

                program = [%s]
                output  = %s
                ```

                예: program의 3은 '뒤집기', 다음 1 5는 '+5', 다음 2 42는 'XOR 42'.
                명령을 거꾸로(뒤에서부터) 되돌리면 원래 입력, 즉 플래그가 나와요!
                """
                    .formatted(joinInts(program), outHex);
              },
              null));

  // ───────────────────────────── 변환 헬퍼 ─────────────────────────────

  private static String b64(String value) {
    return Base64.getEncoder().encodeToString(utf8(value));
  }

  private static String b64Url(String value) {
    return Base64.getUrlEncoder().withoutPadding().encodeToString(utf8(value));
  }

  private static String hex(String value) {
    return HexFormat.of().formatHex(utf8(value));
  }

  private static byte[] utf8(String value) {
    return value.getBytes(StandardCharsets.UTF_8);
  }

  private static String shorten(String value) {
    return value.length() <= 56 ? value : value.substring(0, 56) + "...";
  }

  private static String midPart(String flag) {
    String prefix = "CTF{w12";
    String body = flag.startsWith(prefix) ? flag.substring(prefix.length()) : flag;
    return body.endsWith("}") ? body.substring(0, body.length() - 1) : body;
  }

  private static int[] charCodes(String value) {
    return value.chars().toArray();
  }

  private static String joinInts(int[] values) {
    StringBuilder out = new StringBuilder();
    for (int i = 0; i < values.length; i++) {
      if (i > 0) {
        out.append(", ");
      }
      out.append(values[i]);
    }
    return out.toString();
  }

  private static String htmlEntities(String value) {
    StringBuilder out = new StringBuilder();
    for (byte b : utf8(value)) {
      out.append("&#").append(Byte.toUnsignedInt(b)).append(';');
    }
    return out.toString();
  }

  private static String rot13(String value) {
    StringBuilder out = new StringBuilder();
    for (char c : value.toCharArray()) {
      if (c >= 'a' && c <= 'z') {
        out.append((char) ('a' + (c - 'a' + 13) % 26));
      } else if (c >= 'A' && c <= 'Z') {
        out.append((char) ('A' + (c - 'A' + 13) % 26));
      } else {
        out.append(c);
      }
    }
    return out.toString();
  }

  private static String reverse(String value) {
    return new StringBuilder(value).reverse().toString();
  }

  /** 보이는 아스키 영역(32~126)을 순환하며 이동한다. */
  private static String shiftPrintable(String value, int delta) {
    char[] out = value.toCharArray();
    for (int i = 0; i < out.length; i++) {
      out[i] = (char) (Math.floorMod(out[i] - 32 + delta, 95) + 32);
    }
    return new String(out);
  }

  private static String caesar(String value, int delta) {
    return shiftPrintable(value, delta);
  }

  private static String alternateShift(String value) {
    StringBuilder out = new StringBuilder();
    for (int i = 0; i < value.length(); i++) {
      out.append(shiftPrintable(String.valueOf(value.charAt(i)), i % 2 == 0 ? 1 : -1));
    }
    return out.toString();
  }

  private static String positionalShift(String value, int[] deltas) {
    StringBuilder out = new StringBuilder();
    for (int i = 0; i < value.length(); i++) {
      out.append(shiftPrintable(String.valueOf(value.charAt(i)), deltas[i % deltas.length]));
    }
    return out.toString();
  }

  private static String xorHex(String value, String key) {
    byte[] raw = utf8(value);
    byte[] keys = utf8(key);
    for (int i = 0; i < raw.length; i++) {
      raw[i] = (byte) (raw[i] ^ keys[i % keys.length]);
    }
    return HexFormat.of().formatHex(raw);
  }

  private static String xorBytesHex(String value, int[] keystream) {
    byte[] raw = utf8(value);
    for (int i = 0; i < raw.length; i++) {
      raw[i] = (byte) (raw[i] ^ keystream[i]);
    }
    return HexFormat.of().formatHex(raw);
  }

  private static int[] lcgStream(long seed, int length) {
    long x = seed;
    int[] out = new int[length];
    for (int i = 0; i < length; i++) {
      x = Math.floorMod(x * 1103515245L + 12345L, 67108864L);
      out[i] = (int) (x % 256);
    }
    return out;
  }

  private static String swapNibbles(String value) {
    byte[] raw = Arrays.copyOf(utf8(value), utf8(value).length);
    for (int i = 0; i < raw.length; i++) {
      int b = Byte.toUnsignedInt(raw[i]);
      raw[i] = (byte) ((b >> 4) | ((b & 0xf) << 4));
    }
    return HexFormat.of().formatHex(raw);
  }

  private static String indexAddHex(String value) {
    byte[] raw = utf8(value);
    for (int i = 0; i < raw.length; i++) {
      raw[i] = (byte) (raw[i] + i);
    }
    return HexFormat.of().formatHex(raw);
  }

  private static int[] shiftedCodes(String value, int delta) {
    return shiftPrintable(value, delta).chars().toArray();
  }

  /** 보이는 영역 +delta 회전 후 인접 바이트끼리 맞교환한다. */
  private static int[] rotateSwap(String value, int delta) {
    byte[] raw = utf8(shiftPrintable(value, delta));
    for (int i = 0; i + 1 < raw.length; i += 2) {
      byte tmp = raw[i];
      raw[i] = raw[i + 1];
      raw[i + 1] = tmp;
    }
    int[] out = new int[raw.length];
    for (int i = 0; i < raw.length; i++) {
      out[i] = Byte.toUnsignedInt(raw[i]);
    }
    return out;
  }

  private static int[] twoRoundTransform(String value, String key) {
    byte[] raw = utf8(value);
    byte[] keys = utf8(key);
    for (int round = 0; round < 2; round++) {
      for (int i = 0; i < raw.length; i++) {
        int v = Byte.toUnsignedInt(raw[i]);
        v ^= keys[(i + round) % keys.length];
        v = (v + 5 + round * 3) & 0xff;
        raw[i] = (byte) v;
      }
    }
    int[] out = new int[raw.length];
    for (int i = 0; i < raw.length; i++) {
      out[i] = Byte.toUnsignedInt(raw[i]);
    }
    return out;
  }

  private static final String CUSTOM_ALPHABET =
      new StringBuilder("abcdefghijklmnopqrstuvwxyz0123456789").reverse().toString()
          + new StringBuilder("ABCDEFGHIJKLMNOPQRSTUVWXYZ").reverse().toString()
          + "+/";

  private static String customAlphabet() {
    return CUSTOM_ALPHABET;
  }

  private static String mapAlphabet(String standardBase64) {
    StringBuilder out = new StringBuilder();
    for (char c : standardBase64.toCharArray()) {
      int index = STANDARD_ALPHABET.indexOf(c);
      out.append(index >= 0 ? CUSTOM_ALPHABET.charAt(index) : c);
    }
    return out.toString();
  }

  /** 초미니 VM 실행기. program은 왼쪽부터 읽는다. 3은 뒤집기(1항), 1 k는 더하기, 2 k는 XOR이므로 1/2 뒤에는 항상 인수가 따라온다. */
  private static String vmRun(String value, int[] program) {
    byte[] data = utf8(value);
    for (int i = 0; i < program.length; i++) {
      int op = program[i];
      if (op == 3) {
        for (int left = 0, right = data.length - 1; left < right; left++, right--) {
          byte tmp = data[left];
          data[left] = data[right];
          data[right] = tmp;
        }
      } else if ((op == 1 || op == 2) && i + 1 < program.length) {
        int arg = program[++i];
        for (int j = 0; j < data.length; j++) {
          data[j] = (byte) (op == 1 ? data[j] + arg : data[j] ^ arg);
        }
      }
    }
    return HexFormat.of().formatHex(data);
  }

  private static String[] slice(String value, int parts) {
    String[] out = new String[parts];
    int size = value.length() / parts;
    int index = 0;
    for (int i = 0; i < parts; i++) {
      int end = (i == parts - 1) ? value.length() : index + size;
      out[i] = value.substring(index, end);
      index = end;
    }
    return out;
  }

  private static String hexDump(String value) {
    byte[] raw = utf8(value);
    StringBuilder out = new StringBuilder();
    for (int offset = 0; offset < raw.length; offset += 16) {
      out.append(String.format("%08x  ", offset));
      StringBuilder ascii = new StringBuilder();
      for (int i = 0; i < 16; i++) {
        if (offset + i < raw.length) {
          int b = Byte.toUnsignedInt(raw[offset + i]);
          out.append(String.format("%02x ", b));
          ascii.append(b >= 32 && b < 127 ? (char) b : '.');
        } else {
          out.append("   ");
        }
      }
      out.append(' ').append(ascii).append('\n');
    }
    return out.toString();
  }

  /** 줄 끝 공백 개수 = 아스키 코드 스테가노그래피 파일. */
  private static byte[] spaceStego(String flag) {
    String[] words = {
      "바람이", "불던", "오후에", "작은", "창가에서", "책을", "읽었다", "커피는", "식어도", "괜찮았다", "고양이는", "창밖을", "바라보았다",
      "구름이", "느리게", "흘렀다", "전화는", "오지 않았다"
    };
    StringBuilder out = new StringBuilder("==== hidden-note.txt ====\n");
    int[] codes = flag.chars().toArray();
    for (int i = 0; i < codes.length; i++) {
      out.append(words[i % words.length]).append(" ".repeat(Math.max(1, codes[i]))).append('\n');
    }
    return utf8(out.toString());
  }

  private static byte[] concat(byte[]... chunks) {
    int total = 0;
    for (byte[] chunk : chunks) {
      total += chunk.length;
    }
    byte[] all = new byte[total];
    int at = 0;
    for (byte[] chunk : chunks) {
      System.arraycopy(chunk, 0, all, at, chunk.length);
      at += chunk.length;
    }
    return all;
  }

  private static byte[] pngWithTail(String flag) {
    byte[] signature = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a};
    byte[] filler = new byte[32];
    byte[] tail = ("\n-- appended by someone --\n" + flag + "\n").getBytes(StandardCharsets.UTF_8);
    return concat(signature, filler, "IEND".getBytes(StandardCharsets.UTF_8), tail);
  }

  private static byte[] jpegWithZipAppendix(String base64Payload) {
    try (java.io.ByteArrayOutputStream buffer = new java.io.ByteArrayOutputStream();
        java.util.zip.ZipOutputStream zip = new java.util.zip.ZipOutputStream(buffer)) {
      zip.putNextEntry(new java.util.zip.ZipEntry("note.txt"));
      zip.write(
          ("hidden note (base64): " + base64Payload + "\ndecode me!\n")
              .getBytes(StandardCharsets.UTF_8));
      zip.closeEntry();
      zip.finish();
      byte[] archive = buffer.toByteArray();
      byte[] jpegHeader = {(byte) 0xff, (byte) 0xd8, (byte) 0xff, (byte) 0xe0};
      byte[] filler = new byte[180];
      for (int i = 0; i < filler.length; i++) {
        filler[i] = (byte) ('A' + (i % 26));
      }
      return concat(jpegHeader, filler, archive);
    } catch (java.io.IOException e) {
      throw new IllegalStateException(e);
    }
  }

  private static byte[] logArtifact(String flag) {
    String encoded = b64(flag);
    String content =
        """
        203.0.113.7 - - [12/Aug/2026:09:00:11 +0000] "GET / HTTP/1.1" 200 512
        203.0.113.7 - - [12/Aug/2026:09:00:24 +0000] "GET /login HTTP/1.1" 200 480
        198.51.100.4 - - [12/Aug/2026:09:02:41 +0000] "GET /robots.txt HTTP/1.1" 200 96
        198.51.100.4 - - [12/Aug/2026:09:03:02 +0000] "POST /uploads/%s.txt HTTP/1.1" 201 0
        198.51.100.4 - - [12/Aug/2026:09:03:29 +0000] "GET /uploads/%s.txt HTTP/1.1" 200 128
        203.0.113.9 - - [12/Aug/2026:09:05:00 +0000] "GET /notice HTTP/1.1" 200 640
        203.0.113.9 - - [12/Aug/2026:09:05:12 +0000] "GET /favicon.ico HTTP/1.1" 404 0
        """
            .formatted(encoded, encoded);
    return utf8(content);
  }

  private static byte[] jsObfuscated(String flag) {
    String inner =
        "var head=\"CTF{w12\";var rest=String.fromCharCode("
            + joinInts(charCodes(midPart(flag)))
            + ");console.log(head+rest+\"}\");";
    String content =
        "// obfuscated training script (run in the browser console)\neval(atob(\""
            + b64(inner)
            + "\"));\n";
    return utf8(content);
  }

  private static byte[] pcapTextArtifact(String base64Password) {
    String content =
        """
        # capture-summary.txt (text export of sample.pcap)
        No.  Time      Info
        1    0.001002  TCP  49212 -> 80 [SYN]
        2    0.001233  HTTP GET /index.html
        3    0.104551  TCP  49213 -> 80 [SYN]
        4    0.105112  HTTP GET /login?u=admin&p=%s
        5    0.105900  HTTP/1.1 200 OK
        6    0.220341  HTTP GET /style.css
        7    0.224800  TCP  49213 -> 80 [FIN]
        """
            .formatted(base64Password);
    return utf8(content);
  }

  private static byte[] memDumpArtifact(String flag) {
    String decoyA = "test_flag_placeholder=CTF{" + shortHash("decoy-a") + "}";
    String decoyB = "debug template: CTF{" + shortHash("decoy-b") + "}";
    String content =
        """
        ==== strings sample (memdump.bin) ====
        kernel32.dll
        GetTickCount
        user_session opened for guest1
        %s
        C:\\Windows\\System32\\cmd.exe
        session note saved: %s
        default_password=changeme123
        %s
        heap block 0x00A4 size=128
        """
            .formatted(decoyA, flag, decoyB);
    return utf8(content);
  }

  private static byte[] pyCheckScript(String flag) {
    String content =
        "# check.py - offline practice verifier\nanswer = \""
            + flag
            + "\"\nguess = input(\"password? \")\nprint(\"OK\" if guess == answer else \"NO\")\n";
    return utf8(content);
  }

  private static byte[] pyTransformScript(int[] expected) {
    String content =
        """
        # transform.py - what the program does to your input
        def transform(text):
            data = [(ord(c) - 32 + 5) %% 95 + 32 for c in text]
            for i in range(0, len(data) - 1, 2):
                data[i], data[i + 1] = data[i + 1], data[i]
            return data

        expected = [%s]
        guess = input("input? ")
        print("OK" if transform(guess) == expected else "NO")
        """
            .formatted(joinInts(expected))
            .replace("%%", "%");
    return utf8(content);
  }

  private static byte[] pyGateScript(int[] expected) {
    String content =
        """
        # gate.py - two-round offline verifier
        KEY = b"gate7"

        def gate(text):
            data = bytearray(text.encode())
            for rnd in range(2):
                for i in range(len(data)):
                    v = data[i] ^ KEY[(i + rnd) %% len(KEY)]
                    data[i] = (v + 5 + rnd * 3) & 0xFF
            return list(data)

        expected = [%s]
        guess = input("passphrase? ")
        print("accepted" if gate(guess) == expected else "denied")
        """
            .formatted(joinInts(expected))
            .replace("%%", "%");
    return utf8(content);
  }

  private static String shortHash(String value) {
    try {
      byte[] digest = MessageDigest.getInstance("SHA-256").digest(utf8(value));
      return HexFormat.of().formatHex(Arrays.copyOf(digest, 6));
    } catch (java.security.NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }
}
