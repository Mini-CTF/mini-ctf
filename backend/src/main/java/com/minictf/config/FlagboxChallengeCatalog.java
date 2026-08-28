package com.minictf.config;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;

/**
 * FlagBox 워게임 60문제 카탈로그.
 *
 * <p>모든 문제는 첨부 파일을 다운로드하고 분야별 기술을 적용해 플래그를 찾는 구조다. 지문에는 플래그와 그 변형을 절대 노출하지 않으며, 플래그는 실행 시점에 무작위
 * 생성되어 첨부 파일 안에 (인코딩·변환된 형태로) 심긴다.
 */
final class FlagboxChallengeCatalog {

  private FlagboxChallengeCatalog() {}

  /** 단일 문제 정의. artifact는 실행 시점 플래그를 받아 첨부 파일 바이트를 만든다. */
  record Seed(
      String key,
      String title,
      String category,
      String difficulty,
      int score,
      String hint,
      String description,
      String fileName,
      ArtifactWriter artifact) {}

  @FunctionalInterface
  interface ArtifactWriter {
    byte[] write(String flag);
  }

  private static final String STANDARD_ALPHABET =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

  private static final String CUSTOM_ALPHABET =
      new StringBuilder("abcdefghijklmnopqrstuvwxyz0123456789").reverse().toString()
          + new StringBuilder("ABCDEFGHIJKLMNOPQRSTUVWXYZ").reverse().toString()
          + "+/";

  static final List<Seed> SEEDS = buildSeeds();

