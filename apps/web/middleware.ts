import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { logger } from './lib/logger-server';

// AI_DECISION: Usar Node.js runtime en lugar de Edge
// Justificación: Edge Runtime inline variables de entorno en build-time
// Node.js runtime lee process.env en runtime, permitiendo acceso a JWT_SECRET
// Impacto: Middleware puede validar JWT con secreto configurado en PM2
export const runtime = 'nodejs';

/**
 * AI_DECISION: Construir URL base correcta para redirecciones
 * Justificación: Cuando Next.js corre detrás de un proxy (Nginx), request.url puede ser localhost
 * Impacto: Las redirecciones usan la URL pública correcta en lugar de localhost
 */
function getBaseUrl(request: NextRequest): string {
  // Usar headers del proxy si están disponibles
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'http';

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  // Fallback: usar Host header si está disponible (Cloudflare lo envía)
  const host = request.headers.get('host');
  if (host) {
    const proto = forwardedProto || request.headers.get('x-forwarded-proto') || 'https';
    return `${proto}://${host}`;
  }

  // Último fallback a request.url
  return request.nextUrl.origin;
}

// Rutas públicas que no requieren autenticación
// Nota: Todas las demás rutas están protegidas por defecto
const publicRoutes = ['/', '/login', '/register', '/icon', '/apple-icon'];

// Configuración de JWT (Sincronizado con apps/api/src/auth/jwt.ts)
const JWT_ISSUER = 'maatwork-api';
const JWT_AUDIENCE = 'maatwork-web';

/**
 * Get JWT secret key with proper error handling
 *
 * In production: Fails explicitly if JWT_SECRET is missing
 * In development: Uses fallback with warning
 */
