package com.minictf.challenge;
import jakarta.validation.constraints.*;
public final class ChallengeDtos { private ChallengeDtos(){}
    public record Summary(Long id,String title,String category,String difficulty,int score,boolean solved,boolean artifactAvailable){}
    public record Detail(Long id,String title,String description,String category,String difficulty,int score,boolean solved,boolean artifactAvailable){}
    public record SubmitRequest(@NotBlank @Size(max=200) String flag){}
    public record SubmitResult(String result,int awardedScore){}
    public record AdminRequest(@NotBlank @Size(max=160)String title,@NotBlank String description,@NotBlank String category,@NotBlank String difficulty,@Min(1)int score,@NotBlank String flag,@Size(max=500)String artifactPath,boolean active){}
}