  private static List<Seed> buildSeeds() {
    List<Seed> seeds =
        new ArrayList<>(
            List.of(
          // ───────────────────────────── WEB · BEGINNER (5)

          new Seed(
              "w01",
              "첫 발견의 기쁨",
              "WEB",
              "BEGINNER",
              50,
              "주석은 <!-- 와 --> 사이예요. 메모장으로 열고 Ctrl+F 로 'TODO'를 검색!",
              "동료가 배포한 홈페이지 파일을 받았어요. 겉모습은 평범하지만, 소스 어딘가에 배포 전에 지우지 못한 메모가 남았다고 해요. 파일을 열어 주석 속 값을 찾아보세요!",
              "page.html",
              FlagboxChallengeCatalog::pageHtmlWithComment),
          new Seed(
              "w02",
              "보이지 않는 입력칸",
              "WEB",
              "BEGINNER",
              50,
              "type=\"hidden\" 은 화면만 숨겨요. 소스에서 value= 를 찾아보세요.",
              "회원가입 페이지 파일이 도착했어요. 화면에는 보이지 않지만 폼 안에 숨겨진 입력칸이 하나 있다고 해요. 초대 코드 같은 게 적혀 있다던데…",
              "join-form.html",
              flag ->
                  txt(
                      "<form action=\"/join\" method=\"post\">\n  <input name=\"id\" placeholder=\"아이디\">\n  <input name=\"pw\" type=\"password\">\n  <input type=\"hidden\" name=\"invite\" value=\""
                          + flag
                          + "\">\n</form>\n")),
          new Seed(
              "w03",
              "로봇에게만 알려준 길",
              "WEB",
              "BEGINNER",
              50,
              "robots.txt 의 Disallow 는 '여기 비밀이 있어요' 라는 뜻이기도 해요.",
              "웹서버 설정 스냅샷을 받았어요. 검색 로봇용 규칙 파일에 숨긴 경로가 적혀 있고, 그 경로의 메모 내용도 함께 스냅샷에 담겨 있대요. 두 파일을 연결해 보세요!",
              "robots-snapshot.txt",
              flag ->
                  txt(
                      "robots.txt\n--------------------------------\nUser-agent: *\nDisallow: /private/notes.txt\n\nprivate/notes.txt\n--------------------------------\n운영자 메모: 확인 코드 "
                          + flag
                          + "\n")),
          new Seed(
              "w04",
              "쿠키 속 암호",
              "WEB",
              "BEGINNER",
              50,
              "값 끝에 붙은 = 는 Base64의 특징! 디코더에 넣어보세요.",
              "게스트 계정으로 접속했을 때 저장된 쿠키 덤프를 받았어요. 누군가 흥미로운 값을 Base64로 포장해 뒀다는 소문이 있네요.",
              "cookies.txt",
              flag -> txt("guest_note = " + b64(flag) + "\n")),
          new Seed(
              "w05",
              "페이지의 명함",
              "WEB",
              "BEGINNER",
              50,
              "<head> 안쪽은 화면에 안 보여도 공개된 정보예요. meta 태그를 하나씩 읽어 보세요.",
              "사이트 head 부분만 추출한 파일이에요. 빌더가 남긴 note 태그가 있다는데 화면엔 나오지 않았대요.",
              "head.html",
              flag ->
                  txt(
                      "<head>\n  <title>FlagBox 소개</title>\n  <meta name=\"description\" content=\"입문자를 위한 보안 워게임\">\n  <meta name=\"builder-note\" content=\""
                          + flag
                          + "\">\n</head>\n")),

          // ───────────────────────────── WEB · EASY (6)

          new Seed(
              "w06",
              "스크립트 속 변수",
              "WEB",
              "EASY",
              150,
              "프론트 코드는 전부 공개예요. 의미 있는 변수 이름부터 눈으로 훑어보세요.",
              "페이지가 불러오는 app.js 파일을 받았어요. 콘솔 로그 말고도 관리자가 남겨둔 값이 있다네요.",
              "app.js",
              flag -> txt("const ADMIN_NOTE = \"" + flag + "\";\nconsole.log(\"환영합니다!\");\n")),
          new Seed(
              "w07",
              "주소창의 암호",
              "WEB",
              "EASY",
              150,
              "?data= 뒤의 값은 Base64. 디코더에 넣으면 끝!",
              "공유 링크가 담긴 파일을 받았어요. 주소 끝에 알 수 없는 문자열이 붙어 있는데, 서버가 손편지를 Base64로 실어 보낸 거라고 해요.",
              "shared-link.txt",
              flag -> txt("https://example.com/welcome?data=" + b64(flag) + "\n")),
          new Seed(
              "w08",
              "응답 헤더의 쪽지",
              "WEB",
              "EASY",
              150,
              "X- 로 시작하는 헤더는 개발자의 자유 영역. 쪽지가 숣을 수 있어요.",
              "캡처한 HTTP 응답 헤더 파일이에요. 본문은 평범한데 헤더 중 하나가 수상하다는 제보가 있어요.",
              "response-headers.txt",
              flag ->
                  txt(
                      "HTTP/1.1 200 OK\nContent-Type: text/html\nX-Server-Build: 2026.08\nX-Memory-Lane: "
                          + flag
                          + "\n")),
          new Seed(
              "w09",
              "16진수로 쓰인 편지",
              "WEB",
              "EASY",
              150,
              "두 글자 = 한 글자. hex→text 변환기면 충분해요.",
              "오래된 게시판 댓글이 통째로 16진수로 적혀 있어요. 옛 개발자의 편지라고 하네요. 파일로 받았어요!",
              "letter.hex",
              flag -> txt(hex(flag) + "\n")),
          new Seed(
              "w10",
              "엔터티의 옷을 벗기면",
              "WEB",
              "EASY",
              150,
              "&#숫자; 는 아스키 코드예요. 콘솔 한 줄로 벗길 수 있어요.",
              "웹소스 발췌 파일에 &#67; 처럼 생긴 문자열들이 가득해요. HTML 엔터티라고 하네요. 원문을 복원해 보세요!",
              "entities.html",
              flag -> txt(htmlEntities(flag) + "\n")),
          new Seed(
              "w11",
              "지워지지 않은 발자국",
              "WEB",
              "EASY",
              150,
              "POST /uploads/ 줄의 파일명에 주목! Base64처럼 생겼다면 의심 신호.",
              "웹서버 접속 기록을 받았어요. 누군가 이상한 이름의 파일을 올리고 다시 내려받았대요. 그 파일명부터 확인해 보세요.",
              "access.log",
              flag -> logArtifact(flag)),

          // ───────────────────────────── WEB · NORMAL (4)

          new Seed(
              "w12",
              "난독화 입문",
              "WEB",
              "NORMAL",
              300,
              "atob() 은 Base64 디코딩, eval() 은 코드 실행. 브라우저 콘솔에서 안쪽부터 풀어보세요.",
              "사이트에서 수상한 스크립트 파일이 다운로드됐어요. 겉보기엔 알 수 없지만 eval 과 atob 이 보여요. 안쪽 코드를 복원하고 실행해 보세요!",
              "hidden.js",
              flag -> jsObfuscated(flag)),
          new Seed(
              "w13",
              "열어본 JWT",
              "WEB",
              "NORMAL",
              300,
              "JWT 세 칸 중 앞 두 칸은 그냥 Base64URL. 서명은 못 바꿔도 읽기는 자유!",
              "로그인 후 발급된 토큰 파일이에요. 서비스 운영자가 memo 필드에 무언가 남겼다고 하네요.",
              "token.jwt",
              flag -> {
                String payload =
                    "{\"sub\":\"guest\",\"role\":\"viewer\",\"memo\":\"" + flag + "\"}";
                return txt(
                    b64Url("{\"alg\":\"HS256\",\"typ\":\"JWT\"}")
                        + "."
                        + b64Url(payload)
                        + ".SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJVadQssw5c\n");
              }),
          new Seed(
              "w14",
              "두 겹의 포장",
              "WEB",
              "NORMAL",
              300,
              "겉 포장이 hex 라면 16진수 먼저! 그 다음 포장지를 확인하세요.",
              "배달원이 두 겹으로 포장한 소포를 남겼어요. 쪽지에는 '겉은 16진수, 안은 Base64' 라고 적혀 있습니다.",
              "parcel.hex",
              flag -> txt(hex(b64(flag)) + "\n")),
          new Seed(
              "w15",
              "꺼져 있는 문은 잠긴 까",
              "WEB",
              "NORMAL",
              300,
              "disabled 는 브라우저만 속여요. 요청 예시의 coupon 값을 주목!",
              "쇼핑몰 결제 폼과 개발 중이던 응답 예시가 담긴 파일이에요. 비활성화된 쿠폰칸 뒤편에 무엇이 숣어있을까요?",
              "checkout-sample.txt",
              flag ->
                  txt(
                      "폼:\n<form action=\"/checkout\" method=\"post\">\n  <input name=\"item\" value=\"pen\">\n  <input name=\"coupon\" value=\"SUMMER2026\" disabled>\n</form>\n\n응답 예시:\nPOST /checkout  item=pen&coupon=SPRINGHIDE\n200 OK { \"message\": \"쿠폰 적용!\", \"receipt\": \""
                          + flag
                          + "\" }\n")),

          // ───────────────────────────── WEB · ADVANCED (3)

          new Seed(
              "w16",
              "리다이렉트 미로",
              "WEB",
              "ADVANCED",
              600,
              "Set-Cookie 조각들은 이름(piece1/2/3) 순서대로 이어 붙이세요.",
              "한 서비스가 로그인 후 세 번이나 되돌려 보냈어요. 거치는 곳마다 쿠키 조각을 하나씩 나눠 줬다는 기록이 남았습니다.",
              "redirect-trace.txt",
              flag -> {
                String p1 = flag.substring(0, flag.length() / 3);
                String p2 = flag.substring(flag.length() / 3, flag.length() * 2 / 3);
                String p3 = flag.substring(flag.length() * 2 / 3);
                return txt(
                    "302 /enter   Set-Cookie: piece1="
                        + p1
                        + "\n302 /verify  Set-Cookie: piece2="
                        + p2
                        + "\n302 /done    Set-Cookie: piece3="
                        + p3
                        + "\n200 최종: 조각을 이름 순서대로 이으면 무언가가 보여요.\n");
              }),
          new Seed(
              "w18",
              "세 겹의 포장",
              "WEB",
              "ADVANCED",
              600,
              "마지막에 한 연산부터 되감으세요: 뒤집기 → ROT13 → Base64 순서!",
              "포장 공정 기록이 남았어요. Base64 → ROT13 → 뒤집기, 세 단계를 거쳤다고 합니다. 완성품이 파일에 담겨 있어요.",
              "wrapped-package.txt",
              flag -> txt(reverse(rot13(b64(flag))) + "\n")),
          new Seed(
              "w19",
              "흩어진 조각",
              "WEB",
              "ADVANCED",
              600,
              "조각마다 적힌 번호가 곧 순서예요. 메모장에서 이어 붙이세요.",
              "공격자가 플래그를 세 군데 흘리고 갔어요. 쿠키·로그·주석에서 각각 한 조각씩 회수했습니다. 파일에 정리되어 있어요!",
              "collected-pieces.txt",
              flag -> {
                String[] pieces = slice(flag, 3);
                return txt(
                    "[조각1 - 쿠키]\n"
                        + pieces[0]
                        + "\n\n[조각2 - 로그]\n"
                        + pieces[1]
                        + "\n\n[조각3 - 주석]\n"
                        + pieces[2]
                        + "\n");
              }),

          // ───────────────────────────── WEB · EXPERT (2)

          new Seed(
              "w17",
              "블랙박스 검증기",
              "WEB",
              "EXPERT",
              1000,
              "+3 을 했다면 정답은 -3! 숫자 배열을 문자로 되돌리는 함수를 짜보세요.",
              "초대 코드 검증기의 소스와 TARGET 상수가 담긴 파일을 입수했어요. 검증기를 통과하는 원래 코드가 곧 플래그입니다.",
              "invite-verifier.js",
              flag ->
                  txt(
                      "function check(code) {\n  const out = [...code].map(c => c.charCodeAt(0) + 3);\n  return out.join(\",\") === TARGET;\n}\nconst TARGET = \""
                          + joinInts(shiftedCodes(flag, 3))
                          + "\";\n")),
          new Seed(
              "w20",
              "관리자의 실수",
              "WEB",
              "EXPERT",
              1000,
              "변수 이름과 주석이 판단 근거예요. SAMPLE·TEMPLATE·DEBUG 는 함정!",
              "배포 설정 백업 파일이 노출됐어요. 여러 개의 CTF{...} 값이 섞여 있지만 단 하나만 진짜입니다. 컨텍스트를 읽고 고르세요!",
              "deploy-backup.env",
              flag ->
                  txt(
                      "# deploy-backup.env\nDEBUG_FLAG=CTF{this_is_a_decoy_01}\nLEGACY_TOKEN=CTF{old_token_retired_99}\nAPP_ENV=production\n\n# 2026-08-01 운영 배포 최종본 (real)\nAPP_REAL_FLAG="
                          + flag
                          + "\n\nSAMPLE_FLAG=CTF{example_only_do_not_submit}\nTEMPLATE_FLAG=CTF{replace_me_before_release}\n")),

          // ───────────────────────────── FORENSIC · BEGINNER (5)

          new Seed(
              "f01",
              "정체불명의 파일",
              "FORENSIC",
              "BEGINNER",
              50,
              "PNG는 IEND 에서 끝나요. 그 뒤에 붙은 건 원래 없던 데이터!",
              "확장자 없는 파일을 발견했어요. 시그니처를 보니 PNG 이미지인데, 어째선지 이미지가 열리지 않네요. 파일 끝을 확인해 보세요!",
              "mystery.bin",
              FlagboxChallengeCatalog::pngWithTail),
          new Seed(
              "f02",
              "반복된 실패",
              "FORENSIC",
              "BEGINNER",
              50,
              "FAIL 이 몰리다가 갑자기 성공하면, 그 줄에 관심 가져보세요.",
              "로그인 기록(auth.log)을 받았어요. 한 계정에 실패가 몰려 있는데, 결국 성공한 흔적도 보인다고 해요.",
              "auth.log",
              flag ->
                  txt(
                      "03:11:02 LOGIN FAIL user=guest1 ip=198.51.100.9\n03:11:09 LOGIN FAIL user=guest1 ip=198.51.100.9\n03:11:15 LOGIN FAIL user=guest1 ip=198.51.100.9\n03:12:40 LOGIN FAIL user=guest1 ip=198.51.100.9\n03:13:01 LOGIN OK   user=guest1 ip=198.51.100.9 memo="
                          + flag
                          + "\n")),
          new Seed(
              "f03",
              "사진이 말해주는 것",
              "FORENSIC",
              "BEGINNER",
              50,
              "EXIF 의 UserComment 는 카메라가 아니라 사람이 넣는 필드예요.",
              "야간 점검 사진의 메타데이터를 추출했어요. 촬영 정보 외에 이상한 코멘트가 남아있다고 해요.",
              "photo-exif.txt",
              flag ->
                  txt(
                      "Make         : ExampleCorp\nModel        : Cam-X100\nDateTime     : 2026:08:15 18:42:03\nUserComment  : gate 7 점검 완료, 인증 코드 "
                          + flag
                          + "\n")),
          new Seed(
              "f06",
              "USB 연결 기록",
              "FORENSIC",
              "BEGINNER",
              50,
              "setupapi 로그의 Device Install 블록에 장치 정보가 다 모여요.",
              "회사 PC의 USB 연결 로그를 받았어요. 승인되지 않은 장치 하나가 눈에 띈다고 해요. OperatorNote 필드를 확인해 보세요!",
              "usb-setupapi.log",
              flag ->
                  txt(
                      "[2026-08-12 10:22:31] Device Install (USBSTOR)\nDisk&Prod_ExampleFlash&Rev_1.00\nSerial: 0c1d2e3f\nFriendlyName: Example Flash\nOperatorNote: "
                          + flag
                          + "\n")),
          new Seed(
              "f09",
              "방문 기록의 이상한 항목",
              "FORENSIC",
              "BEGINNER",
              50,
              "사설 IP(192.168.x.x 등)·이상한 포트로의 직접 접속은 이상치예요.",
              "브라우저 방문 기록을 내보낸 파일이에요. 대부분 평범한데 한 줄만 분위기가 다르다고 해요.",
              "history.txt",
              flag ->
                  txt(
                      "2026-08-18 09:02  https://search.example.com/q=weather   제목: 날씨\n2026-08-18 09:05  https://mail.example.com/inbox         제목: 받은편지함\n2026-08-18 09:07  http://192.0.2.77:8081/n0te            제목: "
                          + flag
                          + "\n2026-08-18 09:11  https://news.example.com/              제목: 뉴스\n")),

          // ───────────────────────────── FORENSIC · EASY (6)

          new Seed(
              "f04",
              "휴지통의 흔적",
              "FORENSIC",
              "EASY",
              150,
              "$I 는 삭제 정보, $R 는 내용 조각이에요. 복구된 문장을 읽어보세요.",
              "삭제된 문서의 포렌식 리포트를 받았어요. 휴지통 기록과 일부 복구된 내용이 함께 담겨 있습니다.",
              "recycle-report.txt",
              flag ->
                  txt(
                      "$I8KQ2T1.index   원본: C:\\Users\\guest\\Documents\\plan.txt  삭제: 2026-08-20 21:14\n$R8KQ2T1.content 일부 복구됨:\n  \"...프로젝트는 취소. 최종 인증 문구만 남긴다 -> "
                          + flag
                          + " ...\"\n")),
          new Seed(
              "f05",
              "목록에 없는 파일",
              "FORENSIC",
              "EASY",
              150,
              "백업 목록에서 이름·시간이 어색한 항목이 이상치예요.",
              "백업 압축파일의 목록과 함께, 목록에 없던 파일의 내용 발췌가 전달됐어요. 어떤 게 섞였는지 찾아보세요!",
              "backup-listing.txt",
              flag ->
                  txt(
                      "-rw-r--r-- guest/guest   1024 2026-08-10 09:00 docs/report.docx\n-rw-r--r-- guest/guest    512 2026-08-10 09:00 img/logo.png\n-rw-r--r-- guest/guest     96 2026-08-10 09:01 ..n0te..txt\n\n숨은 파일 내용:\n"
                          + flag
                          + "\n")),
          new Seed(
              "f07",
              "덤프의 오른쪽 열",
              "FORENSIC",
              "EASY",
              150,
              "hexdump 오른쪽 ASCII 열은 번역본이에요. 위에서 아래로 읽으세요.",
              "메모리 조각의 hexdump를 받았어요. 왼쪽은 어려워 보이지만, 오른쪽 열만 읽으면 된다네요!",
              "memory.hexdump",
              flag -> txt(hexDump(flag))),
          new Seed(
              "f08",
              "편지의 겉봉",
              "FORENSIC",
              "EASY",
              150,
              "X- 헤더는 프로그램이 자유롭게 쓰는 비표준 공간이에요.",
              "이메일 헤더 발췌 파일을 받았어요. 본문보다 겉봉(헤더)에 흥미로운 게 적혀 있다는 소문이 있어요.",
              "email-headers.txt",
              flag ->
                  txt(
                      "From: friend@example.com\nTo: me@example.com\nSubject: 지난 주 약속\nX-Mailer: MailApp 3.2\nX-Sender-Note: "
                          + flag
                          + "\n")),
          new Seed(
              "f10",
              "압축파일의 여백",
              "FORENSIC",
              "EASY",
              150,
              "zipinfo 출력의 Comment 줄을 놓치지 마세요.",
              "오래된 ZIP의 구조 정보를 출력한 파일이에요. 파일 목록 말고, 압축파일 자체에 달린 코멘트도 확인해 보세요!",
              "zipinfo.txt",
              flag ->
                  txt(
                      "Archive:  old-backup.zip\nComment: "
                          + flag
                          + "\nLength  Name\n-----   ----\n 2048   docs/readme.txt\n")),
          new Seed(
              "f12",
              "새벽의 방문자",
              "FORENSIC",
              "EASY",
              150,
              "출근 시간 외 반복 접속 계정의 memo 컬럼을 확인하세요. Base64!",
              "로그인 기록 CSV예요. 대부분 출근 시간대인데, 한 계정만 매일 새벽 3시대에 접속하고 있네요.",
              "logins.csv",
              flag ->
                  txt(
                      "time,user,ip,memo\n2026-08-11 09:02,hr01,10.0.0.11,\n2026-08-11 09:05,dev02,10.0.0.12,\n2026-08-12 03:41,srv-batch,10.0.0.90,"
                          + b64(flag)
                          + "\n2026-08-12 09:01,hr01,10.0.0.11,\n2026-08-13 03:39,srv-batch,10.0.0.90,"
                          + b64(flag)
                          + "\n")),

          // ───────────────────────────── FORENSIC · NORMAL (4)

          new Seed(
              "f11",
              "와이어 위의 신호",
              "FORENSIC",
              "NORMAL",
              300,
              "HTTP GET 의 p= 매개변수가 Base64처럼 생겼다면 디코딩!",
              "패킷 캡처를 텍스트로 정리한 파일이에요. HTTP GET 한 줄이 유독 길고, p= 라는 값이 붙어 있네요.",
              "capture.txt",
              flag -> pcapTextArtifact(b64(flag))),
          new Seed(
              "f13",
              "자동 시작의 그림자",
              "FORENSIC",
              "NORMAL",
              300,
              "powershell -enc 뒤는 Base64 명령이에요. 디코딩하면 하는 짓이 보여요.",
              "윈도우 시작 프로그램 등록(Run 키) 덤프를 받았어요. OneDrive 라고 적힌 줄 말고 수상한 줄이 하나 있어요.",
              "run-key.txt",
              flag ->
                  txt(
                      "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\n  OneDriveSync   = \"C:\\Program Files\\OneDrive\\OneDrive.exe\"\n  SysHelper      = powershell -enc "
                          + b64Url("echo " + flag)
                          + "\n")),
          new Seed(
              "f14",
              "사진 뒤에 붙은 것",
              "FORENSIC",
              "NORMAL",
              300,
              "PK 시그니처를 찾아 그 지점부터 zip 으로 잘라내세요. 안의 note.txt 를 확인!",
              "SNS에 올라온 사진 파일인데, 뭔가 뒤에 붙었다는 제보가 들어왔어요. hex 에디터로 열어 확인해 보세요!",
              "photo.bin",
              FlagboxChallengeCatalog::jpegWithZipAppendix),
          new Seed(
              "f15",
              "메모리 속 문자열",
              "FORENSIC",
              "NORMAL",
              300,
              "CTF{ 검색 결과가 여러 개면 문맥이 진짜를 가려줘요. test/template 는 버려!",
              "메모리 덤프에서 뽑아낸 문자열 목록이에요. 플래그 후보가 여러 개 보이지만 단 하나만 진짜랍니다.",
              "memdump.txt",
              flag -> memDumpArtifact(flag)),

          // ───────────────────────────── FORENSIC · ADVANCED (3)

          new Seed(
              "f16",
              "시간을 거슬러 간 문서",
              "FORENSIC",
              "ADVANCED",
              600,
              "modified < created 라면 시간 조작 의심! v2 에서 '지워졌다' 는 문단을 찾으세요.",
              "문서 버전 기록이 이상해요. 수정일이 생성일보다 과거인 파일이 있고, 그 안 어딘가에 지워진 문단이 남아있다네요.",
              "version-report.txt",
              flag ->
                  txt(
                      "report-v1.docx  created 2026-08-01 09:00  modified 2026-08-01 09:00\nreport-v2.docx  created 2026-08-05 11:20  modified 2026-07-30 18:03  ← ?\n\nv2 발췌:\n... 2학기 계획은 다음과 같다.\n(v2에서 이 문단은 통째로 지워졌다: 최종 승인 코드 "
                          + flag
                          + " ...)\n")),
          new Seed(
              "f17",
              "두 로그의 교차",
              "FORENSIC",
              "ADVANCED",
              600,
              "공격자 IP 행동을 시간순으로 정렬하고 경로 조각을 URL 디코딩!",
              "웹 접속 로그와 인증 로그를 한 파일에 정리했어요. 공격자가 들른 경로 조각들을 모아 이으면 플래그가 됩니다.",
              "correlated-logs.txt",
              flag -> {
                String[] parts = slice(flag, 3);
                return txt(
                    "web : 01:02:11 GET /kb/%PART1%\nauth: 01:02:29 LOGIN FAIL user=admin ip=198.51.100.66\nweb : 01:02:44 GET /kb/%PART2%\nweb : 01:03:02 POST /login (admin) ip=198.51.100.66\nauth: 01:03:05 LOGIN OK   user=admin ip=198.51.100.66\nweb : 01:03:20 GET /export/%PART3%"
                            .replace("%PART1%", parts[0])
                            .replace("%PART2%", parts[1])
                            .replace("%PART3%", parts[2])
                        + "\n");
              }),
          new Seed(
              "f20",
              "덮어쓴 일기장",
              "FORENSIC",
              "ADVANCED",
              600,
              "덮어쓴 파일이 짧으면 옛 내용의 꼬리가 살아남아요. 잔여 조각을 읽으세요.",
              "USB가 포맷됐지만 복구 도구가 이전 파일의 조각을 찾아냈어요. 새 일기장 아래 깔린 옛 일기장의 끝부분!",
              "diary-slack.txt",
              flag ->
                  txt(
                      "=== 현재 파일 (diary.txt, 2026-08-24) ===\n오늘은 하루 종일 비가 왔다. 별일 없었다.\n\n=== 복구된 잔여 조각 (이전 diary.txt, 2026-08-10) ===\n...(앞부분 유실)...\n...비밀 약속 기록은 여기까지. 인증 문구: "
                          + flag
                          + "\n")),

          // ───────────────────────────── FORENSIC · EXPERT (2)

          new Seed(
              "f18",
              "찢어진 편지",
              "FORENSIC",
              "EXPERT",
              1000,
              "Base64는 길이가 4의 배수! 조각 길이표로 가능한 순서를 좁히세요.",
              "Base64 문장이 세 조각으로 찢겨 도착했어요. 순서표는 없지만, 조각 길이가 적혀 있습니다. 유일하게 디코딩되는 순서를 찾으세요!",
              "torn-letter.txt",
              flag -> {
                String whole = b64(flag);
                int cut = whole.length() / 3;
                String a = whole.substring(0, cut);
                String b = whole.substring(cut, cut * 2);
                String c = whole.substring(cut * 2);
                return txt(
                    "조각-가 ("
                        + a.length()
                        + "글자): "
                        + a
                        + "\n조각-나 ("
                        + b.length()
                        + "글자): "
                        + b
                        + "\n조각-다 ("
                        + c.length()
                        + "글자): "
                        + c
                        + "\n\n전체 길이: "
                        + whole.length()
                        + "글자\n");
              }),
          new Seed(
              "f19",
              "보이지 않는 백색소음",
              "FORENSIC",
              "EXPERT",
              1000,
              "VSCode 의 '공백 렌더링' 을 켜면 보여요. 줄 끝 공백 개수 = 아스키 코드!",
              "평범한 시처럼 보이는 메모장 파일이에요. 그런데 줄 끝 공백 개수에 규칙이 숨겨져 있다고 합니다. 첫 줄 공백 = 첫 글자의 아스키 코드!",
              "whitespace-poem.txt",
              FlagboxChallengeCatalog::spaceStego),

          // ───────────────────────────── REVERSING · BEGINNER (5)

          new Seed(
              "r01",
              "거꾸로 세계",
              "REVERSING",
              "BEGINNER",
              50,
              "파이썬 [::-1] 은 뒤집기예요. 온라인 리버스 도구도 좋아요.",
              "어떤 프로그램이 문자열을 뒤집어 저장해 두었어요. 저장본 파일을 받았습니다!",
              "stored.txt",
              flag -> txt(reverse(flag) + "\n")),
          new Seed(
              "r02",
              "열세 뒤집기",
              "REVERSING",
              "BEGINNER",
              50,
              "ROT13 은 두 번 하면 원문. 온라인 변환기면 충분해요.",
              "ROT13 으로 인코딩된 메시지 파일이 도착했어요. 인터넷 초창기 스포일러 방식이라네요!",
              "rot13-message.txt",
              flag -> txt(rot13(flag) + "\n")),
          new Seed(
              "r05",
              "숫자의 나열",
              "REVERSING",
              "BEGINNER",
              50,
              "65=A, 97=a, 123={ … chr() 함수로 변환하세요.",
              "프로그램 로그에 숫자들이 줄지어 있어요. 파일로 받아 하나씩 문자로 바꿔 보세요!",
              "bytes.log",
              flag -> txt(joinInts(charCodes(flag)) + "\n")),
          new Seed(
              "r06",
              "두 번 포장된 상자",
              "REVERSING",
              "BEGINNER",
              50,
              "디코더를 두 번! 결과가 또 Base64처럼 생겼으면 한 번 더.",
              "Base64 포장을 두 겹이나 한 상자가 도착했어요. 벗기는 것도 두 번!",
              "box.b64",
              flag -> txt(b64(b64(flag)) + "\n")),
          new Seed(
              "r07",
              "시저의 서신",
              "REVERSING",
              "BEGINNER",
              50,
              "3칸 이동을 되돌리려면 3칸 뒤로. 특수문자도 밀렸다는 점 주의(32~126 순환)!",
              "로마 시저가 쓰던 방식으로 암호화된 편지가 왔어요. 알파벳만 3칸 미는 게 아니라 모든 글자가 밀려 있다네요.",
              "letter.caesar",
              flag -> txt(caesar(flag, 3) + "\n")),

          // ───────────────────────────── REVERSING · EASY (6)

          new Seed(
              "r03",
              "작은 검문소",
              "REVERSING",
              "EASY",
              150,
              "비교 대상이 코드에 하드코딩돼 있다면 그게 정답이에요. 읽기가 리버싱의 시작!",
              "검증 스크립트 check.py 를 받았어요. 실행하지 않고도 정답을 알 수 있다는데?",
              "check.py",
              flag -> pyCheckScript(flag)),
          new Seed(
              "r04",
              "열쇠 하나짜리 잠금",
              "REVERSING",
              "EASY",
              150,
              "XOR 은 두 번 하면 원문! 키는 문자 K, 즉 0x4B 예요.",
              "모든 글자에 같은 열쇠로 XOR 한 잠금장치 파일이에요. 열쇠 글자는 K 라는 힌트가 있네요.",
              "locked.hex",
              flag -> txt(xorHex(flag, "K") + "\n")),
          new Seed(
              "r08",
              "조건문 수업",
              "REVERSING",
              "EASY",
              150,
              "출력이 word[::-1] 이라면, 출력물을 다시 뒤집으면 입력이 나와요.",
              "규칙 검사 후 입력을 뒤집어 출력하는 프로그램의 실행 결과 파일이에요. 원래 입력이 무엇이었을까요?",
              "program-output.txt",
              flag -> txt(reverse(flag) + "\n")),
          new Seed(
              "r09",
              "앞뒤가 바뀐 니블",
              "REVERSING",
              "EASY",
              150,
              "43 ↔ 34 처럼 hex 두 글자를 맞바꾸면 돼요. 같은 연산을 두 번!",
              "각 바이트의 앞뒤 4비트를 맞바꾼 파일이에요. 같은 뒤집기를 한 번 더 하면 원래대로!",
              "swapped.hex",
              flag -> txt(swapNibbles(flag) + "\n")),
          new Seed(
              "r10",
              "한 줄 마법",
              "REVERSING",
              "EASY",
              150,
              "chr(ord(c)-1) 은 한 칸 뒤로 미는 코드예요. s 에 파일 값을 넣고 실행!",
              "파이썬 한 줄이 모든 글자를 조금 민 파일이에요. 코드와 인코딩된 s 값이 함께 담겨 있어요.",
              "magic-input.txt",
              flag ->
                  txt(
                      "print(\"\".join(chr(ord(c) - 1) for c in s))\ns = \""
                          + shiftPrintable(flag, 1)
                          + "\"\n")),

          // ───────────────────────────── REVERSING · NORMAL (5)

          new Seed(
              "r11",
              "세 단계 우체부",
              "REVERSING",
              "NORMAL",
              300,
              "포장 역순: hex 디코드 → 뒤집기 → Base64 디코드!",
              "편지가 Base64 → 뒤집기 → 16진수 순서로 삼중 포장되어 왔어요. 받는 쪽은 반대로 풀면 됩니다!",
              "parcel.hex",
              flag -> txt(hex(reverse(b64(flag))) + "\n")),
          new Seed(
              "r12",
              "변환 함수의 심장",
              "REVERSING",
              "NORMAL",
              300,
              "+5 회전과 인접 교환은 각각 되돌리기 쉬워요. 교환 먼저 되돌리고 -5!",
              "transform.py 검증기와 기대 출력(expected 리스트)이 담긴 파일이에요. 역함수를 만들어 통과시켜 보세요!",
              "transform.py",
              flag -> pyTransformScript(rotateSwap(flag, 5))),
          new Seed(
              "r13",
              "Reverse Layer",
              "REVERSING",
              "NORMAL",
              300,
              "Base64 and hexadecimal are separated by one reversal step. Undo each layer in the reverse order.",
              "layers.hex contains the hexadecimal form of the Base64 encoding of the reversed FLAG.",
              "layers.hex",
              flag -> txt(hex(b64(reverse(flag))) + "\n")),
          new Seed(
              "r15",
              "반복 열쇠의 문",
              "REVERSING",
              "NORMAL",
              300,
              "키 \"key\" 가 글자마다 순환 적용돼요. k-e-y-k-e-y…",
              "세 글자짜리 열쇠로 XOR 한 암호문 파일이에요. 열쇠 단어는 알고 있다네요!",
              "cipher.hex",
              flag -> txt(xorHex(flag, "key") + "\n")),
          new Seed(
              "r16",
              "길이가 힌트",
              "REVERSING",
              "NORMAL",
              300,
              "이동량 [3,1,4,1,5] 순환! 보이는 영역 32~126 을 순환한다는 점 주의.",
              "자리마다 다른 이동량으로 밀린 텍스트 파일이에요. 키 숫자열은 3,1,4,1,5 라는 힌트가 있어요.",
              "shifted.txt",
              flag -> txt(positionalShift(flag, new int[] {3, 1, 4, 1, 5}) + "\n")),

          // ───────────────────────────── REVERSING · ADVANCED (3)

          new Seed(
              "r14",
              "어셈블리 맛보기",
              "REVERSING",
              "ADVANCED",
              600,
              "out[i] = in[i] + i 규칙이라면, 되돌릴 땐 i 를 빼면 돼요!",
              "루프 의사코드와 그 출력(hex)이 담긴 파일이에요. i번째 바이트에 i를 더했다고 하네요. 되돌려 보세요!",
              "loop-output.hex",
              flag -> txt(indexAddHex(flag) + "\n")),
          new Seed(
              "r17",
              "두 라운드의 관문",
              "REVERSING",
              "ADVANCED",
              600,
              "역산 순서는 '마지막 연산부터': -덧셈 → XOR. 키 순환도 라운드별로 달라요!",
              "gate.py 검증기와 기대 출력이 담긴 파일을 입수했어요. 두 라운드의 XOR+덧셈을 역산하는 스크립트를 짜 보세요. 키는 gate7!",
              "gate.py",
              flag -> pyGateScript(twoRoundTransform(flag, "gate7"))),
          new Seed(
              "r19",
              "나만의 베이스64",
              "REVERSING",
              "ADVANCED",
              600,
              "암호문 글자를 '사용표' 위치에서 찾아 '표준표' 같은 위치 글자로 바꾼 뒤 표준 디코딩!",
              "알파벳 순서를 바꿔치기한 Base64 표로 인코딩된 파일이에요. 두 표가 함께 동봉되어 있습니다!",
              "custom-b64.txt",
              flag ->
                  txt(
                      "표준표: "
                          + STANDARD_ALPHABET
                          + "\n사용표 : "
                          + CUSTOM_ALPHABET
                          + "\n암호문 : "
                          + mapAlphabet(b64(flag))
                          + "\n")),

          // ───────────────────────────── REVERSING · EXPERT (2)

          new Seed(
              "r18",
              "예측 가능한 무작위",
              "REVERSING",
              "EXPERT",
              1000,
              "같은 시드로 키 스트림을 재생성해 XOR! LCG 는 시드만 있으면 100% 재현돼요.",
              "LCG 난수로 만든 암호문 파일이에요. 시드와 생성 공식까지 친절히 적혀 있다네요. 재현해서 풀어보세요!",
              "lcg-cipher.txt",
              flag ->
                  txt(
                      "x0 = 20260826\nx(n+1) = (x(n) * 1103515245 + 12345) mod 67108864\n키스트림: x mod 256\ncipher_hex = "
                          + xorBytesHex(flag, lcgStream(20260826L, flag.length()))
                          + "\n")),
          new Seed(
              "r20",
              "최소 가상 머신",
              "REVERSING",
              "EXPERT",
              1000,
              "명령을 거꾸로: XOR k → -k → 뒤집기! 프로그램을 역순으로 되감으세요.",
              "명령 세 개짜리 초미니 VM의 프로그램과 출력이 담긴 파일이에요. 명령을 역순으로 되감아 원래 입력을 복원하세요!",
              "vm-program.txt",
              flag -> {
                int[] program = {3, 1, 5, 2, 42};
                return txt(
                    "명령어:\n3       : 바이트 순서 뒤집기\n1 k     : 모든 바이트에 k 더하기 (mod 256)\n2 k     : 모든 바이트와 k XOR\n\nprogram = "
                        + joinInts(program)
                        + "\noutput  = "
                        + vmRun(flag, program)
                        + "\n");
              })));
    addExpandedSeeds(seeds, "WEB", "w");
    addExpandedSeeds(seeds, "FORENSIC", "f");
    addExpandedSeeds(seeds, "REVERSING", "r");
    return List.copyOf(seeds);
  }

