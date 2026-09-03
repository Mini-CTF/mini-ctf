$ErrorActionPreference='Stop'
$src='C:\Users\asus\OneDrive\바탕 화면\FalgBox.pptx'
$out='C:\Users\asus\Documents\FalgBox_구조도_추가본.pptx'
$pp=New-Object -ComObject PowerPoint.Application
$pp.Visible=-1
$p=$pp.Presentations.Open($src,$false,$false,$false)

function T($slide,$text,$x,$y,$w,$h,$size=20,$bold=$false,$color=0x000000){
 $s=$slide.Shapes.AddTextbox(1,$x,$y,$w,$h); $s.TextFrame.TextRange.Text=$text
 $s.TextFrame.TextRange.Font.Name='Malgun Gothic'; $s.TextFrame.TextRange.Font.Size=$size; $s.TextFrame.TextRange.Font.Bold=[int]$bold; $s.TextFrame.TextRange.Font.Color.RGB=$color
 $s.TextFrame.MarginLeft=0; $s.TextFrame.MarginRight=0; $s.TextFrame.VerticalAnchor=3; return $s
}
function B($slide,$title,$body,$x,$y,$w,$h,$fill){
 $s=$slide.Shapes.AddShape(5,$x,$y,$w,$h);$s.Fill.ForeColor.RGB=$fill;$s.Line.ForeColor.RGB=0x333333;$s.Line.Weight=1.2
 $s.TextFrame.TextRange.Text="$title`n$body";$s.TextFrame.TextRange.Font.Name='Malgun Gothic';$s.TextFrame.TextRange.Font.Size=13;$s.TextFrame.TextRange.Font.Bold=0;$s.TextFrame.TextRange.Font.Color.RGB=0x111111
 $s.TextFrame.TextRange.Paragraphs(1).Font.Bold=-1;$s.TextFrame.TextRange.Paragraphs(1).Font.Size=16;$s.TextFrame.TextRange.ParagraphFormat.Alignment=2;$s.TextFrame.VerticalAnchor=3;return $s
}
function A($slide,$x1,$y1,$x2,$y2,$label=''){
 $l=$slide.Shapes.AddLine($x1,$y1,$x2,$y2);$l.Line.ForeColor.RGB=0xFF5733;$l.Line.Weight=2;$l.Line.EndArrowheadStyle=3
 if($label){T $slide $label (($x1+$x2)/2-25) (($y1+$y2)/2-12) 60 16 10 $true 0xFF5733|Out-Null}
}
function Base($source,$position){
 $r=$source.Duplicate();$s=$r.Item(1);$s.MoveTo($position)
 for($i=$s.Shapes.Count;$i -ge 1;$i--){$sh=$s.Shapes.Item($i);if($sh.HasTextFrame -eq -1 -and $sh.TextFrame.HasText -eq -1){$sh.Delete()}}
 return $s
}

# Insert before current "개선할 점 및 피드백" slide.
$template=$p.Slides.Item(7)
$s1=Base $template 7
T $s1 '03' 70 138 100 42 28 $false 0xB0B0B0|Out-Null
T $s1 '시스템 구조 및 흐름' 70 185 650 58 36 $true|Out-Null
T $s1 '사용자 요청부터 정답 처리·랭킹 반영까지의 서비스 흐름' 70 245 680 25 15 $false 0x555555|Out-Null
B $s1 '사용자' 'PC / Mobile Browser' 92 300 135 68 0xFFF2E8|Out-Null
B $s1 'Frontend' 'React · TypeScript`n화면 / API 호출' 270 288 160 92 0xE6F1FF|Out-Null
B $s1 'Backend API' 'Spring Boot`n인증 · 문제 · 제출 · 랭킹' 480 288 180 92 0xE9F8EE|Out-Null
B $s1 'PostgreSQL' '사용자 · 문제 · 제출·풀이`n커뮤니티 · 로그' 710 288 165 92 0xF0E9FF|Out-Null
B $s1 'FastAPI 내부 서비스' 'Artifact 분석 · 향후 격리 실행' 495 420 170 52 0xF1F1F1|Out-Null
A $s1 227 334 270 334 '① 요청';A $s1 430 334 480 334 '② API';A $s1 660 334 710 334 '③ DB';A $s1 580 380 580 420 '내부' 
T $s1 '흐름: 로그인 → 문제 조회 → FLAG 제출 → 정답 검증 → 점수·랭킹 반영' 92 500 780 25 17 $true 0x333333|Out-Null

$s2=Base $template 8
T $s2 '04' 70 138 100 42 28 $false 0xB0B0B0|Out-Null
T $s2 'DB 구조 및 FLAG 제출 흐름' 70 185 700 58 36 $true|Out-Null
T $s2 '핵심 테이블 관계와 중복 점수 지급을 막는 데이터 처리 구조' 70 245 760 25 15 $false 0x555555|Out-Null
B $s2 'users' 'id · username · role · score' 90 300 150 63 0xE6F1FF|Out-Null
B $s2 'challenges' 'id · category · score · flag_hash' 390 300 180 63 0xE9F8EE|Out-Null
B $s2 'submissions' 'user_id · challenge_id`nis_correct · submitted_at' 255 405 175 70 0xFFF2E8|Out-Null
B $s2 'solves' 'user_id · challenge_id`nUNIQUE(user, challenge)' 490 405 185 70 0xF0E9FF|Out-Null
B $s2 'oauth_accounts' 'user_id · provider' 90 405 150 58 0xF1F1F1|Out-Null
B $s2 'community / logs' 'posts · comments · audit · security' 710 405 165 70 0xF1F1F1|Out-Null
A $s2 240 332 390 332 '1:N';A $s2 165 363 165 405 '1:N';A $s2 205 363 310 405 '1:N';A $s2 480 363 580 405 '1:N'
T $s2 'FLAG 흐름: 입력 → submissions 기록 → 정답 검증 → solves 생성 → users.score·랭킹 갱신' 90 500 800 25 16 $true 0x333333|Out-Null

$p.SaveAs($out)
$p.Close();$pp.Quit();[Runtime.Interopservices.Marshal]::ReleaseComObject($pp)|Out-Null
Write-Output $out
