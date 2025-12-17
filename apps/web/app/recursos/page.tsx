import Link from 'next/link';
import { Heading, Text, Card, CardContent, Grid, Stack, Icon } from '@cactus/ui';

/**
 * Página de Recursos - Hub para acceder a material visual y datos de facturación
 */

interface ResourceCard {
  title: string;
  description: string;
  href: string;
  icon: 'Book' | 'FileText';
}

const cards: ResourceCard[] = [
  // TODO: Descomentar cuando se implemente la página
  // {
  //   title: 'Material Visual',
  //   description: 'Accede a presentaciones, plantillas y material gráfico para clientes.',
  //   href: '/recursos/material-visual',
  //   icon: 'Book',
  // },
  {
    title: 'Datos de Facturación',
    description: 'Consulta y gestiona información de facturación y datos fiscales.',
    href: '/recursos/facturacion',
    icon: 'FileText',
  },
];

export default function RecursosPage() {
  return (
    <section className="p-6">
      <Stack gap="lg">
        <Stack gap="xs">
          <Heading level={3}>Recursos</Heading>
          <Text size="sm" color="secondary">
            Accede a material y documentación útil
          </Text>
        </Stack>

        <Grid cols={{ base: 1, md: 2 }} gap="lg">
          {cards.map((c) => (
            <Link key={c.href} href={c.href} className="block group">
              <Card variant="interactive" className="h-full">
                <CardContent>
                  <Stack gap="sm">
                    <Stack direction="row" gap="sm" align="center">
                      <Icon name={c.icon} size={24} className="text-primary" />
                      <Text size="lg" weight="medium">
                        {c.title}
                      </Text>
                    </Stack>
                    <Text size="sm" color="secondary">
                      {c.description}
                    </Text>
                    <Text size="sm" className="text-primary mt-2">
                      Ir →
                    </Text>
                  </Stack>
                </CardContent>
              </Card>
            </Link>
          ))}
        </Grid>
      </Stack>
    </section>
  );
}