  /**
   * 3개 분야에 각 35개(첫걸음 5 / 쉬움 10 / 보통 10 / 어려움 5 / 도전 5)를 더한다.
   * 개별 파일과 지문은 번호·분야·변환법에 맞춰 생성되어 기존 문제와 같은 오프라인 풀이 흐름을 유지한다.
   */
  private static void addExpandedSeeds(List<Seed> seeds, String category, String prefix) {
    String[] difficulties = {
      "BEGINNER", "EASY", "NORMAL", "ADVANCED", "EXPERT"
    };
    int[] counts = {5, 10, 10, 5, 5};
    int[] scores = {50, 150, 300, 600, 1000};
    String[] levelNames = {"첫걸음", "쉬움", "보통", "어려움", "도전"};
    String[] methods = {"Base64", "16진수", "문자 뒤집기", "ROT13", "HTML 엔터티", "XOR 7", "줄 끝 공백", "문자 코드"};
    int number = 1;
    for (int level = 0; level < difficulties.length; level++) {
      for (int index = 0; index < counts[level]; index++, number++) {
        String method = methods[(number - 1) % methods.length];
        String topic = categoryTopic(category, number);
        String title = topic + " " + levelNames[level] + " " + String.format("%02d", index + 1);
        String key = prefix + "x" + String.format("%02d", number);
        String description =
            "%s 자료에서 %s로 감춰진 확인 코드를 찾는 연습이에요. 파일을 열고, 설명에 나온 단서를 한 단계씩 따라가 보세요."
                .formatted(topic, method);
        String hint =
            "%s 방식이에요. 파일에서 규칙에 맞는 문자열을 먼저 찾은 뒤, 변환 도구나 간단한 스크립트로 원문을 확인하세요."
                .formatted(method);
        seeds.add(
            new Seed(
                key,
                title,
                category,
                difficulties[level],
                scores[level],
                hint,
                description,
                key + ".txt",
                flag -> expandedArtifact(method, category, flag)));
      }
    }
  }

