package com.minictf.user;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

/** Minimal AWS Signature V4 client. It works with AWS S3 and S3-compatible MinIO endpoints. */
@Component
@ConditionalOnProperty(name = "app.profile.storage", havingValue = "s3")
public class S3AvatarStorage implements AvatarStorage {
  private static final DateTimeFormatter AMZ_TIME =
      DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);
  private static final DateTimeFormatter DATE =
      DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneOffset.UTC);
  private final HttpClient client = HttpClient.newHttpClient();
  private final URI endpoint;
  private final boolean virtualHosted;
  private final String bucket;
  private final String region;
  private final String accessKey;
  private final String secretKey;

  public S3AvatarStorage(
      @Value("${app.profile.s3.bucket}") String bucket,
      @Value("${app.profile.s3.region}") String region,
      @Value("${app.profile.s3.endpoint}") String configuredEndpoint,
      @Value("${app.profile.s3.access-key}") String accessKey,
      @Value("${app.profile.s3.secret-key}") String secretKey) {
    if (bucket.isBlank() || accessKey.isBlank() || secretKey.isBlank())
      throw new IllegalArgumentException("S3 avatar storage requires bucket and credentials");
    this.bucket = bucket;
    this.region = region;
    this.accessKey = accessKey;
    this.secretKey = secretKey;
    virtualHosted = configuredEndpoint.isBlank();
    endpoint =
        URI.create(
            virtualHosted
                ? "https://" + bucket + ".s3." + region + ".amazonaws.com"
                : configuredEndpoint.replaceAll("/+$", ""));
  }

  @Override
  public void store(String key, byte[] content, MediaType mediaType) {
    HttpResponse<byte[]> response = execute("PUT", objectUri(key), content, mediaType.toString());
    requireSuccess(response.statusCode(), "store");
  }

  @Override
  public AvatarAsset load(String key) {
    HttpResponse<byte[]> response = execute("GET", objectUri(key), new byte[0], null);
    if (response.statusCode() == 404) throw new LocalAvatarStorage.AvatarNotFoundException();
    requireSuccess(response.statusCode(), "load");
    String type = response.headers().firstValue("Content-Type").orElse(null);
    return new AvatarAsset(
        new ByteArrayResource(response.body()),
        type == null ? LocalAvatarStorage.mediaType(key) : MediaType.parseMediaType(type));
  }

  @Override
  public void delete(String key) {
    HttpResponse<byte[]> response = execute("DELETE", objectUri(key), new byte[0], null);
    if (response.statusCode() != 404) requireSuccess(response.statusCode(), "delete");
  }

  private URI objectUri(String key) {
    String encodedKey = key.replace(" ", "%20");
    String basePath =
        endpoint.getRawPath() == null ? "" : endpoint.getRawPath().replaceAll("/$", "");
    String path =
        virtualHosted ? basePath + "/" + encodedKey : basePath + "/" + bucket + "/" + encodedKey;
    return URI.create(endpoint.getScheme() + "://" + endpoint.getRawAuthority() + path);
  }

  private HttpResponse<byte[]> execute(String method, URI uri, byte[] body, String contentType) {
    try {
      Instant now = Instant.now();
      String amzTime = AMZ_TIME.format(now);
      String payloadHash = sha256(body);
      String host = uri.getRawAuthority();
      String canonicalHeaders =
          "host:"
              + host
              + "\n"
              + "x-amz-content-sha256:"
              + payloadHash
              + "\n"
              + "x-amz-date:"
              + amzTime
              + "\n";
      String signedHeaders = "host;x-amz-content-sha256;x-amz-date";
      String canonicalRequest =
          method
              + "\n"
              + uri.getRawPath()
              + "\n\n"
              + canonicalHeaders
              + "\n"
              + signedHeaders
              + "\n"
              + payloadHash;
      String scope = DATE.format(now) + "/" + region + "/s3/aws4_request";
      String stringToSign =
          "AWS4-HMAC-SHA256\n"
              + amzTime
              + "\n"
              + scope
              + "\n"
              + sha256(canonicalRequest.getBytes(StandardCharsets.UTF_8));
      byte[] signingKey =
          hmac(
              hmac(
                  hmac(
                      hmac(("AWS4" + secretKey).getBytes(StandardCharsets.UTF_8), DATE.format(now)),
                      region),
                  "s3"),
              "aws4_request");
      String authorization =
          "AWS4-HMAC-SHA256 Credential="
              + accessKey
              + "/"
              + scope
              + ", SignedHeaders="
              + signedHeaders
              + ", Signature="
              + HexFormat.of().formatHex(hmac(signingKey, stringToSign));
      HttpRequest.Builder request =
          HttpRequest.newBuilder(uri)
              .header("x-amz-date", amzTime)
              .header("x-amz-content-sha256", payloadHash)
              .header("Authorization", authorization);
      if (contentType != null) request.header("Content-Type", contentType);
      request.method(
          method,
          body.length == 0
              ? HttpRequest.BodyPublishers.noBody()
              : HttpRequest.BodyPublishers.ofByteArray(body));
      return client.send(request.build(), HttpResponse.BodyHandlers.ofByteArray());
    } catch (Exception ex) {
      throw new IllegalStateException("Could not access avatar object storage", ex);
    }
  }

  private static void requireSuccess(int status, String action) {
    if (status < 200 || status >= 300)
      throw new IllegalStateException(
          "Object storage could not " + action + " avatar (HTTP " + status + ")");
  }

  private static String sha256(byte[] value) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value));
    } catch (Exception ex) {
      throw new IllegalStateException(ex);
    }
  }

  private static byte[] hmac(byte[] key, String value) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(key, "HmacSHA256"));
      return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
    } catch (Exception ex) {
      throw new IllegalStateException(ex);
    }
  }
}
