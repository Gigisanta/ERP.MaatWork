/**
 * LandingPage - Server Component
 *
 * AI_DECISION: Convert to Server Component for SEO/OAuth verification
 * Justificación: Google's OAuth consent screen crawler doesn't execute JavaScript.
 * The privacy policy link and app purpose must be in the server-rendered HTML.
 * Impacto: Critical content (privacy policy, app purpose) now visible to crawlers.
 */

import React from 'react';
import Link from 'next/link';
import {
  Feather,
  TrendingUp,
  Shield,
  DollarSign,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Instagram,
  Linkedin,
  MessageCircle,
} from 'lucide-react';
import {
  LandingPageHeader,
  ScrollButton,
  LogoScrollTop,
  FooterNav,
  ContactForm,
} from './LandingPageClient';

/**
 * LandingPage Component
 * Public presentation page for maat.work
 * Server-rendered for SEO and OAuth verification compliance
 */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* Logo */}
            <LogoScrollTop>
              <Feather className="w-8 h-8 text-violet-600" strokeWidth={2} />
              <span className="text-xl sm:text-2xl font-bold tracking-tight">
                <span className="text-violet-700">Maat</span>
                <span className="text-slate-700">Work</span>
              </span>
            </LogoScrollTop>

            {/* Client-side interactive header (nav, mobile menu) */}
            <LandingPageHeader />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        id="inicio"
        className="relative bg-slate-900 py-20 sm:py-32 text-white overflow-hidden"
      >
        {/* Abstract Background with enhanced animations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-violet-600/30 rounded-full blur-[100px] mix-blend-screen animate-blob"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-[100px] mix-blend-screen animate-blob animate-delay-200"></div>
          <div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-blue-500/20 rounded-full blur-[100px] mix-blend-screen animate-blob animate-delay-400"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6 backdrop-blur-sm animate-fade-in-up">
              <span className="flex h-2 w-2 rounded-full bg-violet-400 animate-pulse"></span>
              <span className="text-sm font-medium text-violet-200">
                Gestión Patrimonial Profesional
              </span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6 tracking-tight animate-fade-in-up animate-delay-100">
              Te acompañamos <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-emerald-400">
                siempre
              </span>
            </h1>
            {/* App purpose description - critical for OAuth verification */}
            {/* App purpose description - critical for OAuth verification */}
            <p className="text-xl sm:text-2xl text-slate-300 mb-6 leading-relaxed max-w-2xl font-light animate-fade-in-up animate-delay-200">
              <strong>MaatWork es una aplicación</strong> de gestión patrimonial y asesoramiento
              financiero diseñada para individuos y empresas. Nuestra app te permite monitorear
              inversiones, optimizar tu liquidez y acceder a consultoría experta en tiempo real.
            </p>
            <div className="mb-10 animate-fade-in-up animate-delay-200">
              <a
                href="/legal/privacy-policy.html"
                className="text-slate-400 hover:text-white text-sm underline underline-offset-4 transition-colors"
                title="Política de Privacidad de la aplicación"
              >
                Política de Privacidad
              </a>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up animate-delay-300">
              <ScrollButton
                targetId="contacto"
                variant="primary"
                size="lg"
                className="bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-full px-8 py-6 text-lg border-transparent shadow-lg shadow-violet-900/20 transition-transform hover:scale-105"
              >
                Hablar con un asesor
              </ScrollButton>
              <ScrollButton
                targetId="servicios"
                variant="outline"
                size="lg"
                className="border-slate-700 hover:bg-slate-800 text-white font-semibold rounded-full px-8 py-6 text-lg transition-all"
              >
                Conocer servicios
              </ScrollButton>
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
            <div className="bg-white rounded-2xl p-8 shadow-xl shadow-slate-200/50 service-card border border-slate-100 group">
              <div className="w-14 h-14 bg-violet-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-violet-100 transition-colors">
                <DollarSign className="w-7 h-7 text-violet-600" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-slate-900">Cash Management</h3>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Gestión de liquidez, inversiones en ARS y USD, coberturas, dolarizaciones y
                transferencias al exterior. Optimizamos tu flujo de caja con instrumentos seguros.
              </p>
              <ScrollButton
                targetId="contacto"
                variant="outline"
                size="sm"
                className="text-violet-600 font-semibold flex items-center gap-2 group-hover:gap-3 transition-all text-sm border-none bg-transparent hover:bg-transparent p-0"
              >
                Empezar hoy <ArrowRight size={16} />
              </ScrollButton>
            </div>

            {/* Service 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-xl shadow-slate-200/50 service-card border border-slate-100 group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-emerald-500"></div>
              <div className="w-14 h-14 bg-violet-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-violet-100 transition-colors">
                <TrendingUp className="w-7 h-7 text-violet-600" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-slate-900">Capitalización</h3>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Planificación de largo plazo para alcanzar grandes objetivos. Estrategias de interés
                compuesto adaptadas a tu perfil de riesgo para maximizar rendimientos.
              </p>
              <ScrollButton
                targetId="contacto"
                variant="outline"
                size="sm"
                className="text-violet-600 font-semibold flex items-center gap-2 group-hover:gap-3 transition-all text-sm border-none bg-transparent hover:bg-transparent p-0"
              >
                Empezar hoy <ArrowRight size={16} />
              </ScrollButton>
            </div>

            {/* Service 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-xl shadow-slate-200/50 service-card border border-slate-100 group">
              <div className="w-14 h-14 bg-violet-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-violet-100 transition-colors">
                <Shield className="w-7 h-7 text-violet-600" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-slate-900">Administración Patrimonial</h3>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Protección y gestión del patrimonio personal y corporativo. Asesoramiento integral
                para preservar y hacer crecer tu capital a través de generaciones.
              </p>
              <ScrollButton
                targetId="contacto"
                variant="outline"
                size="sm"
                className="text-violet-600 font-semibold flex items-center gap-2 group-hover:gap-3 transition-all text-sm border-none bg-transparent hover:bg-transparent p-0"
              >
                Empezar hoy <ArrowRight size={16} />
              </ScrollButton>
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
                    <p className="font-bold text-slate-900 text-2xl animate-count-up">+10 Años</p>
                    <p className="text-slate-500 text-sm font-medium">de trayectoria</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <span className="text-violet-600 font-semibold tracking-wider uppercase text-sm mb-2 block animate-fade-in-up">
                Sobre Nosotros
              </span>
              <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6 leading-tight animate-fade-in-up animate-delay-100">
                Planifica tus finanzas con <span className="text-violet-600">MaatWork</span>
              </h2>

              <p className="text-lg text-slate-600 mb-6 leading-relaxed animate-fade-in-up animate-delay-200">
                Utiliza eficientemente tus recursos financieros en función de tus objetivos. Nuestro
                enfoque combina tecnología de punta con asesoramiento personalizado.
              </p>

              <p className="text-lg text-slate-600 mb-8 leading-relaxed animate-fade-in-up animate-delay-300">
                Creemos en la transparencia y en construir relaciones a largo plazo basadas en la
                confianza y resultados medibles.
              </p>

              <ul className="space-y-4 mb-8 animate-fade-in-up animate-delay-400">
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

      {/* Testimonials Section */}
      <section className="py-24 bg-slate-50 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-100 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-100 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <span className="text-violet-600 font-semibold tracking-wider uppercase text-sm mb-2 block">
              Testimonios
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
              La confianza de nuestros clientes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                text: 'MaatWork transformó la manera en que gestionamos la liquidez de nuestra empresa. La plataforma es intuitiva y el asesoramiento impecable.',
                author: 'Carlos Rodriguez',
                role: 'Director Financiero',
                company: 'TechSolutions SA',
              },
              {
                text: 'Excelente servicio de capitalización. Me ayudaron a estructurar un plan de retiro sólido y adaptado a mis necesidades.',
                author: 'Ana Martínez',
                role: 'Emprendedora',
                company: 'Independiente',
              },
              {
                text: 'La transparencia y profesionalismo del equipo es destacable. Me siento tranquila sabiendo que mi patrimonio está en buenas manos.',
                author: 'Roberto Gomez',
                role: 'Inversor Privado',
                company: '',
              },
            ].map((testimonial, i) => (
              <div
                key={i}
                className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100"
              >
                <div className="flex text-violet-400 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  ))}
                </div>
                <p className="text-slate-600 mb-6 italic leading-relaxed">"{testimonial.text}"</p>
                <div>
                  <p className="font-bold text-slate-900">{testimonial.author}</p>
                  <p className="text-sm text-slate-500">
                    {testimonial.role} {testimonial.company && `- ${testimonial.company}`}
                  </p>
                </div>
              </div>
            ))}
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
                Agenda una reunión gratuita con un asesor especializado.{' '}
                <span className="text-emerald-400 font-medium">
                  Cupos limitados para nuevos clientes este mes.
                </span>
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

              {/* Client-side form component */}
              <ContactForm />

              {/* Privacy policy notice - critical for OAuth verification (server-rendered) */}
              <p className="text-center text-xs text-slate-400 mt-4">
                Tus datos están protegidos. No compartimos tu información.{' '}
                <a
                  href="/legal/privacy-policy.html"
                  className="text-violet-600 hover:text-violet-500 underline"
                >
                  Ver Política de Privacidad
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - critical for OAuth verification (server-rendered with privacy policy link) */}
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
              {/* Client-side footer nav for scroll functionality */}
              <FooterNav />
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

            {/* Legal section - server-rendered with direct links for crawler visibility */}
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
      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/5491134600296?text=Hola%20MaatWork,%20quiero%20conocer%20m%C3%A1s%20sobre%20sus%20servicios"
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-float hover:scale-110 active:scale-95 transition-transform duration-300"
        aria-label="Contactar por WhatsApp"
      >
        <div className="absolute inset-0 rounded-full animate-whatsapp-pulse z-[-1]"></div>
        <MessageCircle className="w-8 h-8 text-white" />
      </a>
    </div>
  );
}
