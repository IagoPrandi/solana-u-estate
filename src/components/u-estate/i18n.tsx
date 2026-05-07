"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

export type Locale = "en" | "pt";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const exactTranslations: Record<string, string> = {
  "Início": "Home",
  "Meus imóveis": "My properties",
  "Portfólio": "Portfolio",
  "Investir": "Invest",
  "Meus investimentos": "My investments",
  "Como funciona": "How it works",
  "Configurações": "Settings",
  "Proprietário": "Owner",
  "Investidor": "Investor",
  "Mais": "More",
  "Rede": "Network",
  "Validadores": "Validators",
  "Área de validadores": "Validator area",
  "Buscar imóvel disponível…": "Search available property...",
  "Buscar nos seus imóveis…": "Search your properties...",
  "Sou proprietário": "I am an owner",
  "Quero investir": "I want to invest",
  "Mostrar/ocultar menu": "Show/hide menu",
  "Alterne entre as duas experiências": "Switch between both experiences",
  "Acessar painel de validadores (área operacional)": "Open validator panel (operations area)",
  "Conectar carteira": "Connect wallet",
  "Conectando…": "Connecting...",
  "Sem carteira detectada": "No wallet detected",
  "Trocar para Solana Devnet": "Switch to Solana Devnet",
  "Trocando…": "Switching...",
  "A carteira precisa estar na rede Solana Devnet": "The wallet must be on Solana Devnet",
  "Desconectar carteira": "Disconnect wallet",
  "Bem-vinda de volta": "Welcome back",
  "Acompanhe seus imóveis e quanto cada um já captou.": "Track your properties and how much each has already raised.",
  "Imóveis": "Properties",
  "Em análise": "In review",
  "Prontos para publicar": "Ready to publish",
  "Já captado": "Already raised",
  "disponíveis": "available",
  "até 24h": "up to 24h",
  "aguardando você": "waiting for you",
  "Próximo passo": "Next step",
  "Disponibilizar agora": "List now",
  "Ver detalhes": "View details",
  "Seus imóveis": "Your properties",
  "Ver todos": "View all",
  "Atividade recente": "Recent activity",
  "Tudo": "All",
  "Captação sem perder a casa": "Raise liquidity without losing your home",
  "Você libera uma parte econômica do imóvel para investidores e mantém o direito de morar nele.": "You release an economic share of the property to investors and keep the right to live in it.",
  "Saber mais": "Learn more",
  "Olá!": "Hello!",
  "Descubra imóveis disponíveis para investimento e acompanhe seu portfólio.": "Discover properties available for investment and track your portfolio.",
  "Explorar imóveis": "Explore properties",
  "Investido": "Invested",
  "Valor atual": "Current value",
  "aceitando investimentos": "accepting investments",
  "Ver tudo": "View all",
  "Imóveis para investir": "Properties to invest in",
  "Seus investimentos": "Your investments",
  "Para investidores": "For investors",
  "Você compra uma participação econômica em imóveis verificados. Quando o imóvel valoriza, sua participação valoriza junto.": "You buy an economic stake in verified properties. When the property appreciates, your stake appreciates with it.",
  "Todos": "All",
  "Reprovados": "Rejected",
  "Captando": "Raising",
  "Esgotados": "Sold out",
  "Nenhum imóvel aqui ainda": "No properties here yet",
  "Cadastre um imóvel para começar a captar liquidez sem abrir mão da sua casa.": "Register a property to start raising liquidity without giving up your home.",
  "Imóvel": "Property",
  "Endereço": "Address",
  "Documentos": "Documents",
  "Revisar": "Review",
  "Cadastrar imóvel": "Register property",
  "Em poucos minutos seu imóvel estará pronto para captar investimentos.": "In a few minutes your property will be ready to raise investments.",
  "Sobre o imóvel": "About the property",
  "Informações básicas e quanto da casa você quer manter reservado para você.": "Basic information and how much of the home you want to keep reserved for yourself.",
  "Nome do imóvel": "Property name",
  "Como você quer chamar este imóvel internamente.": "How you want to name this property internally.",
  "Descrição (opcional)": "Description (optional)",
  "Conte um pouco sobre o imóvel — bairro, características, contexto…": "Describe the property: neighborhood, features, context...",
  "Avaliação do imóvel": "Property valuation",
  "Valor de mercado estimado em SOL.": "Estimated market value in SOL.",
  "Quanto você quer manter reservado para você?": "How much do you want to keep reserved for yourself?",
  "5% (máxima captação)": "5% (maximum raise)",
  "50% (cautela)": "50% (cautious)",
  "Onde fica": "Location",
  "Endereço completo do imóvel. Estes dados ficam protegidos e não são expostos publicamente.": "Full property address. This data remains protected and is not shown publicly.",
  "Rua": "Street",
  "Número": "Number",
  "Cidade": "City",
  "Estado": "State",
  "País": "Country",
  "CEP": "Postal code",
  "Seu endereço fica protegido. Investidores só veem cidade e estado.": "Your address stays protected. Investors only see city and state.",
  "Anexe os documentos do imóvel. Nossa equipe valida a documentação para você antes da publicação.": "Attach the property documents. Our team validates them before publication.",
  "Matrícula do imóvel": "Property deed",
  "Documento de identidade": "Identity document",
  "Comprovante de IPTU": "Property tax proof",
  "Documento que prova a propriedade.": "Document proving ownership.",
  "RG ou CNH do proprietário.": "Owner ID or driver's license.",
  "Opcional — ajuda a verificação.": "Optional: helps verification.",
  "(opcional)": "(optional)",
  "Anexar": "Attach",
  "Tudo certo?": "All set?",
  "Revise as informações. Você pode voltar e ajustar a qualquer momento.": "Review the information. You can go back and adjust it at any time.",
  "Avaliação": "Valuation",
  "Captação prevista": "Expected raise",
  "se você ofertar 100% da parte disponível": "if you list 100% of the available share",
  "Reservado pra você": "Reserved for you",
  "Disponível para investidores": "Available to investors",
  "O que acontece depois": "What happens next",
  "Nossa equipe analisa os documentos em até 24h. Quando aprovado, você publica a oferta com um clique.": "Our team reviews the documents within 24h. Once approved, you can publish the offer with one click.",
  "Falha ao enviar": "Submission failed",
  "Cancelar": "Cancel",
  "Voltar": "Back",
  "Continuar": "Continue",
  "Enviar para análise": "Submit for review",
  "Pré-visualização": "Preview",
  "Sem título": "Untitled",
  "Você não perde sua casa": "You do not lose your home",
  "O direito de morar continua sendo seu. Você só está oferecendo investidores uma participação no valor econômico do imóvel.": "The right to live there remains yours. You are only offering investors an economic stake in the property's value.",
  "Enviando para análise": "Submitting for review",
  "Ver imóvel": "View property",
  "Investir em imóveis": "Invest in properties",
  "Imóveis verificados, a partir de": "Verified properties, starting at",
  "0,001 SOL": "0.001 SOL",
  "Disponível agora": "Available now",
  "A partir de": "Starting at",
  "Buscar imóvel ou cidade…": "Search property or city...",
  "Todas as cidades": "All cities",
  "Qualquer ticket": "Any ticket",
  "Até 0,005 SOL": "Up to 0.005 SOL",
  "0,005–0,05 SOL": "0.005-0.05 SOL",
  "0,05+ SOL": "0.05+ SOL",
  "Mais recentes": "Most recent",
  "Menor ticket primeiro": "Lowest ticket first",
  "Maior ticket primeiro": "Highest ticket first",
  "Maior fração": "Largest share",
  "imóveis disponíveis": "available properties",
  "Nenhum imóvel encontrado": "No properties found",
  "Tente ajustar os filtros ou volte mais tarde.": "Try adjusting the filters or come back later.",
  "Oferta não encontrada": "Offer not found",
  "Verificado": "Verified",
  "documentos": "documents",
  "deste imóvel disponível": "of this property available",
  "Avaliação total": "Total valuation",
  "Investimento mínimo": "Minimum investment",
  "Disponível nesta oferta": "Available in this offer",
  "Localização": "Location",
  "Endereço completo": "Full address",
  "Disponível após a compra": "Available after purchase",
  "O que você está comprando": "What you are buying",
  "Uma participação econômica no imóvel — não a casa em si.": "An economic stake in the property, not the home itself.",
  "Você compra": "You buy",
  "Participação no valor econômico": "Economic value participation",
  "Direito a valorização do imóvel": "Right to property appreciation",
  "Possibilidade de revender no marketplace": "Possibility to resell in the marketplace",
  "Você não compra": "You do not buy",
  "Direito de morar ou usar o imóvel": "Right to live in or use the property",
  "Posse física ou chaves": "Physical possession or keys",
  "Decisões sobre o imóvel": "Property decisions",
  "Como o imóvel está dividido": "How the property is split",
  "Por que esta oferta é confiável": "Why this offer is trustworthy",
  "Documentos do imóvel validados pela equipe u-estate": "Property documents validated by the u-estate team",
  "Hashes registrados publicamente, auditáveis": "Publicly registered, auditable hashes",
  "Preço calculado automaticamente pela avaliação": "Price automatically calculated from valuation",
  "Operações registradas em blockchain": "Operations recorded on blockchain",
  "Investir neste imóvel": "Invest in this property",
  "Quanto você quer investir?": "How much do you want to invest?",
  "Tamanho da sua participação": "Size of your stake",
  "Mínimo": "Minimum",
  "Máximo desta oferta": "Maximum for this offer",
  "Você pagará": "You will pay",
  "Sua participação no imóvel": "Your stake in the property",
  "Unidades": "Units",
  "Investir agora": "Invest now",
  "Compra indisponivel": "Purchase unavailable",
  "Você confirma na sua carteira antes de pagar.": "You confirm in your wallet before paying.",
  "Falha na compra": "Purchase failed",
  "Concluindo investimento": "Completing investment",
  "Ver portfólio": "View portfolio",
  "Rascunho": "Draft",
  "Pronto para publicar": "Ready to publish",
  "Disponível para investimento": "Available for investment",
  "Esgotado": "Sold out",
  "Reprovado": "Rejected",
  "captado": "raised",
  "unidades restantes": "units remaining",
  "Oferta total": "Total offer",
  "unidades": "units",
  "do imóvel": "of the property",
  "Reservado": "Reserved",
  "Disponível": "Available",
  "Captado": "Raised",
  "Reservado ao proprietário:": "Reserved for the owner:",
  "Disponível para investidores:": "Available to investors:",
  "Já captado:": "Already raised:",
  "Aguardando sua confirmação": "Waiting for your confirmation",
  "Confirme a operação na sua carteira para prosseguir.": "Confirm the operation in your wallet to continue.",
  "Operação enviada": "Operation sent",
  "A rede está processando.": "The network is processing.",
  "Confirmando": "Confirming",
  "Costuma levar 12 segundos.": "Usually takes 12 seconds.",
  "Tudo certo!": "All set!",
  "Sua operação foi registrada com sucesso.": "Your operation was recorded successfully.",
  "Confirmado": "Confirmed",
  "Pendente": "Pending",
  "Falhou": "Failed",
  "Para quem": "Who it is for",
  "Os dois direitos": "The two rights",
  "Benefícios": "Benefits",
  "Saiba mais": "Learn more",
  "Entrar no app": "Enter app",
  "Proptech · Tokenização imobiliária": "Proptech · Real estate tokenization",
  "Tenho um imóvel": "I own a property",
  "direitos por imóvel": "rights per property",
  "menor fração": "smallest fraction",
  "on-chain auditável": "auditable on-chain",
  "Casa Vila Madalena": "Vila Madalena House",
  "Valor disponível": "Available value",
  "Direito de uso · Direito sobre o valor": "Use right · Value right",
  "Compra confirmada": "Purchase confirmed",
  "Dois lados, um mesmo protocolo.": "Two sides, one protocol.",
  "Para quem investe": "For investors",
  "Para quem tem imóvel": "For property owners",
  "Explorar marketplace": "Explore marketplace",
  "Cadastrar meu imóvel": "Register my property",
  "Termos": "Terms",
  "Privacidade": "Privacy",
  "O direito de usar o imóvel e o direito sobre o valor do imóvel passam a ser duas posições independentes. Quem usa não precisa ser quem detém todo o valor — e vice-versa.": "The right to use the property and the right to the property's value become two independent positions. The person who uses it does not need to be the same person who holds all of the value, and vice versa.",
  "Direito de uso": "Use right",
  "Direito de Usufruto": "Usufruct Right",
  "Direito sobre o valor": "Value right",
  "Direito sobre o Valor": "Value Right",
  "O direito de morar e usar o imóvel. Permanece com a proprietária e não circula no marketplace — quem investe não ganha acesso à casa.": "The right to live in and use the property. It remains with the owner and does not circulate in the marketplace, so investors do not gain access to the home.",
  "Token único, intransferível por venda direta": "Unique token, non-transferable through direct sale",
  "A participação econômica do imóvel: a parcela do valor que a proprietária pode ofertar a investidores em frações pequenas e negociáveis.": "The property's economic participation: the share of value the owner can offer to investors in small, tradable fractions.",
  "Compre frações a partir de 0,001 SOL": "Buy fractions starting at 0.001 SOL",
  "A casa continua sua": "The home remains yours",
  "A proprietária mantém o direito de morar mesmo após captar liquidez vendendo frações do valor.": "The owner keeps the right to live in the home even after raising liquidity by selling value fractions.",
  "Liquidez sob medida": "Tailored liquidity",
  "Venda apenas a fração de valor que você quer. O contrato calcula o preço automaticamente.": "Sell only the value fraction you want. The contract calculates the price automatically.",
  "Sem intermediários": "No intermediaries",
  "A transação é direta entre vendedora e compradora; o contrato registra tudo.": "The transaction is direct between seller and buyer; the contract records everything.",
  "Compliance por design": "Compliance by design",
  "Tokens não saem da plataforma. Apenas operações autorizadas pelos contratos.": "Tokens do not leave the platform. Only contract-authorized operations are allowed.",
  "Acessível desde 0,001 SOL": "Accessible from 0.001 SOL",
  "Você não precisa comprar o imóvel inteiro para começar a investir em valor imobiliário.": "You do not need to buy the entire property to start investing in real estate value.",
  "Auditável on-chain": "Auditable on-chain",
  "Cada hash, cada verificação, cada compra: tudo registrado em rede pública.": "Every hash, every verification, every purchase: all recorded on a public network.",
  "Você ainda não tem participações": "You do not have positions yet",
  "Explore imóveis disponíveis para fazer seu primeiro investimento.": "Explore available properties to make your first investment.",
  "Minhas participações": "My positions",
  "Sua posição completa: imóveis próprios, participações compradas e histórico financeiro.": "Your full position: owned properties, purchased stakes, and financial history.",
  "Acompanhe suas participações em imóveis e o desempenho de cada uma.": "Track your property stakes and each one's performance.",
  "Transações": "Transactions",
  "Cada operação do seu workspace, com hashes auditáveis.": "Every operation in your workspace, with auditable hashes.",
  "O que você precisa saber antes de investir.": "What you need to know before investing.",
  "O que você precisa saber para captar com seu imóvel.": "What you need to know to raise liquidity with your property.",
  "Investir em imóveis sem precisar comprar a casa inteira.": "Invest in real estate without buying the whole home.",
  "Captar liquidez no seu imóvel sem perder o direito de morar nele.": "Raise liquidity from your property without losing the right to live there.",
  "A u-estate divide imóveis em pequenas participações econômicas. Você compra uma fatia e ganha conforme o imóvel valoriza.": "u-estate divides properties into small economic stakes. You buy a share and benefit as the property appreciates.",
  "A u-estate separa o direito de morar do direito sobre o valor. Você libera uma parte do valor para investidores e mantém a casa.": "u-estate separates the right to live in the property from the right to its value. You release part of the value to investors and keep the home.",
  "Escolha um imóvel": "Choose a property",
  "Veja imóveis verificados disponíveis para investimento.": "See verified properties available for investment.",
  "Defina seu valor": "Set your amount",
  "Veja sua participação valorizar junto com o imóvel.": "Watch your stake appreciate with the property.",
  "Cadastre o imóvel": "Register the property",
  "Envie os documentos básicos.": "Send the basic documents.",
  "Aguarde a análise": "Wait for review",
  "Nossa equipe valida em até 24h.": "Our team validates within 24h.",
  "Disponibilize": "List it",
  "Escolha quanto do imóvel quer ofertar.": "Choose how much of the property to offer.",
  "Investidores compram e o SOL vai pra sua carteira.": "Investors buy and SOL goes to your wallet.",
  "Eu fico dono de uma parte da casa?": "Do I own part of the home?",
  "Como ganho dinheiro?": "How do I make money?",
  "E se eu quiser sair?": "What if I want to exit?",
  "É seguro?": "Is it safe?",
  "Eu perco minha casa?": "Do I lose my home?",
  "Quanto posso captar?": "How much can I raise?",
  "Posso pausar?": "Can I pause?",
  "Quem investe pode entrar na minha casa?": "Can investors enter my home?",
  "Você fica com uma participação no direito sobre o valor do imóvel — o direito de morar continua do proprietário.": "You hold a stake in the property's value right; the right to live there remains with the owner.",
  "Sua participação valoriza junto com o imóvel. Você pode revender quando quiser.": "Your stake appreciates with the property. You can resell whenever you want.",
  "Você pode revender sua participação no marketplace para outros investidores.": "You can resell your stake in the marketplace to other investors.",
  "Sim. Cada imóvel passa por verificação de documentos e tudo é registrado de forma auditável.": "Yes. Every property goes through document verification and everything is recorded audibly.",
  "Não. Você mantém o direito de morar e uma parte do imóvel reservada pra você.": "No. You keep the right to live there and a property share reserved for yourself.",
  "Até a parte que você decidir ofertar. Pode começar pequeno e aumentar depois.": "Up to the share you decide to offer. You can start small and increase later.",
  "Sim. Você pode pausar ou cancelar uma oferta a qualquer momento, antes de ela ser totalmente captada.": "Yes. You can pause or cancel an offer at any time before it is fully raised.",
  "Não. Investidores compram só a parte econômica — não têm direito sobre o uso do imóvel.": "No. Investors only buy the economic part; they have no right to use the property.",
  "Carteira, rede, perfil e preferências.": "Wallet, network, profile, and preferences.",
  "Carteira conectada": "Connected wallet",
  "A carteira que assina suas transações.": "The wallet that signs your transactions.",
  "Trocar carteira": "Change wallet",
  "Quando avisar você.": "When to notify you.",
  "Nova compra na minha oferta": "New purchase in my offer",
  "Novos imóveis para investir": "New properties to invest in",
  "Imóvel não encontrado": "Property not found",
  "Imóvel cadastrado": "Property registered",
  "Documentos enviados.": "Documents submitted.",
  "Validando documentos com a equipe…": "Validating documents with the team...",
  "Documentos validados.": "Documents validated.",
  "Publicar": "Publish",
  "Oferta no ar.": "Offer live.",
  "Oferta concluída.": "Offer completed.",
  "Defina quanto quer captar.": "Define how much you want to raise.",
  "Investidores adquirem participação.": "Investors acquire a stake.",
  "Tokenizar imóvel": "Tokenize property",
  "Tokenizando imóvel": "Tokenizing property",
  "Disponibilizar imóvel": "List property",
  "Aumentar oferta": "Increase offer",
  "Análise reprovada pelo validador": "Review rejected by validator",
  "da oferta": "of the offer",
  "incluindo direito de morar": "including the right to live there",
  "Pode ofertar até": "Can offer up to",
  "Ofertas publicadas": "Published offers",
  "Cancelar oferta": "Cancel offer",
  "Visíveis apenas para você e nossa equipe de análise.": "Visible only to you and our review team.",
  "Documento do proprietário": "Owner document",
  "Hash dos documentos": "Document hash",
  "Documentos ficam protegidos fora da blockchain. Apenas": "Documents remain protected off-chain. Only",
  "Nossa equipe está validando os documentos. Costuma levar até": "Our team is validating the documents. It usually takes up to",
  "Você será avisado por aqui assim que terminar.": "You will be notified here as soon as it finishes.",
  "Seus documentos foram aprovados. Tokenize para gerar o direito de uso e o direito sobre o valor.": "Your documents were approved. Tokenize to generate the use right and value right.",
  "Pronto para captar": "Ready to raise",
  "O imóvel já está tokenizado. Em poucos cliques você publica": "The property is already tokenized. In a few clicks you publish",
  "uma oferta para investidores.": "an offer for investors.",
  "Em carteira": "In wallet",
  "Nova oferta": "New offer",
  "Reservado pra você (com direito de morar):": "Reserved for you (with the right to live there):",
  "Mantém em carteira:": "Keeps in wallet:",
  "Esta nova oferta:": "This new offer:",
  "Falha ao publicar oferta.": "Failed to publish offer.",
  "Disponibilizar imóvel para investidores": "List property for investors",
  "Defina quanto do seu imóvel você quer ofertar. O preço é calculado a partir da avaliação.": "Define how much of your property you want to offer. The price is calculated from the valuation.",
  "Quanto do imóvel você quer ofertar": "How much of the property do you want to offer",
  "5% (oferta menor)": "5% (smaller offer)",
  "Como o imóvel ficará dividido": "How the property will be split",
  "Você pode receber até": "You can receive up to",
  "se a oferta for 100% captada": "if the offer is 100% raised",
  "Cada investidor compra a partir desse valor": "Each investor buys starting from this amount",
  "Por quanto tempo a oferta fica no ar?": "How long does the offer stay live?",
  "Os investidores não podem entrar nem usar o imóvel": "Investors cannot enter or use the property",
  "Você pode pausar a oferta a qualquer momento": "You can pause the offer at any time",
  "Falha ao publicar oferta": "Failed to publish offer",
  "Publicar oferta": "Publish offer",
  "Publicando oferta": "Publishing offer",
  "Painel de Validadores": "Validator Panel",
  "Código de acesso": "Access code",
  "Código de acesso inválido.": "Invalid access code.",
  "Nome": "Name",
  "E-mail": "Email",
  "Aprovar análise": "Approve review",
  "Confirmar reprovação": "Confirm rejection",
  "Justificativa é obrigatória para reprovar.": "A reason is required to reject.",
  "Erro ao aprovar.": "Approval failed.",
  "Erro ao reprovar.": "Rejection failed.",
  "Reprovando…": "Rejecting...",
  "Aprovando…": "Approving...",
  "Aguardando análise": "Waiting for review",
  "Análise": "Review",
  "Análise concluída": "Review completed",
  "Análise reprovada": "Review rejected",
};

