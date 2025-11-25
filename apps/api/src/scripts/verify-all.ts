#!/usr/bin/env tsx
/**
 * Script maestro de verificación
 * 
 * Ejecuta todas las verificaciones del sistema en secuencia y genera un reporte consolidado.
 * 
 * Uso: pnpm -F @cactus/api verify-all
 */

import { config } from 'dotenv';
import { join } from 'path';
import { execSync } from 'child_process';

// Cargar .env
const projectRoot = join(__dirname, '..', '..', '..', '..');
config({ path: join(projectRoot, 'apps', 'api', '.env') });

interface VerificationResult {
  name: string;
  success: boolean;
  exitCode: number;
  output: string;
  errors?: string[];
}

const VERIFICATIONS = [
  {
    name: 'AUM Import',
    command: 'pnpm -F @cactus/api verify-aum-import',
    description: 'Verifica que las importaciones AUM se hayan cargado correctamente'
  },
  {
    name: 'Contacts Assignment',
    command: 'pnpm -F @cactus/api verify-contacts-assignment',
    description: 'Verifica que todos los contactos estén correctamente asignados'
  }
];

async function runVerification(verification: typeof VERIFICATIONS[0]): Promise<VerificationResult> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Ejecutando: ${verification.name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Descripción: ${verification.description}\n`);

  try {
    const output = execSync(verification.command, {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: join(projectRoot, 'apps', 'api')
    });

    const exitCode = 0; // execSync no lanza error si exit code es 0
    return {
      name: verification.name,
      success: exitCode === 0,
      exitCode,
      output
    };
  } catch (error: any) {
    const exitCode = error.status || 1;
    const output = error.stdout || '';
    const stderr = error.stderr || '';
    
    const result: VerificationResult = {
      name: verification.name,
      success: false,
      exitCode,
      output: output + (stderr ? `\nSTDERR:\n${stderr}` : '')
    };
    
    if (stderr) {
      result.errors = [stderr];
    }
    
    return result;
  }
}

function printConsolidatedReport(results: VerificationResult[]): void {
  console.log('\n\n' + '='.repeat(80));
  console.log('REPORTE CONSOLIDADO DE VERIFICACIONES');
  console.log('='.repeat(80));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log('\n📊 RESUMEN:');
  console.log(`   Total verificaciones: ${results.length}`);
  console.log(`   ✅ Exitosas: ${successful.length}`);
  console.log(`   ❌ Fallidas: ${failed.length}`);

  if (successful.length > 0) {
    console.log('\n✅ VERIFICACIONES EXITOSAS:');
    successful.forEach(r => {
      console.log(`   - ${r.name}`);
    });
  }

  if (failed.length > 0) {
    console.log('\n❌ VERIFICACIONES FALLIDAS:');
    failed.forEach(r => {
      console.log(`   - ${r.name} (exit code: ${r.exitCode})`);
      if (r.errors && r.errors.length > 0) {
        console.log(`     Errores: ${r.errors.join(', ')}`);
      }
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('RESUMEN FINAL');
  console.log('='.repeat(80));

  if (failed.length === 0) {
    console.log('\n✅ TODAS LAS VERIFICACIONES PASARON');
    console.log('   El sistema está funcionando correctamente.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  ALGUNAS VERIFICACIONES FALLARON');
    console.log(`   Revisa los reportes individuales arriba para más detalles.\n`);
    process.exit(1);
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('VERIFICACIÓN COMPLETA DEL SISTEMA');
  console.log('='.repeat(80));
  console.log(`\nEjecutando ${VERIFICATIONS.length} verificaciones...\n`);

  const results: VerificationResult[] = [];

  for (const verification of VERIFICATIONS) {
    const result = await runVerification(verification);
    results.push(result);
    
    // Mostrar output de cada verificación
    if (result.output) {
      console.log(result.output);
    }
  }

  printConsolidatedReport(results);
}

main().catch((error) => {
  console.error('\n❌ Error fatal durante la verificación:');
  console.error(error instanceof Error ? error.message : String(error));
  if (error instanceof Error && error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  process.exit(1);
});










