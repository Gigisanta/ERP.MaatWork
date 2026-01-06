'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@maatwork/ui';
import {
  Feather,
  TrendingUp,
  Shield,
  DollarSign,
  ArrowRight,
  Menu,
  X,
  Mail,
  Phone,
  MapPin,
  Instagram,
  Linkedin,
} from 'lucide-react';

/**
 * LandingPage Component
 * Public presentation page for maat.work
 */
export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* Logo */}
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <Feather className="w-8 h-8 text-violet-600" strokeWidth={2} />
              <span className="text-xl sm:text-2xl font-bold tracking-tight">
                <span className="text-violet-700">Maat</span>
                <span className="text-slate-700">Work</span>
              </span>
            </div>

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
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-slate-100 py-4 px-4 shadow-lg absolute w-full z-50">
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
      </header>

      {/* Hero Section */}
      <section
        id="inicio"
        className="relative bg-slate-900 py-20 sm:py-32 text-white overflow-hidden"
      >
        {/* Abstract Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-violet-600/30 rounded-full blur-[100px] mix-blend-screen animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-[120px] mix-blend-screen"></div>
          <div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-blue-500/20 rounded-full blur-[80px] mix-blend-screen"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6 backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-violet-400"></span>
              <span className="text-sm font-medium text-violet-200">
                Gestión Patrimonial Profesional
              </span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6 tracking-tight">
              Te acompañamos <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-emerald-400">
                siempre
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-slate-300 mb-10 leading-relaxed max-w-2xl font-light">
              Sabemos lo valioso que es tu tiempo. Operá de forma ágil con un equipo de expertos
              dedicados a potenciar tu patrimonio.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-full px-8 py-6 text-lg border-transparent shadow-lg shadow-violet-900/20 transition-transform hover:scale-105"
                onClick={() => scrollToSection('contacto')}
              >
                Hablar con un asesor
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-slate-700 hover:bg-slate-800 text-white font-semibold rounded-full px-8 py-6 text-lg transition-all"
                onClick={() => scrollToSection('servicios')}
              >
                Conocer servicios
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicios" className="py-24 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-violet-600 font-semibold tracking-wider uppercase text-sm mb-2 block">
              Nuestros Servicios
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
              Soluciones Financieras
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
              Diseñamos estrategias a medida para cada etapa de tu vida financiera.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Service 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-violet-900/5 hover:-translate-y-1 transition-all duration-300 border border-slate-100 group">
              <div className="w-14 h-14 bg-violet-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-violet-100 transition-colors">
                <DollarSign className="w-7 h-7 text-violet-600" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-slate-900">Cash Management</h3>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Gestión de liquidez, inversiones en ARS y USD, coberturas, dolarizaciones y
                transferencias al exterior. Optimizamos tu flujo de caja con instrumentos seguros.
              </p>
              <button
                className="text-violet-600 font-semibold flex items-center gap-2 group-hover:gap-3 transition-all text-sm"
                onClick={() => scrollToSection('contacto')}
              >
                Empezar hoy <ArrowRight size={16} />
              </button>
            </div>

            {/* Service 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-violet-900/5 hover:-translate-y-1 transition-all duration-300 border border-slate-100 group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-emerald-500"></div>
              <div className="w-14 h-14 bg-violet-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-violet-100 transition-colors">
                <TrendingUp className="w-7 h-7 text-violet-600" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-slate-900">Capitalización</h3>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Planificación de largo plazo para alcanzar grandes objetivos. Estrategias de interés
                compuesto adaptadas a tu perfil de riesgo para maximizar rendimientos.
              </p>
              <button
                className="text-violet-600 font-semibold flex items-center gap-2 group-hover:gap-3 transition-all text-sm"
                onClick={() => scrollToSection('contacto')}
              >
                Empezar hoy <ArrowRight size={16} />
              </button>
            </div>

            {/* Service 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-violet-900/5 hover:-translate-y-1 transition-all duration-300 border border-slate-100 group">
              <div className="w-14 h-14 bg-violet-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-violet-100 transition-colors">
                <Shield className="w-7 h-7 text-violet-600" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-slate-900">Administración Patrimonial</h3>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Protección y gestión del patrimonio personal y corporativo. Asesoramiento integral
                para preservar y hacer crecer tu capital a través de generaciones.
              </p>
              <button
                className="text-violet-600 font-semibold flex items-center gap-2 group-hover:gap-3 transition-all text-sm"
                onClick={() => scrollToSection('contacto')}
              >
                Empezar hoy <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="nosotros" className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl transform lg:rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
                {/* Placeholder for About Image */}
                <div className="aspect-[4/3] bg-slate-100 w-full h-full relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-50 to-slate-100 flex items-center justify-center">
                    <div className="text-center">
                      <Feather className="w-24 h-24 text-violet-200 mx-auto mb-4" />
                      <span className="text-slate-400 font-medium tracking-widest text-sm">
                        MAATWORK OFFICE
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Stat Card */}
              <div className="absolute -bottom-8 -right-8 bg-white p-6 rounded-2xl shadow-xl border border-slate-50 hidden sm:block transform lg:rotate-[2deg]">
                <div className="flex items-center gap-4">
                  <div className="bg-violet-100 p-3 rounded-xl">
                    <TrendingUp className="w-8 h-8 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-2xl">+10 Años</p>
                    <p className="text-slate-500 text-sm font-medium">de trayectoria</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <span className="text-violet-600 font-semibold tracking-wider uppercase text-sm mb-2 block">
                Sobre Nosotros
              </span>
              <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                Planifica tus finanzas con <span className="text-violet-600">MaatWork</span>
              </h2>

              <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                Utiliza eficientemente tus recursos financieros en función de tus objetivos. Nuestro
                enfoque combina tecnología de punta con asesoramiento personalizado.
              </p>

              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Creemos en la transparencia y en construir relaciones a largo plazo basadas en la
                confianza y resultados medibles.
              </p>

              <ul className="space-y-4 mb-8">
                {[
                  'Asesoramiento 100% personalizado',
                  'Tecnología de vanguardia para monitoreo',
                  'Transparencia total en costos y rendimientos',
                  'Seguridad y respaldo institucional',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="bg-violet-50 p-1 rounded-full flex-shrink-0">
                      <ArrowRight className="w-4 h-4 text-violet-600" />
                    </div>
                    <span className="text-slate-700 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA / Contact Form Section */}
      <section id="contacto" className="py-24 bg-slate-900 text-white relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <span className="text-violet-400 font-semibold tracking-wider uppercase text-sm mb-2 block">
                Contacto
              </span>
              <h2 className="text-4xl sm:text-5xl font-bold mb-6">Asesorate con expertos</h2>
              <p className="text-slate-300 text-lg mb-10 leading-relaxed max-w-lg">
                Si buscas proteger tu patrimonio y maximizar tus inversiones, solicitá una reunión
                con nuestro equipo. Analizaremos tu perfil para ofrecerte las mejores soluciones.
              </p>

              <div className="space-y-8">
                <div className="flex items-start gap-5 group">
                  <div className="bg-white/5 p-4 rounded-2xl group-hover:bg-violet-600/20 transition-colors border border-white/5 group-hover:border-violet-500/30">
                    <Mail className="w-6 h-6 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1 text-lg">Email</h3>
                    <p className="text-slate-400 group-hover:text-violet-200 transition-colors">
                      contacto@maat.work
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-5 group">
                  <div className="bg-white/5 p-4 rounded-2xl group-hover:bg-emerald-600/20 transition-colors border border-white/5 group-hover:border-emerald-500/30">
                    <Phone className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1 text-lg">WhatsApp</h3>
                    <p className="text-slate-400 group-hover:text-emerald-200 transition-colors">
                      +54 9 11 3460-0296
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-5 group">
                  <div className="bg-white/5 p-4 rounded-2xl group-hover:bg-blue-600/20 transition-colors border border-white/5 group-hover:border-blue-500/30">
                    <MapPin className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1 text-lg">Ubicación</h3>
                    <p className="text-slate-400 group-hover:text-blue-200 transition-colors">
                      Av. del Libertador 6430, Piso 14. CABA
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 sm:p-10 text-slate-800 shadow-2xl border border-white/10 relative">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg transform rotate-12">
                SIN CARGO
              </div>
              <h3 className="text-2xl font-bold mb-2">Solicitar asesoramiento</h3>
              <p className="text-slate-500 mb-8 text-sm">
                Dejanos tus datos y te contactaremos a la brevedad.
              </p>

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
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
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
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
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
                  <label
                    htmlFor="interest"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
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
                    Solicitar Contacto <ArrowRight size={18} />
                  </Button>
                  <p className="text-center text-xs text-slate-400 mt-4">
                    Tus datos están protegidos. No compartimos tu información.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-16 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <Feather className="w-6 h-6 text-violet-500" />
                <span className="text-xl font-bold text-white">MaatWork</span>
              </div>
              <p className="text-sm leading-relaxed mb-6 text-slate-500">
                Soluciones financieras integrales para potenciar tu futuro y el de tu empresa.
                Expertos en gestión patrimonial y mercado de capitales.
              </p>
              <div className="flex gap-4">
                <a
                  href="#"
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-violet-600 transition-all"
                >
                  <Instagram size={18} />
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-blue-600 transition-all"
                >
                  <Linkedin size={18} />
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-6">Menú</h4>
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
            </div>

            <div>
              <h4 className="text-white font-semibold mb-6">Servicios</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="#" className="hover:text-violet-500 transition-colors">
                    Cash Management
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-violet-500 transition-colors">
                    Capitalización
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-violet-500 transition-colors">
                    Administración Patrimonial
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-violet-500 transition-colors">
                    Asesoramiento Corporativo
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-6">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href="/legal/terms-of-service.html"
                    className="hover:text-violet-500 transition-colors"
                  >
                    Términos y Condiciones
                  </a>
                </li>
                <li>
                  <a
                    href="/legal/privacy-policy.html"
                    className="hover:text-violet-500 transition-colors"
                  >
                    Política de Privacidad
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.argentina.gob.ar/servicio/iniciar-un-reclamo-ante-coprec"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-violet-500 transition-colors"
                  >
                    Defensa del Consumidor
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-600">
            <p>&copy; {new Date().getFullYear()} MaatWork. Todos los derechos reservados.</p>
            <p>
              Diseñado y desarrollado con <span className="text-red-500">❤</span> en Buenos Aires.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
