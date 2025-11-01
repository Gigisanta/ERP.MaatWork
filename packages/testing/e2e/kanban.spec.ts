import { test, expect } from '@playwright/test';

test.describe('Kanban Board', () => {
  test('should display kanban columns', async ({ page }) => {
    await page.goto('/crm/kanban');
    
    // Check for kanban columns
    await expect(page.locator('[data-rbd-droppable-id], .kanban-column')).toHaveCount({ min: 3 });
  });

  test('should allow dragging cards between columns', async ({ page }) => {
    await page.goto('/crm/kanban');
    
    const firstCard = page.locator('[data-rbd-draggable-id], .kanban-card').first();
    const targetColumn = page.locator('[data-rbd-droppable-id]').nth(1);
    
    // Drag and drop
    await firstCard.dragTo(targetColumn);
    
    // Verify card is in new column
    await expect(targetColumn.locator('.kanban-card')).toHaveCount({ min: 1 });
  });
});