const phraseTranslations: Array<[RegExp, string]> = [
  [/Im[oó]veis verificados, a partir de\s*0,001 SOL\./g, "Verified properties, starting at 0.001 SOL."],
  [/Compre uma participa[cç][aã]o no valor econ[oô]mico de im[oó]veis reais\./g, "Buy an economic stake in real properties."],
  [/Voc[eê] ganha conforme o im[oó]vel valoriza, sem precisar comprar a casa inteira\./g, "You benefit as the property appreciates, without buying the whole home."],
  [/Invista em\s*valor imobili[aá]rio\s*sem comprar o im[oó]vel inteiro\./g, "Invest in real estate value without buying the entire property."],
  [/A u-estate separa\s*o direito de usufruir do im[oó]vel\s*e\s*o direito sobre o valor do im[oó]vel/g, "u-estate separates the right to use the property and the right to its value"],
  [/duas posi[cç][oõ]es independentes que abrem uma forma totalmente nova de participa[cç][aã]o econ[oô]mica em im[oó]veis\./g, "two independent positions that open a new way to participate economically in real estate."],
  [/Compre fra[cç][oõ]es de im[oó]veis reais\./g, "Buy fractions of real properties."],
  [/Capte liquidez sem vender a casa\./g, "Raise liquidity without selling your home."],
  [/Do im[oó]vel [aà] participa[cç][aã]o econ[oô]mica em quatro passos\./g, "From property to economic participation in four steps."],
  [/Um im[oó]vel\. Dois direitos\. Liquidez sem perder a casa\./g, "One property. Two rights. Liquidity without losing the home."],
  [/Pensado para quem mora, para quem investe e para quem regula\./g, "Designed for residents, investors, and regulators."],
  [/Pronto para tokenizar valor imobili[aá]rio\?/g, "Ready to tokenize real estate value?"],
  [/Conecte sua carteira, cadastre seu im[oó]vel e comece a operar\./g, "Connect your wallet, register your property, and start operating."],
  [/Toda a infraestrutura on-chain j[aá] est[aá] pronta para voc[eê]\./g, "The on-chain infrastructure is ready for you."],
];

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function preserveEdges(original: string, translatedCore: string) {
  const prefix = original.match(/^\s*/)?.[0] ?? "";
  const suffix = original.match(/\s*$/)?.[0] ?? "";
  return `${prefix}${translatedCore}${suffix}`;
}

