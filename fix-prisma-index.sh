#!/bin/bash
# Script para corrigir o arquivo index.ts do Prisma na EC2

cd /opt/prontivus

# Remover o index.ts incorreto
rm -f lib/generated/prisma/index.ts

# Criar o arquivo correto que exporta apenas tipos (não o PrismaClient)
cat > lib/generated/prisma/index.ts << 'EOF'
// Re-exportar apenas tipos e enums (seguro para uso no cliente)
// O PrismaClient deve ser importado diretamente de './client' apenas no servidor
export * from './enums';
export type * from './models';
EOF

echo "✅ Arquivo index.ts criado com sucesso!"
echo ""
echo "Conteúdo do arquivo:"
cat lib/generated/prisma/index.ts
echo ""
echo "Agora tente o build novamente:"
echo "npm run build"
