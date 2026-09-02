package com.minictf.common;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/** Lightweight, local moderation for account IDs and display names. */
@Component
public class AccountNameSafety {
  private static final List<Pattern> ABUSIVE_PATTERNS =
      List.of(
          Pattern.compile(
              "(?:fuck|shit|bitch|bastard|asshole|dick|cock|cunt|nigg(?:a|er)?|faggot|retard|slut|whore)"),
          Pattern.compile("(?:씨발|시발|ㅅㅂ|ㅆㅂ|병신|ㅂㅅ|좆|조까|개새끼|개새|새끼|지랄|느금마|엠창|창녀|걸레|보지|자지)"),
          Pattern.compile(
              "(?:할아버지|할머니|할아범|할마님|아버지|어머니|아빠|엄마|부모|부모님|형|누나|언니|오빠|동생|남동생|여동생|삼촌|숙모|이모|고모|외삼촌|조카|사촌|남편|아내|부부|딸|아들|손자|손녀|가족|친척|시아버지|시어머니|장인|장모|며느리|사위|아저씨|아주머니|어르신|아기|애기)"),
          Pattern.compile(
              "(?:grandfather|grandmother|grandpa|grandma|granddad|granny|father|mother|dad|mom|mum|daddy|mommy|papa|mama|brother|sister|sibling|uncle|aunt|cousin|nephew|niece|husband|wife|spouse|son|daughter|grandson|granddaughter|family|parent|child|children|baby|toddler)"),
          Pattern.compile(
              "(?:민준|서준|도윤|예준|시우|주원|하준|지호|준서|현우|도현|건우|우진|서진|민재|현준|연우|유준|정우|지훈|성민|준혁|민성|서연|서윤|지우|서현|하은|하윤|지민|지아|지유|민서|수아|지윤|윤서|채원|다은|은서|예은|시아|소율|지안|예린|지혜|소연|미영|영희|철수|영수|순자|명자|옥자|춘자)"),
          Pattern.compile(
              "(?:james|john|robert|michael|william|david|richard|joseph|thomas|charles|chris|daniel|matthew|anthony|mark|donald|steven|andrew|paul|joshua|kevin|brian|george|edward|jason|jeffrey|ryan|jacob|gary|nicholas|eric|jonathan|stephen|larry|justin|scott|brandon|benjamin|samuel|frank|raymond|jack|dennis|jerry|tyler|aaron|adam|nathan|henry|peter|kyle|noah|ethan|jeremy|walter|harold|carl|arthur|roger|keith|mary|patricia|jennifer|linda|elizabeth|barbara|susan|jessica|sarah|karen|lisa|nancy|betty|sandra|ashley|kimberly|emily|donna|michelle|amanda|melissa|stephanie|rebecca|laura|helen|sharon|cynthia|kathleen|amy|angela|brenda|pamela|emma|olivia|sophia|isabella|ava|mia|charlotte|amelia|harper|abigail|emily|ella|scarlett|grace|chloe|victoria|riley|lily|hannah|zoe|penelope|layla|nora|leah)"));

  public void requireSafe(String value) {
    if (value == null || value.isBlank()) return;
    String normalized = normalize(value);
    if (ABUSIVE_PATTERNS.stream().anyMatch(pattern -> pattern.matcher(normalized).find()))
      throw new UnsafeAccountNameException();
  }

  private String normalize(String value) {
    String folded = Normalizer.normalize(value, Normalizer.Form.NFKC).toLowerCase(Locale.ROOT);
    return folded
        .replace('@', 'a')
        .replace('4', 'a')
        .replace('0', 'o')
        .replace('1', 'i')
        .replace('3', 'e')
        .replace('5', 's')
        .replace('7', 't')
        .replaceAll("[\\s_\\-./]", "")
        .replaceAll("(.)\\1{2,}", "$1$1");
  }

  public static class UnsafeAccountNameException extends RuntimeException {}
}