function localizeDecimalSeparators(value: string, locale: Locale) {
  if (locale === "en") {
    return value.replace(
      /\b(\d+),(\d+)(?=\s*(?:SOL|USDC|USDT|USD|BRL|%))/g,
      "$1.$2",
    );
  }
  return value.replace(
    /\b(\d+)\.(\d+)(?=\s*(?:SOL|USDC|USDT|USD|BRL|%))/g,
    "$1,$2",
  );
}

export function translateUiText(value: string, locale: Locale) {
  if (locale === "pt") return localizeDecimalSeparators(value, locale);
  const normalized = normalizeText(value);
  if (!normalized) return value;
  const exact = exactTranslations[normalized];
  if (exact) {
    return preserveEdges(value, localizeDecimalSeparators(exact, locale));
  }
  let translated = normalized;
  for (const [pattern, replacement] of phraseTranslations) {
    translated = translated.replace(pattern, replacement);
  }
  return preserveEdges(value, localizeDecimalSeparators(translated, locale));
}

function translateElementAttributes(root: ParentNode, locale: Locale) {
  const selector = "[placeholder],[title],[aria-label],[alt]";
  const elements =
    root instanceof Element && root.matches(selector)
      ? [root, ...Array.from(root.querySelectorAll(selector))]
      : Array.from(root.querySelectorAll(selector));

  for (const el of elements) {
    for (const attr of ["placeholder", "title", "aria-label", "alt"]) {
      const originalAttr = `data-i18n-original-${attr}`;
      const current = el.getAttribute(attr);
      if (!current) continue;
      if (!el.hasAttribute(originalAttr)) {
        el.setAttribute(originalAttr, current);
      }
      const original = el.getAttribute(originalAttr) ?? current;
      const next = translateUiText(original, locale);
      if (current !== next) el.setAttribute(attr, next);
    }
  }
}