  private static String categoryTopic(String category, int number) {
    String[] web = {"공개 소스의 메모", "요청 기록의 단서", "브라우저 저장소", "응답 헤더", "배포 파일 점검", "URL 매개변수", "쿠키 흔적", "프런트 코드 읽기"};
    String[] forensic = {"사진 파일의 꼬리", "로그의 시간표", "메모리 조각", "문서 메타데이터", "네트워크 캡처", "압축 파일의 흔적", "삭제된 메모", "파일 시그니처"};
    String[] reversing = {"비교 함수 읽기", "문자열 테이블", "바이트 연산", "입력 검증 루틴", "간단한 난독화", "조건 분기", "변환 함수", "작은 가상 머신"};
    String[] source = switch (category) { case "WEB" -> web; case "FORENSIC" -> forensic; default -> reversing; };
    return source[(number - 1) % source.length];
  }

  private static byte[] expandedArtifact(String method, String category, String flag) {
    String prefix = "# " + category + " training artifact\\n# 필요한 변환: " + method + "\\n\\n";
    return switch (method) {
      case "Base64" -> txt(prefix + "payload = " + b64(flag) + "\\n");
      case "16진수" -> txt(prefix + "payload_hex = " + hex(flag) + "\\n");
      case "문자 뒤집기" -> txt(prefix + "payload_reversed = " + reverse(flag) + "\\n");
      case "ROT13" -> txt(prefix + "payload_rot13 = " + rot13(flag) + "\\n");
      case "HTML 엔터티" -> txt(prefix + "payload_entity = " + htmlEntities(flag) + "\\n");
      case "XOR 7" -> txt(prefix + "key = 7\\npayload_hex = " + xorHex(flag, "\\u0007") + "\\n");
      case "줄 끝 공백" -> spaceStego(flag);
      default -> txt(prefix + "character_codes = " + joinInts(charCodes(flag)) + "\\n");
    };
  }