function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret) {
    if (isProduction) {
      throw new Error(
        'CRITICAL: JWT_SECRET environment variable is required in production. Set it in your environment variables.'
      );
    }
    // Development fallback only - log warning for security awareness
    logger.warn(
      '[SECURITY WARNING] Using insecure JWT secret fallback. Set JWT_SECRET environment variable for production deployment.'
    );
    return new TextEncoder().encode('dev-insecure-secret-change-me');
  }

  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // AI_DECISION: Generar o propagar X-Request-ID para trazabilidad
  // Justificación: Permite correlacionar logs entre Middleware, Server Components y API
  let requestId = request.headers.get('x-request-id');
  if (!requestId) {
    requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  const baseUrl = getBaseUrl(request);
  const loggerContext = { requestId, pathname };

  // Si es la página de login
  if (pathname === '/login') {
    // AI_DECISION: Check for explicit unauthorized error param
    // Justificación: If Layout redirects here with ?error=unauthorized, it means the API rejected the token
    // Impacto: Forces cookie cleanup to break the infinite redirect loop
    const errorParam = request.nextUrl.searchParams.get('error');
    if (errorParam === 'unauthorized') {
      logger.warn('[Middleware] Detected unauthorized redirect loop - Clearing token cookie', {
        ...loggerContext,
      });

      // AI_DECISION: Redirect to clean /login instead of next()
      // Justificación: next() keeps the same request context (with old cookies) for the Server Component.
      //                Redirecting forces a fresh request where the browser has already removed the cookie.
      // Impacto: Completely breaks the loop by ensuring RootLayout sees no token.
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('token');
      return response;
    }

    const token = request.cookies.get('token')?.value;
    // LOGGING: Inspeccionar cookies entrantes en middleware
    logger.info('[Middleware] Checking login page access', {
      ...loggerContext,
      hasToken: !!token,
      cookieNames: request.cookies.getAll().map((c) => c.name),
    });
    if (token) {
      try {
        const secret = getSecretKey();
        const { payload } = await jwtVerify(token, secret, {
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
        });

        // Verificar que el token no haya expirado
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp >= now) {
          // Token válido y no expirado, redirigir a /home
          const redirect = request.nextUrl.searchParams.get('redirect') || '/home';
          return NextResponse.redirect(new URL(redirect, baseUrl));
        } else {
          // Token expirado, limpiar cookie
          const response = NextResponse.next();
          response.cookies.delete('token');
          return response;
        }
      } catch (err: unknown) {
        const error = err as Error & { code?: string };
        // Token inválido/expirado, limpiar cookie y continuar al login
        logger.warn('[Middleware] JWT verification failed for login page', {
          ...loggerContext,
          error: error.message,
          code: error.code,
        });
        const response = NextResponse.next();
        response.cookies.delete('token');
        return response;
      }
    }
  }

  // AI_DECISION: Redirigir usuarios autenticados desde `/` a `/home`
  // Justificación: Mejora UX evitando que usuarios autenticados vean el cartel de login innecesariamente
  // Impacto: Redirección automática en middleware (antes de renderizar) es más eficiente que en cliente
  if (pathname === '/') {
    const token = request.cookies.get('token')?.value;
    logger.info('[Middleware] Checking root access', {
      ...loggerContext,
      hasToken: !!token,
      cookieNames: request.cookies.getAll().map((c) => c.name),
    });
    if (token) {
      try {
        const secret = getSecretKey();
        const { payload } = await jwtVerify(token, secret, {
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
        });
        // Verificar que el token no haya expirado
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp >= now) {
          // Token válido y no expirado, redirigir a /home
          return NextResponse.redirect(new URL('/home', baseUrl));
        }
      } catch (err: unknown) {
        // si el token es inválido/expirado, continuar al flujo normal (mostrar página pública)
        const error = err as Error;
        logger.debug('[Middleware] JWT verification failed for root access', {
          ...loggerContext,
          error: error.message,
        });
      }
    }
  }

  // Si es una ruta pública, permitir acceso
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next();
  }

  // Si es una ruta protegida, verificar si hay token en las cookies
  const token = request.cookies.get('token')?.value;

  logger.info('[Middleware] Protected route check', {
    ...loggerContext,
    hasToken: !!token,
    cookieNames: request.cookies.getAll().map((c) => c.name),
  });

  if (!token) {
    // Redirigir al login con la URL de destino completa (incluyendo query params)
    const loginUrl = new URL('/login', baseUrl);
    const fullPath = pathname + (request.nextUrl.search || '');
    loginUrl.searchParams.set('redirect', fullPath);
    return NextResponse.redirect(loginUrl);
  }

  // Validar el JWT
  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    // Verificar que el token no haya expirado
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      // Limpiar cookie expirada
      const response = NextResponse.redirect(new URL('/login', baseUrl));
      response.cookies.delete('token');
      return response;
    }

    // AI_DECISION: Verificar rol admin para rutas /admin/*
    // Justificación: Protección proactiva en middleware evita que usuarios no-admin vean contenido admin temporalmente
    // Impacto: Usuarios sin rol admin son redirigidos inmediatamente a /home sin renderizar la página
    if (pathname.startsWith('/admin')) {
      const userRole = payload.role as string | undefined;
      if (userRole !== 'admin') {
        return NextResponse.redirect(new URL('/home', baseUrl));
      }
    }
  } catch (err: unknown) {
    const error = err as Error & { code?: string };
    // Token inválido - limpiar cookie y redirigir a login
    logger.warn('[Middleware] Protected route access failed - JWT invalid', {
      ...loggerContext,
      error: error.message,
      code: error.code,
    });
    const response = NextResponse.redirect(new URL('/login', baseUrl));
    response.cookies.delete('token');
    return response;
  }

  // Clonar headers para propagar x-request-id
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  // Continuar al siguiente paso con los headers actualizados
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // También añadirlo a la respuesta para debugging en el navegador
  response.headers.set('x-request-id', requestId);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - icon, apple-icon, favicon.ico, sw.js, manifest.json (PWA/static files)
     * - *.png, *.jpg, *.svg, *.ico (static images)
     *
     * AI_DECISION: Excluir archivos estáticos del middleware
     * Justificación: sw.js y manifest.json estaban siendo redirigidos a /login
     *                causando errores de Service Worker registration
     * Impacto: PWA funciona correctamente, archivos estáticos no pasan por auth
     */
    '/((?!api|_next/static|_next/image|icon|apple-icon|favicon.ico|sw.js|manifest.json|manifest.webmanifest|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)',
  ],
};
