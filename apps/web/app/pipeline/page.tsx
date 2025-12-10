import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getPipelineBoard } from '@/lib/api-server';
import PipelineBoardClient from './PipelineBoardClient';
import type { PipelineStageWithContacts } from '@/types';

// AI_DECISION: Convert to Server Component with Client Islands pattern
// Justificación: Reduces First Load JS ~30-40KB, better SEO, faster initial load
// Impacto: Page loads faster, better performance, reduced hydration JS

export default async function PipelinePage() {
  // Check authentication via cookies (middleware handles redirect, but we verify here too)
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('token');

  if (!tokenCookie) {
    redirect('/login');
  }

  // Fetch data server-side
  let initialStages: PipelineStageWithContacts[] | null = null;
  let error: string | null = null;

  try {
    const response = await getPipelineBoard();
    if (!response.success || !response.data) {
      error = 'Failed to fetch pipeline board';
    } else {
      initialStages = response.data;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown error';
  }

  const props: {
    initialStages?: PipelineStageWithContacts[];
    initialError?: string;
  } = {};
  if (initialStages) {
    props.initialStages = initialStages;
  }
  if (error) {
    props.initialError = error;
  }
  return <PipelineBoardClient {...props} />;
}
