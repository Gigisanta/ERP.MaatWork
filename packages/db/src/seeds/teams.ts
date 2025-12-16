/**
 * Seed Teams
 * 
 * Seeds teams and team memberships
 */

import { db } from '../index';
import { teams, teamMembership, teamMembershipRequests, users } from '../schema';
import { eq, and, type InferSelectModel } from 'drizzle-orm';

/**
 * Seed teams and team memberships
 */
export async function seedTeams(
  managerUsers: InferSelectModel<typeof users>[],
  advisorUsers: InferSelectModel<typeof users>[]
): Promise<InferSelectModel<typeof teams>[]> {
  console.log('👥 Seeding teams...');

  const teamNames = ['Equipo Norte', 'Equipo Sur', 'Equipo Centro'];
  const createdTeams: InferSelectModel<typeof teams>[] = [];

  for (let i = 0; i < Math.min(teamNames.length, managerUsers.length - 1); i++) {
    const manager = managerUsers[i + 1]; // Skip admin (index 0)
    if (!manager) continue;

    const teamName = teamNames[i]!;
    const existing = await db().select().from(teams).where(eq(teams.name, teamName)).limit(1);
    
    let team: InferSelectModel<typeof teams>;
    if (existing.length === 0) {
      const [created] = await db().insert(teams).values({
        name: teamName,
        managerUserId: manager.id
      }).returning();
      team = created;
      console.log(`  ✓ Created team: ${teamName} (manager: ${manager.fullName})`);
    } else {
      team = existing[0]!;
      // Update manager if needed
      if (team.managerUserId !== manager.id) {
        await db().update(teams).set({ managerUserId: manager.id }).where(eq(teams.id, team.id));
      }
      console.log(`  ⊙ Team already exists: ${teamName}`);
    }
    createdTeams.push(team);

    // Assign advisors to team
    const advisorsPerTeam = Math.ceil(advisorUsers.length / teamNames.length);
    const startIdx = i * advisorsPerTeam;
    const endIdx = Math.min(startIdx + advisorsPerTeam, advisorUsers.length);
    const teamAdvisors = advisorUsers.slice(startIdx, endIdx);

    for (const advisor of teamAdvisors) {
      const existingMembership = await db()
        .select()
        .from(teamMembership)
        .where(and(eq(teamMembership.teamId, team.id), eq(teamMembership.userId, advisor.id)))
        .limit(1);

      if (existingMembership.length === 0) {
        await db().insert(teamMembership).values({
          teamId: team.id,
          userId: advisor.id,
          role: 'member'
        }).onConflictDoNothing();
        console.log(`    ✓ Added ${advisor.fullName} to ${teamName}`);
      }
    }
  }

  // Create some team membership requests
  if (createdTeams.length > 0 && advisorUsers.length > 0) {
    const advisor = advisorUsers[advisorUsers.length - 1]!;
    const manager = managerUsers[1];
    if (manager) {
      const existingRequest = await db()
        .select()
        .from(teamMembershipRequests)
        .where(and(
          eq(teamMembershipRequests.userId, advisor.id),
          eq(teamMembershipRequests.managerId, manager.id)
        ))
        .limit(1);

      if (existingRequest.length === 0) {
        await db().insert(teamMembershipRequests).values({
          userId: advisor.id,
          managerId: manager.id,
          status: 'pending'
        }).onConflictDoNothing();
        console.log(`  ✓ Created team membership request`);
      }
    }
  }

  console.log(`✅ Teams seeded: ${createdTeams.length} teams\n`);
  return createdTeams;
}









































