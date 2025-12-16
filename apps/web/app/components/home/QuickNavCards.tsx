'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  Icon,
  Heading,
  Text,
  Stack,
  Grid,
  GridItem,
  type IconName,
} from '@cactus/ui';

interface NavCard {
  href: string;
  icon: IconName;
  title: string;
  description: string;
  gradient: string;
}

const navCards: NavCard[] = [
  {
    href: '/contacts',
    icon: 'Users',
    title: 'Contactos',
    description: 'Gestiona tu red de clientes y prospectos',
    gradient: 'from-purple-500/10 to-indigo-500/10',
  },
  {
    href: '/portfolios',
    icon: 'BarChart3',
    title: 'Carteras',
    description: 'Analiza el rendimiento de tus carteras',
    gradient: 'from-green-500/10 to-emerald-500/10',
  },
  {
    href: '/admin',
    icon: 'Settings',
    title: 'Administración',
    description: 'Administra usuarios y permisos del sistema',
    gradient: 'from-slate-500/10 to-gray-500/10',
  },
  {
    href: '/teams',
    icon: 'Team',
    title: 'Equipos',
    description: 'Crea y gestiona equipos de trabajo',
    gradient: 'from-amber-500/10 to-orange-500/10',
  },
];

/**
 * Cards de navegación rápida con hover states mejorados y animaciones staggered
 */
export function QuickNavCards() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Grid cols={{ base: 1, md: 2, lg: 4 }} gap="lg">
      {navCards.map((card, index) => (
        <GridItem key={card.href}>
          <div
            className={`
              transition-all duration-500 ease-out
              ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
            `}
            style={{ transitionDelay: `${index * 100}ms` }}
          >
            <Link
              href={card.href}
              className="block no-underline focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 rounded-xl"
              aria-label={`Navegar a ${card.title}: ${card.description}`}
            >
              <Card
                className={`
                  h-full cursor-pointer group relative overflow-hidden
                  border border-border/50 hover:border-primary/30
                  transition-all duration-300 ease-out
                  hover:shadow-xl hover:-translate-y-1 hover-lift-glow
                `}
              >
                {/* Gradient background on hover */}
                <div
                  className={`
                    absolute inset-0 bg-gradient-to-br ${card.gradient}
                    opacity-0 group-hover:opacity-100
                    transition-opacity duration-300
                  `}
                />

                {/* Accent border on hover */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-secondary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

                <CardContent className="p-5 relative">
                  <Stack direction="column" gap="md">
                    {/* Icon with animated background */}
                    <div className="relative">
                      <div
                        className={`
                          w-12 h-12 rounded-xl flex items-center justify-center
                          bg-surface group-hover:bg-white
                          transition-all duration-300
                          group-hover:shadow-lg group-hover:scale-110
                        `}
                        style={{
                          boxShadow: 'none',
                        }}
                        aria-hidden="true"
                      >
                        <Icon
                          name={card.icon}
                          size={24}
                          className="transition-all duration-300 text-secondary"
                        />
                      </div>

                      {/* Glow effect */}
                      <div className="absolute inset-0 rounded-xl bg-secondary opacity-0 group-hover:opacity-40 blur-xl transition-opacity duration-300" />
                    </div>

                    {/* Title */}
                    <Heading
                      level={3}
                      className="text-lg group-hover:text-secondary transition-colors duration-200"
                    >
                      {card.title}
                    </Heading>

                    {/* Description */}
                    <Text size="sm" color="secondary" className="line-clamp-2">
                      {card.description}
                    </Text>

                    {/* Arrow indicator */}
                    <div className="flex items-center gap-1 text-text-muted group-hover:text-secondary transition-all duration-200">
                      <Text size="sm" className="font-medium">
                        Explorar
                      </Text>
                      <svg
                        className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </Stack>
                </CardContent>
              </Card>
            </Link>
          </div>
        </GridItem>
      ))}
    </Grid>
  );
}
