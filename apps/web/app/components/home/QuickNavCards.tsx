"use client";

import Link from 'next/link';
import { Card, CardContent, Icon, Heading, Text, Stack, Grid, GridItem, type IconName } from '@cactus/ui';

interface NavCard {
  href: string;
  icon: IconName;
  title: string;
  description: string;
}

const navCards: NavCard[] = [
  {
    href: '/contacts',
    icon: 'Users',
    title: 'Contactos',
    description: 'Gestiona tu red de clientes'
  },
  {
    href: '/portfolios',
    icon: 'BarChart3',
    title: 'Carteras',
    description: 'Analiza el rendimiento de tus carteras'
  },
  {
    href: '/admin',
    icon: 'Settings',
    title: 'Administración',
    description: 'Administra usuarios y permisos del sistema'
  },
  {
    href: '/teams',
    icon: 'Users',
    title: 'Equipos',
    description: 'Crea y gestiona equipos de trabajo'
  }
];

/**
 * Cards de navegación rápida con hover states mejorados
 */
export function QuickNavCards() {
  return (
    <Grid cols={{ base: 1, md: 2, lg: 4 }} gap="md">
      {navCards.map((card) => (
        <GridItem key={card.href}>
          <Link 
            href={card.href} 
            className="block no-underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
            aria-label={`Navegar a ${card.title}: ${card.description}`}
          >
            <Card className="h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
              <CardContent className="p-4">
                <Stack direction="column" gap="sm">
                  <Stack direction="row" gap="sm" align="center">
                    <div 
                      className="flex-shrink-0 p-2 rounded-lg bg-primary-subtle group-hover:bg-primary-light transition-colors duration-200"
                      aria-hidden="true"
                    >
                      <Icon name={card.icon} size={18} className="text-primary" />
                    </div>
                    <Heading 
                      level={3} 
                      size="sm" 
                      className="group-hover:text-primary transition-colors duration-200 flex-1 min-w-0 truncate"
                    >
                      {card.title}
                    </Heading>
                  </Stack>
                  <Text size="sm" color="secondary" className="line-clamp-2">
                    {card.description}
                  </Text>
                </Stack>
              </CardContent>
            </Card>
          </Link>
        </GridItem>
      ))}
    </Grid>
  );
}

