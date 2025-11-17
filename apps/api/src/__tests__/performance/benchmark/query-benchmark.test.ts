/**
 * Benchmark tests for database queries
 * 
 * Measures performance of critical database operations
 */

import { describe, it, expect } from 'vitest';
import { db } from '@cactus/db';
import { contacts } from '@cactus/db/schema';
import { eq } from 'drizzle-orm';

describe('Query Performance Benchmarks', () => {
  it('should query contacts list in < 100ms', async () => {
    const start = performance.now();
    
    await db()
      .select()
      .from(contacts)
      .limit(100);
    
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(100);
  });

  it('should query single contact by ID in < 50ms', async () => {
    // Get a contact ID first
    const [firstContact] = await db()
      .select({ id: contacts.id })
      .from(contacts)
      .limit(1);
    
    if (!firstContact) {
      return; // Skip if no contacts
    }
    
    const start = performance.now();
    
    await db()
      .select()
      .from(contacts)
      .where(eq(contacts.id, firstContact.id))
      .limit(1);
    
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(50);
  });

  it('should handle pagination efficiently', async () => {
    const start = performance.now();
    
    await db()
      .select()
      .from(contacts)
      .limit(10)
      .offset(0);
    
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(100);
  });
});

