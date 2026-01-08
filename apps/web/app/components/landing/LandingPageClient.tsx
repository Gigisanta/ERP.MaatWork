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
export function ContactForm() {
  return (
    <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
          Nombre y Apellido <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          required
          className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
          placeholder="Tu nombre completo"
        />
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5">
          Celular <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          id="phone"
          required
          className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
          placeholder="+54 9 ..."
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          required
          className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
          placeholder="tu@email.com"
        />
      </div>

      {/* Interest Select */}
      <div>
        <label htmlFor="interest" className="block text-sm font-medium text-slate-700 mb-1.5">
          Me interesa principalmente
        </label>
        <select
          id="interest"
          className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all text-slate-600"
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
          className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-violet-200 transition-transform active:scale-[0.98]"
        >
          Solicitar Contacto
        </Button>
      </div>
    </form>
  );
}
