PLANO_CIDADAO      = "cidadao"
PLANO_INVESTIGADOR = "investigador"
PLANO_PROFISSIONAL = "profissional"
PLANO_PATROCINADOR = "patrocinador"
PLANO_API_DADOS    = "api & dados"
PLANO_TECNICO      = "tecnico"

# Planos com acesso ao chat e geração de documentos
PLANO_CHAT_HABILITADO = {
    PLANO_INVESTIGADOR,
    PLANO_PROFISSIONAL,
    PLANO_PATROCINADOR,
    PLANO_API_DADOS,
    PLANO_TECNICO,
}

# Exportações mensais de documentos gerados pela IA (None = ilimitado)
PLANO_EXPORTACOES = {
    PLANO_INVESTIGADOR:  5,
    PLANO_PROFISSIONAL:  15,
    PLANO_PATROCINADOR:  5,
    PLANO_API_DADOS:     None,
    PLANO_TECNICO:       None,
}

# Teto de custo em tokens por mês em R$ (None = ilimitado)
PLANO_TETO_TOKENS_BRL = {
    PLANO_INVESTIGADOR:  30.0,
    PLANO_PROFISSIONAL:  114.0,
    PLANO_PATROCINADOR:  30.0,
    PLANO_API_DADOS:     None,
    PLANO_TECNICO:       None,
}

NIVEL_ALERTA_VERDE = "verde"
NIVEL_ALERTA_AMARELO = "amarelo"
NIVEL_ALERTA_LARANJA = "laranja"
NIVEL_ALERTA_VERMELHO = "vermelho"
