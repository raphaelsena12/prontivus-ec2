const { PrismaClient } = require('./lib/generated/prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function test() {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email: 'admin@system.com' }
    });
    
    if (!usuario) {
      console.log('❌ Usuário não encontrado no RDS');
      return;
    }
    
    console.log('✅ Usuário encontrado:', usuario.email);
    console.log('   Tipo:', usuario.tipo);
    console.log('   Ativo:', usuario.ativo);
    
    const senhaValida = await bcrypt.compare('Admin@123', usuario.senha);
    console.log('   Senha Admin@123 válida:', senhaValida);
    
    if (!senhaValida) {
      console.log('⚠️  Senha incorreta. Gerando novo hash...');
      const novoHash = await bcrypt.hash('Admin@123', 10);
      console.log('   Novo hash:', novoHash);
      
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { senha: novoHash }
      });
      console.log('✅ Senha atualizada no RDS');
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();