  // ───────────────────────────── 변환·파일 헬퍼 ─────────────────────────────

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

  private static byte[] txt(String value) {
    return utf8(value);
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
    byte[] raw = utf8(value);
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

  private static String mapAlphabet(String standardBase64) {
    StringBuilder out = new StringBuilder();
    for (char c : standardBase64.toCharArray()) {
      int index = STANDARD_ALPHABET.indexOf(c);
      out.append(index >= 0 ? CUSTOM_ALPHABET.charAt(index) : c);
    }
    return out.toString();
  }

  /** 초미니 VM 실행기. program은 왼쪽부터 읽는다. 3은 뒤집기(단항), 1 k는 더하기, 2 k는 XOR이므로 1/2 뒤에는 항상 인수가 따라온다. */
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

  private static byte[] pageHtmlWithComment(String flag) {
    return utf8(
        "<!DOCTYPE html>\n<html>\n<head><title>우리 팀 소개</title></head>\n<body>\n<h1>우리 팀 소개</h1>\n<p>함께 일해요!</p>\n<!-- TODO: 아래 줄은 배포 전에 지우기 -->\n<!-- FLAG: "
            + flag
            + " -->\n</body>\n</html>\n");
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
    String prefix = "CTF{w12";
    String body = flag.startsWith(prefix) ? flag.substring(prefix.length()) : flag;
    String mid = body.endsWith("}") ? body.substring(0, body.length() - 1) : body;
    String inner =
        "var head=\"CTF{w12\";var rest=String.fromCharCode("
            + joinInts(charCodes(mid))
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
