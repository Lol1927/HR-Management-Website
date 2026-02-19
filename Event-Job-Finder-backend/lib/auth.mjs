/**
 * Cognito claims에서 userId(sub)를 추출한다.
 * 로컬 개발(serverless-offline) 환경에서는 mock userId를 반환한다.
 */
export function getUserId(event) {
  // serverless-offline 로컬 개발 모드
  if (process.env.IS_OFFLINE === "true") {
    return "local-test-user";
  }

  const claims = event.requestContext?.authorizer?.claims;
  if (!claims || !claims.sub) {
    return null;
  }
  return claims.sub;
}
