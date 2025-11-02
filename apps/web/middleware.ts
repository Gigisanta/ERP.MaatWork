import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Rutas que requieren autenticación
const protectedRoutes = [
  '/contacts',
  '/portfolios',
  '/pipeline', 
  '/teams',
  '/profile',
  '/admin',
  '/analytics',
  '/benchmarks'
];

// Rutas públicas que no requieren autenticación
const publicRoutes = [
  '/',
  '/login',
  '/register'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Si es la página de login y ya hay cookie de sesión, redirigir fuera del login
  if (pathname === '/login') {
    const token = request.cookies.get('token')?.value;
    if (token) {
      try {
        const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
        const secret = new TextEncoder().encode(JWT_SECRET);
        await jwtVerify(token, secret);
        const redirect = request.nextUrl.searchParams.get('redirect') || '/';
        return NextResponse.redirect(new URL(redirect, request.url));
      } catch {
        // si el token es inválido/expirado, seguimos al login normal
      }
    }
  }

  // Si es una ruta pública, permitir acceso
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next();
  }
  
  // Si es una ruta protegida, verificar si hay token en las cookies
  const token = request.cookies.get('token')?.value;
  
  if (!token) {
    // Redirigir al login con la URL de destino completa (incluyendo query params)
    const loginUrl = new URL('/login', request.url);
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
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('token');
      return response;
    }
    
  } catch (error) {
    // Limpiar cookie inválida
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    return response;
  }
  
  return NextResponse.next();
}

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
