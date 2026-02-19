'use client';

import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  Heading,
  Text,
  Stack,
} from '@maatwork/ui';
import TagDetailsForm from './TagDetailsForm';

interface ContactTag {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
  businessLine?: string | null;
  monthlyPremium?: number | null;
  policyNumber?: string | null;
}

interface ProductsSectionProps {
  contactId: string;
  tags: ContactTag[];
}

export default function ProductsSection({ contactId, tags }: ProductsSectionProps) {
  // Filter tags that belong to the relevant business lines
  const productTags = tags.filter((tag) => 
    tag.businessLine && ['zurich', 'investorstrust', 'inversiones', 'patrimonial'].includes(tag.businessLine)
  );

  if (productTags.length === 0) {
    return null;
  }

  return (
    <Stack direction="column" gap="md">
      <div className="flex items-center gap-2 mb-2">
        <Heading size="md">Productos</Heading>
        <Badge variant="outline" className="text-xs">
          {productTags.length}
        </Badge>
      </div>

      {productTags.map((tag) => (
        <Card
          key={tag.id}
          padding="sm"
          className="border-l-4"
          style={{ borderLeftColor: tag.color }}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge
                  style={{ backgroundColor: tag.color, color: 'white' }}
                  className="text-xs px-2 py-0.5"
                >
                  {tag.name}
                </Badge>
                <Text weight="medium" size="sm">
                  Información de Póliza
                </Text>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TagDetailsForm
              contactId={contactId}
              tagId={tag.id}
              initialData={{
                monthlyPremium: tag.monthlyPremium ?? null,
                policyNumber: tag.policyNumber ?? null,
              }}
              // Passing embedded prop to modify behavior if needed
              // currently TagDetailsForm handles update independently
            />
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
