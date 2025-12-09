import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

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

  // Fallback a request.url
  return request.nextUrl.origin;
}

// Rutas que requieren autenticación
const protectedRoutes = [
  '/home',
  '/contacts',
  '/portfolios',
  '/pipeline',
  '/teams',
  '/profile',
  '/admin',
  '/analytics',
  '/benchmarks',
  '/capacitaciones',
];

// Rutas públicas que no requieren autenticación
const publicRoutes = ['/', '/login', '/register'];

// ts-prune-ignore-next: Next.js middleware entrypoint discovered by filename
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const baseUrl = getBaseUrl(request);

  // Si es la página de login y ya hay cookie de sesión, redirigir fuera del login
  if (pathname === '/login') {
    const token = request.cookies.get('token')?.value;
    if (token) {
      try {
        const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);

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
      } catch {
        // Token inválido/expirado, limpiar cookie y continuar al login
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
    if (token) {
      try {
        const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);
        // Verificar que el token no haya expirado
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp >= now) {
          // Token válido y no expirado, redirigir a /home
          return NextResponse.redirect(new URL('/home', baseUrl));
        }
      } catch {
        // si el token es inválido/expirado, continuar al flujo normal (mostrar página pública)
      }
    }
  }

  // Si es una ruta pública, permitir acceso
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next();
  }

  // Si es una ruta protegida, verificar si hay token en las cookies
  const token = request.cookies.get('token')?.value;

  if (!token) {
    // Redirigir al login con la URL de destino completa (incluyendo query params)
    const loginUrl = new URL('/login', baseUrl);
    const fullPath = pathname + (request.nextUrl.search || '');
    loginUrl.searchParams.set('redirect', fullPath);
    return NextResponse.redirect(loginUrl);
  }

  // Validar el JWT
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';

    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

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
  } catch {
    // Limpiar cookie inválida
    const response = NextResponse.redirect(new URL('/login', baseUrl));
    response.cookies.delete('token');
    return response;
  }

  return NextResponse.next();
}

// ts-prune-ignore-next: Next.js middleware matcher consumed by framework
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
