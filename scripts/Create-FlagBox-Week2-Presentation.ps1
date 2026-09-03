$ErrorActionPreference = 'Stop'

$out = 'C:\Users\asus\Documents\FlagBox_2주차_구조_발표.pptx'
$logo = 'C:\Users\asus\mini-ctf\frontend\src\assets\flagbox-logo-transparent.png'
$pp = New-Object -ComObject PowerPoint.Application
$pp.Visible = -1
$pres = $pp.Presentations.Add()
$pres.PageSetup.SlideSize = 15 # wide screen

$W = 960; $H = 540
$navy = 0x1F2937; $blue = 0x2563EB; $sky = 0xDBEAFE; $mint = 0xD1FAE5; $purple = 0xEDE9FE; $orange = 0xFFEDD5; $slate = 0x64748B; $white = 0xFFFFFF; $line = 0x94A3B8

function Add-Text($slide, [string]$text, [float]$x, [float]$y, [float]$w, [float]$h, [int]$size=18, [int]$color=$navy, [bool]$bold=$false, [int]$align=1) {
  $shape = $slide.Shapes.AddTextbox(1,$x,$y,$w,$h)
  $shape.TextFrame.TextRange.Text = $text
  $shape.TextFrame.TextRange.Font.Name = 'Malgun Gothic'
  $shape.TextFrame.TextRange.Font.Size = $size
  $shape.TextFrame.TextRange.Font.Color.RGB = $color
  $shape.TextFrame.TextRange.Font.Bold = [int]$bold
  $shape.TextFrame.TextRange.ParagraphFormat.Alignment = $align
  $shape.TextFrame.MarginLeft=2; $shape.TextFrame.MarginRight=2; $shape.TextFrame.MarginTop=1; $shape.TextFrame.MarginBottom=1
  return $shape
}
function Add-Box($slide,[string]$title,[string]$body,[float]$x,[float]$y,[float]$w,[float]$h,[int]$fill,[int]$accent=$blue) {
  $s = $slide.Shapes.AddShape(5,$x,$y,$w,$h)
  $s.Fill.ForeColor.RGB=$fill; $s.Line.ForeColor.RGB=$accent; $s.Line.Weight=1.4
  $s.TextFrame.TextRange.Text = "$title`n$body"
  $s.TextFrame.TextRange.Font.Name='Malgun Gothic'; $s.TextFrame.TextRange.Font.Size=15; $s.TextFrame.TextRange.Font.Color.RGB=$navy
  $s.TextFrame.TextRange.Paragraphs(1).Font.Bold=-1; $s.TextFrame.TextRange.Paragraphs(1).Font.Size=18
  $s.TextFrame.TextRange.ParagraphFormat.Alignment=2
  $s.TextFrame.VerticalAnchor=3
  return $s
}
function Add-Arrow($slide,[float]$x1,[float]$y1,[float]$x2,[float]$y2,[string]$label='') {
  $l=$slide.Shapes.AddLine($x1,$y1,$x2,$y2); $l.Line.ForeColor.RGB=$blue; $l.Line.Weight=2.2; $l.Line.EndArrowheadStyle=3
  if($label){ Add-Text $slide $label (($x1+$x2)/2-35) (($y1+$y2)/2-15) 70 18 11 $blue $true 2 | Out-Null }
}
function Header($slide,[string]$num,[string]$title,[string]$sub){
  $bg=$slide.Background.Fill; $bg.Solid(); $bg.ForeColor.RGB=$white
  Add-Text $slide $num 40 28 58 28 15 $blue $true 1 | Out-Null
  Add-Text $slide $title 40 55 760 40 28 $navy $true 1 | Out-Null
  Add-Text $slide $sub 42 99 800 24 13 $slate $false 1 | Out-Null
  $bar=$slide.Shapes.AddShape(1,40,130,880,2); $bar.Fill.ForeColor.RGB=$sky; $bar.Line.Visible=0
  if(Test-Path $logo){ $slide.Shapes.AddPicture($logo,$false,$true,850,30,70,70) | Out-Null }
}

