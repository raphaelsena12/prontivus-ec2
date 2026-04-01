/** Filtros reutilizados para catálogo TUSS (EXAMES / PROCEDIMENTOS) no admin-clinica. */

export type CatalogoTussChave = "EXAMES" | "PROCEDIMENTOS";

export function buildCodigoTussCatalogoAndParts(
  catalogo: CatalogoTussChave,
  searchTrimmed: string,
  ativoSomente: boolean
): object[] {
  const andParts: object[] = [];

  if (searchTrimmed) {
    andParts.push({
      OR: [
        {
          codigoTuss: {
            contains: searchTrimmed,
            mode: "insensitive" as const,
          },
        },
        {
          descricao: {
            contains: searchTrimmed,
            mode: "insensitive" as const,
          },
        },
      ],
    });
  }

  if (catalogo === "EXAMES") {
    andParts.push({
      OR: [
        { sipGrupo: { contains: "EXAMES", mode: "insensitive" as const } },
        { grupoTuss: { contains: "EXAMES", mode: "insensitive" as const } },
        {
          categoriaProntivus: {
            contains: "EXAMES",
            mode: "insensitive" as const,
          },
        },
        { tipoProcedimento: "EXAME" },
      ],
    });
  } else {
    andParts.push({
      OR: [
        {
          sipGrupo: {
            contains: "PROCEDIMENTOS",
            mode: "insensitive" as const,
          },
        },
        {
          grupoTuss: {
            contains: "PROCEDIMENTOS",
            mode: "insensitive" as const,
          },
        },
        {
          categoriaProntivus: {
            contains: "PROCEDIMENTOS",
            mode: "insensitive" as const,
          },
        },
        { tipoProcedimento: "PROCEDIMENTO_AMBULATORIAL" },
        { tipoProcedimento: "CIRURGIA" },
      ],
    });
  }

  if (ativoSomente) {
    andParts.push({ ativo: true });
  }

  return andParts;
}

export function whereFromAndParts(andParts: object[]) {
  return andParts.length > 0 ? { AND: andParts } : {};
}
