// Cognito 설정
export const COGNITO_CONFIG = {
  userPoolId: "us-east-2_O2UTsOAjY",
  clientId: "59aarnsh97bmemse72b5golal8",
  domain: "job-finder-dev-014403175070.auth.us-east-2.amazoncognito.com",
  get redirectUri() { return window.location.origin + "/callback"; },
  get logoutUri() { return window.location.origin; },
};

export const API_BASE =
  "https://mcxonovikd.execute-api.us-east-2.amazonaws.com/dev";

// 토큰 localStorage 키
const TOKEN_KEY = "cognito_id_token";
const REFRESH_KEY = "cognito_refresh_token";

export function getIdToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setTokens(idToken: string, refreshToken?: string): void {
  localStorage.setItem(TOKEN_KEY, idToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_KEY, refreshToken);
  }
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// Cognito Hosted UI URL 생성
export function getLoginUrl(): string {
  const params = new URLSearchParams({
    client_id: COGNITO_CONFIG.clientId,
    response_type: "code",
    scope: "openid email profile",
    redirect_uri: COGNITO_CONFIG.redirectUri,
  });
  return `https://${COGNITO_CONFIG.domain}/login?${params.toString()}`;
}

export function getLogoutUrl(): string {
  const params = new URLSearchParams({
    client_id: COGNITO_CONFIG.clientId,
    logout_uri: COGNITO_CONFIG.logoutUri,
  });
  return `https://${COGNITO_CONFIG.domain}/logout?${params.toString()}`;
}

// Authorization code → 토큰 교환
export async function exchangeCodeForTokens(
  code: string,
): Promise<{ id_token: string; refresh_token?: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: COGNITO_CONFIG.clientId,
    code,
    redirect_uri: COGNITO_CONFIG.redirectUri,
  });

  const res = await fetch(
    `https://${COGNITO_CONFIG.domain}/oauth2/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${text}`);
  }

  return res.json();
}
