import 'dotenv/config'
import bcrypt from 'bcryptjs'
import prisma from '../src/prisma/client'

async function main() {
  const email    = (process.env.ADMIN_EMAIL    || 'admin@fabioarts.co').toLowerCase().trim()
  const password = process.env.ADMIN_PASSWORD
  if (!password || password.length < 12) {
    throw new Error('Defina ADMIN_PASSWORD com pelo menos 12 caracteres antes de executar o seed.')
  }
  const name     =  process.env.ADMIN_NAME     || 'Fabio Admin'

  const exists = await prisma.user.findUnique({ where: { email } })

  if (exists) {
    console.log(`Admin "${email}" já existe.`)
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)

  await prisma.user.create({
    data: {
      name,
      email,
      password: passwordHash,
      role: 'SUPER_ADMIN',
    },
  })

  console.log(`✅ Admin criado: ${email} (senha do .env)`)
}

main()
  .catch((e) => {
    console.error('[seed] erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
