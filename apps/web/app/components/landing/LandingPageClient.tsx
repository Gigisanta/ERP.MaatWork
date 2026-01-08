'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@maatwork/ui';
import { Menu, X } from 'lucide-react';

/**
 * LandingPageHeader - Client component for interactive header functionality
 * Handles mobile menu toggle and smooth scrolling
 */
export function LandingPageHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-8">
        <button
          onClick={() => scrollToSection('inicio')}
          className="text-sm font-medium text-slate-600 hover:text-violet-600 transition-colors"
        >
          Inicio
        </button>
        <button
          onClick={() => scrollToSection('servicios')}
          className="text-sm font-medium text-slate-600 hover:text-violet-600 transition-colors"
        >
          Servicios
        </button>
        <button
          onClick={() => scrollToSection('nosotros')}
          className="text-sm font-medium text-slate-600 hover:text-violet-600 transition-colors"
        >
          Nosotros
        </button>
        <button
          onClick={() => scrollToSection('contacto')}
          className="text-sm font-medium text-slate-600 hover:text-violet-600 transition-colors"
        >
          Contacto
        </button>
      </nav>

      {/* CTA Button */}
      <div className="hidden md:flex items-center gap-4">
        <Link href="/login">
          <Button
            variant="outline"
            size="sm"
            className="border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-300"
          >
            Login
          </Button>
        </Link>
        <Button
          variant="primary"
          size="sm"
          className="bg-violet-600 hover:bg-violet-700 text-white border-transparent shadow-md hover:shadow-lg transition-all"
          onClick={() => scrollToSection('contacto')}
        >
          EMPEZÁ HOY
        </Button>
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-slate-600 hover:text-violet-600 p-2"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-slate-100 py-4 px-4 shadow-lg absolute w-full left-0 top-16 sm:top-20 z-50">
          <div className="flex flex-col gap-4">
            <button
              onClick={() => scrollToSection('inicio')}
              className="text-left font-medium text-slate-600 hover:text-violet-600 py-2"
            >
              Inicio
            </button>
            <button
              onClick={() => scrollToSection('servicios')}
              className="text-left font-medium text-slate-600 hover:text-violet-600 py-2"
            >
              Servicios
            </button>
            <button
              onClick={() => scrollToSection('nosotros')}
              className="text-left font-medium text-slate-600 hover:text-violet-600 py-2"
            >
              Nosotros
            </button>
            <button
              onClick={() => scrollToSection('contacto')}
              className="text-left font-medium text-slate-600 hover:text-violet-600 py-2"
            >
              Contacto
            </button>
            <div className="flex flex-col gap-3 pt-2">
              <Link href="/login" className="w-full">
                <Button
                  variant="outline"
                  className="w-full justify-center border-violet-200 text-violet-700 hover:bg-violet-50"
                >
                  Login
                </Button>
              </Link>
              <Button
                variant="primary"
                className="w-full justify-center bg-violet-600 hover:bg-violet-700 text-white border-transparent shadow-md"
                onClick={() => scrollToSection('contacto')}
              >
                EMPEZÁ HOY
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * ScrollButton - Client component for scroll-to-section buttons
 */
export function ScrollButton({
  targetId,
  children,
  className,
  variant = 'primary',
  size = 'lg',
}: {
  targetId: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'outline';
  size?: 'sm' | 'lg';
}) {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => scrollToSection(targetId)}
    >
      {children}
    </Button>
  );
}

/**
 * LogoScrollTop - Client component for logo click-to-top
 */
export function LogoScrollTop({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-2 cursor-pointer"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      {children}
    </div>
  );
}

/**
 * FooterNav - Client component for footer navigation scroll buttons
 */
export function FooterNav() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <ul className="space-y-3 text-sm">
      <li>
        <button
          onClick={() => scrollToSection('inicio')}
          className="hover:text-violet-500 transition-colors"
        >
          Inicio
        </button>
      </li>
      <li>
        <button
          onClick={() => scrollToSection('servicios')}
          className="hover:text-violet-500 transition-colors"
        >
          Servicios
        </button>
      </li>
      <li>
        <button
          onClick={() => scrollToSection('nosotros')}
          className="hover:text-violet-500 transition-colors"
        >
          Nosotros
        </button>
      </li>
      <li>
        <button
          onClick={() => scrollToSection('contacto')}
          className="hover:text-violet-500 transition-colors"
        >
          Contacto
        </button>
      </li>
    </ul>
  );
}

/**
 * ContactForm - Client component for the contact form
 */
/**
 * ContactForm - Client component for the contact form
 */
export function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      interest: formData.get('interest'),
    };

    try {
      // Use config.apiUrl if available, otherwise fallback to relative path or default
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      const response = await fetch(`${apiUrl}/v1/public/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Error al enviar el formulario');
      }

      setSuccess(true);
    } catch (err) {
      setError('Hubo un error al enviar tu consulta. Por favor intenta nuevamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-8 text-center animate-fade-in-up">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">¡Mensaje enviado!</h3>
        <p className="text-slate-600">
          Gracias por contactarnos. Un asesor se comunicará contigo a la brevedad.
        </p>
        <Button
          variant="outline"
          className="mt-6 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
          onClick={() => setSuccess(false)}
        >
          Enviar otra consulta
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm animate-fade-in-up">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
          Nombre y Apellido <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
          placeholder="Tu nombre completo"
          disabled={loading}
        />
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5">
          Celular <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          required
          className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
          placeholder="+54 9 ..."
          disabled={loading}
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
          placeholder="tu@email.com"
          disabled={loading}
        />
      </div>

      {/* Interest Select */}
      <div>
        <label htmlFor="interest" className="block text-sm font-medium text-slate-700 mb-1.5">
          Me interesa principalmente
        </label>
        <select
          id="interest"
          name="interest"
          className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all text-slate-600"
          disabled={loading}
        >
          <option value="inversiones">Inversiones Generales</option>
          <option value="cash-management">Cash Management (Empresas)</option>
          <option value="retiro">Planificación de Retiro</option>
          <option value="otro">Otro</option>
        </select>
      </div>

      <div className="pt-4">
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-violet-200 transition-transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Enviando...
            </>
          ) : (
            'Solicitar Contacto'
          )}
        </Button>
        <p className="text-center text-xs text-slate-400 mt-4 flex items-center justify-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          Tus datos están protegidos. No compartimos tu información.
        </p>
      </div>
    </form>
  );
}
