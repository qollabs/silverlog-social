import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT, decodeJwt } from 'jose';

const accessSecret = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
);
const refreshSecret = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
);
const ACCESS_TTL = parseInt(process.env.JWT_ACCESS_TTL ?? '31536000', 10);

const ACCESS_COOKIE = 'sl_access';
const REFRESH_COOKIE = 'sl_refresh';

export async function middleware(req: NextRequest) {
  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;

  // Fast path: valid access token — nothing to do
  if (accessToken) {
    try {
      await jwtVerify(accessToken, accessSecret);
      return NextResponse.next();
    } catch {
      // Expired or invalid — fall through to refresh
    }
  }

  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return NextResponse.next();

  try {
    const { payload: rp } = await jwtVerify(refreshToken, refreshSecret);
    const userId = rp.userId as string;
    if (!userId) return NextResponse.next();

    // Recover name from the stale access token (decode without verification)
    let name = '';
    if (accessToken) {
      try {
        name = (decodeJwt(accessToken).name as string) ?? '';
      } catch {}
    }

    const newAccess = await new SignJWT({ userId, name })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TTL}s`)
      .sign(accessSecret);

    // Forward the new token to the route handler via the Cookie request header
    const requestHeaders = new Headers(req.headers);
    const existing = requestHeaders.get('cookie') ?? '';
    const stripped = existing
      .split(';')
      .map((c) => c.trim())
      .filter((c) => !c.startsWith(`${ACCESS_COOKIE}=`))
      .join('; ');
    requestHeaders.set('cookie', `${ACCESS_COOKIE}=${newAccess}${stripped ? `; ${stripped}` : ''}`);

    const response = NextResponse.next({ request: { headers: requestHeaders } });

    // Also set the cookie on the response so the browser updates it
    response.cookies.set(ACCESS_COOKIE, newAccess, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_TTL,
    });

    return response;
  } catch {
    // Refresh token invalid — let the route handler return 401 normally
    return NextResponse.next();
  }
}

export const config = {
  // Run on all routes except Next.js internals and static assets
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|fonts/).*)'],
};
