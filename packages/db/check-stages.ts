import { db, pipelineStages } from './src/index';
import { asc } from 'drizzle-orm';

async function checkStages() {
  try {
    console.log('✅ Conectando a la base de datos...\n');
    
    const stages = await db()
      .select()
      .from(pipelineStages)
      .orderBy(asc(pipelineStages.order));
    
    console.log(`📊 Total de etapas encontradas: ${stages.length}\n`);
    
    if (stages.length === 0) {
      console.log('❌ No hay etapas en la base de datos\n');
      console.log('💡 Ejecuta el seed: npx tsx src/seed-pipeline-stages.ts');
    } else {
      console.log('Etapas en la base de datos:');
      console.table(stages.map(s => ({
        Nombre: s.name,
        Orden: s.order,
        Color: s.color,
        Activa: s.isActive ? '✓' : '✗',
        ID: s.id.substring(0, 13) + '...'
      })));
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

checkStages();


