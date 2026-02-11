const bcrypt = require('bcryptjs');

async function updatePassword() {
  const hash = await bcrypt.hash('Admin@123', 10);
  console.log('Hash gerado:', hash);
  
  const isValid = await bcrypt.compare('Admin@123', hash);
  console.log('Validação do hash:', isValid);
  
  console.log('\nExecute este SQL no RDS:');
  console.log(`UPDATE usuarios SET senha = '${hash}' WHERE email = 'admin@system.com';`);
}

updatePassword();





