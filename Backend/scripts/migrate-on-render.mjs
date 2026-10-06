// Aplica migrations pendentes no start, SOMENTE dentro do Render.
//
// - Usa `prisma migrate deploy`: só aplica arquivos de migration ainda não
//   aplicados. Nunca faz reset, nunca recria o banco, nunca gera migration.
// - Fora do Render (variável RENDER ausente) não faz nada — evita que um
//   `npm start` local rode migrations no banco apontado pelo .env.
// - Se a migration falhar, o start falha e o Render mantém a versão anterior no ar.
import { spawnSync } from 'node:child_process';

if (!process.env.RENDER) {
  console.log('[migrate-on-render] fora do Render — migrations não executadas.');
  process.exit(0);
}

console.log('[migrate-on-render] prisma migrate deploy…');
const r = spawnSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit', shell: true });
process.exit(r.status ?? 1);