const originalTextByNode = new WeakMap<Text, string>();
const ignoredParents = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT"]);

function translateTextNode(node: Text, locale: Locale) {
  const parent = node.parentElement;
  if (!parent || ignoredParents.has(parent.tagName)) return;
  if (parent.closest("[data-i18n-skip='true']")) return;
  if (!originalTextByNode.has(node)) {
    originalTextByNode.set(node, node.nodeValue ?? "");
  }
  const original = originalTextByNode.get(node) ?? "";
  const next = translateUiText(original, locale);
  if (node.nodeValue !== next) node.nodeValue = next;
}

function translateTree(root: ParentNode, locale: Locale) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    translateTextNode(node as Text, locale);
    node = walker.nextNode();
  }
  translateElementAttributes(root, locale);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  const setLocale = (next: Locale) => {
    setLocaleState(next);
  };

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale: () => setLocale(locale === "en" ? "pt" : "en"),
    }),
    [locale],
  );

  useLayoutEffect(() => {
    document.documentElement.lang = locale === "en" ? "en" : "pt-BR";
    translateTree(document.body, locale);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target as Text, locale);
        }
        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeType === Node.TEXT_NODE) {
            translateTextNode(node as Text, locale);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            translateTree(node as Element, locale);
          }
        }
        if (mutation.type === "attributes") {
          translateElementAttributes(mutation.target as Element, locale);
        }
      }
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label", "alt"],
      childList: true,
      characterData: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [locale]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error("useLanguage must be used inside LanguageProvider.");
  }
  return value;
}

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLanguage();
  const isEnglish = locale === "en";
  return (
    <div className="language-toggle" title="Language">
      <button
        type="button"
        className={!isEnglish ? "active" : ""}
        onClick={() => setLocale("pt")}
        aria-label="Switch UI to Portuguese"
      >
        PT
      </button>
      <button
        type="button"
        className={isEnglish ? "active" : ""}
        onClick={() => setLocale("en")}
        aria-label="Switch UI to English"
      >
        EN
      </button>
      {!compact && (
        <span className="language-current">
          {isEnglish ? "English" : "Português"}
        </span>
      )}
    </div>
  );
}
