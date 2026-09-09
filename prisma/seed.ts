// Runs automatically after `npx prisma migrate reset`, or manually via
// `npx prisma db seed`. Safe to run multiple times — it only creates the
// bootstrap account if no users exist yet.
import { PrismaClient } from '../src/generated/prisma/client'
import bcrypt from 'bcryptjs'
import { seedShopDefaults } from '../src/lib/seedShopDefaults'

const prisma = new PrismaClient()

const BOOTSTRAP_EMAIL = 'admin@headoffice.local'
const BOOTSTRAP_PASSWORD = 'ChangeMe123!'

async function main() {
  const existingUserCount = await prisma.user.count()
  if (existingUserCount > 0) {
    console.log(`Skipping seed: ${existingUserCount} user(s) already exist.`)
    return
  }

  // The multi-shop migration always creates shop_id = 1 as "Head Office".
  const headOffice = await prisma.tbl_shop.findUnique({ where: { shop_id: 1 } })
  if (!headOffice) {
    throw new Error(
      'Head Office shop (shop_id = 1) not found. Make sure all migrations ran ' +
      'successfully before seeding (npx prisma migrate deploy / migrate reset).'
    )
  }

  const hashedPassword = await bcrypt.hash(BOOTSTRAP_PASSWORD, 10)

  await prisma.user.create({
    data: {
      name: 'Head Office Admin',
      email: BOOTSTRAP_EMAIL,
      password: hashedPassword,
      flag: '1', // admin
      shop_id: null, // null = sees every franchise
      is_super_admin: true,
    },
  })

  await seedShopDefaults(prisma, 1)

  console.log('')
  console.log('========================================================')
  console.log('  Bootstrap Head Office account created:')
  console.log(`    email:    ${BOOTSTRAP_EMAIL}`)
  console.log(`    password: ${BOOTSTRAP_PASSWORD}`)
  console.log('')
  console.log('  Log in and change this password immediately, then use')
  console.log('  Employee -> Create User to add your real accounts.')
  console.log('========================================================')
  console.log('')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
