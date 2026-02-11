// Testar autenticação diretamente
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testAuth() {
  try {
    const result = await pool.query(
      'SELECT email, senha, tipo, ativo FROM usuarios WHERE email = $1',
      ['admin@system.com']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Usuário não encontrado');
      return;
    }
    
    const usuario = result.rows[0];
    console.log('✅ Usuário encontrado:', usuario.email);
    console.log('   Tipo:', usuario.tipo);
    console.log('   Ativo:', usuario.ativo);
    console.log('   Hash no banco:', usuario.senha.substring(0, 30) + '...');
    
    const senhaValida = await bcrypt.compare('Admin@123', usuario.senha);
    console.log('\n🔐 Teste de senha:');
    console.log('   Senha testada: Admin@123');
    console.log('   Hash no banco:', usuario.senha);
    console.log('   Resultado:', senhaValida ? '✅ VÁLIDA' : '❌ INVÁLIDA');
    
    if (!senhaValida) {
      console.log('\n⚠️  Gerando novo hash...');
      const novoHash = await bcrypt.hash('Admin@123', 10);
      console.log('   Novo hash:', novoHash);
      
      await pool.query(
        'UPDATE usuarios SET senha = $1 WHERE email = $2',
        [novoHash, 'admin@system.com']
      );
      console.log('✅ Senha atualizada no RDS');
      
      // Testar novamente
      const novoResult = await pool.query(
        'SELECT senha FROM usuarios WHERE email = $1',
        ['admin@system.com']
      );
      const novaSenhaValida = await bcrypt.compare('Admin@123', novoResult.rows[0].senha);
      console.log('   Verificação pós-atualização:', novaSenhaValida ? '✅ VÁLIDA' : '❌ INVÁLIDA');
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

testAuth();





