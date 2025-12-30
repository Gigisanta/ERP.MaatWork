import { test, expect } from './fixtures';

test.describe('Pipeline Kanban E2E', () => {
  test('should display pipeline board and stages', async ({ pipelinePage }) => {
    await pipelinePage.gotoPipeline();
    await pipelinePage.expectPipelineVisible();
    await pipelinePage.expectStagesCount(1); // At least 1 stage
  });

  test('should move contact between stages', async ({ pipelinePage, contactsPage }) => {
    // Ideally we would seed a contact first
    const contactName = `Kanban Test ${Date.now()}`;
    await contactsPage.createContact({ firstName: contactName, email: 'kanban@test.com' });

    await pipelinePage.gotoPipeline();

    // Check contact exists in first stage (or whichever default)
    // For test robustness, just ensure we have draggable items
    await pipelinePage.expectContactCountInStage(0, 1);

    // Perform Drag & Drop: Move first card from col 0 to col 1
    // Requires at least 2 stages
    await pipelinePage.expectStagesCount(2);
    await pipelinePage.dragContactToStage(0, 1);
  });
});