# Slide 1
$s=$pres.Slides.Add(1,12); Header $s '01' '시스템 구조 및 사용자 흐름' '웹 클라이언트–API–데이터베이스를 분리하고, 분석 기능은 내부 서비스로 확장 가능한 구조'
Add-Text $s '서비스 구조' 45 150 150 25 16 $navy $true 1 | Out-Null
Add-Box $s '사용자' 'PC · Mobile Browser' 50 190 145 72 $orange
Add-Box $s 'Frontend' 'React · TypeScript · Vite`n화면 / 상태 / API 호출' 250 180 180 92 $sky
Add-Box $s 'Backend API' 'Spring Boot · Security`n인증 / 문제 / 제출 / 랭킹' 495 180 190 92 $mint
Add-Box $s 'PostgreSQL' '사용자 · 문제 · 제출·풀이`n커뮤니티 · 운영 로그' 750 180 160 92 $purple
Add-Box $s 'FastAPI (Internal)' 'Artifact 분석`n향후 격리 실행 환경' 505 318 170 68 0xF1F5F9
Add-Arrow $s 195 226 250 226 '① 요청'
Add-Arrow $s 430 226 495 226 '② REST API'
Add-Arrow $s 685 226 750 226 '③ 저장·조회'
Add-Arrow $s 590 272 590 318 '내부 호출'
Add-Text $s '핵심 사용자 흐름' 45 414 160 25 16 $navy $true 1 | Out-Null
$flow=@('로그인','문제 조회','FLAG 제출','정답 검증','점수·랭킹 반영')
for($i=0;$i -lt $flow.Count;$i++){
  $x=45+$i*175; $fill=@($sky,$sky,$orange,$mint,$purple)[$i]
  $b=Add-Box $s ("$($i+1). " + $flow[$i]) '' $x 452 142 45 $fill
  if($i -lt 4){ Add-Arrow $s ($x+142) 474 ($x+172) 474 }
}
Add-Text $s '※ 인증·권한 검증과 제출 이력 저장은 Backend에서 처리하며, 분석 서비스는 브라우저에 직접 노출하지 않습니다.' 45 510 850 18 11 $slate $false 1 | Out-Null

# Slide 2
$s=$pres.Slides.Add(2,12); Header $s '02' 'DB 구조 및 FLAG 제출 흐름' '핵심 엔티티의 관계와 트랜잭션 기반 점수 반영 흐름'
Add-Text $s '핵심 DB 관계' 45 150 160 25 16 $navy $true 1 | Out-Null
Add-Box $s 'users' 'id (PK)`nusername · role · score' 55 190 165 82 $sky
Add-Box $s 'challenges' 'id (PK)`ntitle · category · score' 390 190 180 82 $mint
Add-Box $s 'submissions' 'user_id (FK)`nchallenge_id (FK) · is_correct' 235 315 190 82 $orange
Add-Box $s 'solves' 'user_id (FK)`nchallenge_id (FK) · solved_at`nUNIQUE(user, challenge)' 490 315 205 82 $purple
Add-Box $s 'oauth_accounts' 'user_id (FK)`nprovider · provider_subject' 55 315 165 66 0xF1F5F9
Add-Box $s 'community / logs' 'posts · comments · reactions`naudit · security · anti-cheat' 735 315 175 82 0xF1F5F9
Add-Arrow $s 220 230 390 230 '1 : N'
Add-Arrow $s 137 272 137 315 '1 : N'
Add-Arrow $s 160 272 300 315 '1 : N'
Add-Arrow $s 480 272 585 315 '1 : N'
Add-Arrow $s 695 355 735 355 '확장'
Add-Text $s 'FLAG 제출 데이터 흐름' 45 420 190 25 16 $navy $true 1 | Out-Null
$dbflow=@('FLAG 입력','submissions 기록','정답 검증','solves 생성','users.score·랭킹 갱신')
for($i=0;$i -lt $dbflow.Count;$i++){
 $x=45+$i*175; $fill=@($orange,$orange,$mint,$purple,$sky)[$i]
 Add-Box $s ("$($i+1). " + $dbflow[$i]) '' $x 458 142 43 $fill | Out-Null
 if($i -lt 4){ Add-Arrow $s ($x+142) 479 ($x+172) 479 }
}
Add-Text $s '최초 정답만 solves에 저장되도록 UNIQUE 제약조건과 트랜잭션을 사용하여, 중복·동시 제출에도 점수가 한 번만 반영됩니다.' 45 512 860 16 11 $slate $false 1 | Out-Null

$pres.SaveAs($out)
$pres.Close()
$pp.Quit()
[Runtime.Interopservices.Marshal]::ReleaseComObject($pp) | Out-Null
Write-Output $out
