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
  "Valor reservado": "Reserved value",
  "Captação possível": "Possible raise",
  "cotação OKX indisponível": "OKX quote unavailable",
  "cotação indisponível": "quote unavailable",
  "se você ofertar 100% da parte disponível": "if you list 100% of the available share",
  "Reservado pra você": "Reserved for you",
  "Disponível para investidores": "Available to investors",
  "O que acontece depois": "What happens next",
  "Nossa equipe analisa os documentos em até 24h. Quando aprovado, você publica a oferta com um clique.": "Our team reviews the documents within 24h. Once approved, you can publish the offer with one click.",
  "Falha ao enviar": "Submission failed",
  "Cancelar": "Cancel",
  "Voltar": "Back",
  "Continuar": "Continue",
  "Registrar imóvel": "Register property",
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
  "Registrado": "Registered",
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
  "Sim. Cada imóvel passa por verificação de documentos e tudo é registrado de forma auditável.": "Yes. Every property goes through document verification and everything is recorded in an auditable way.",
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
  "Jornada": "Journey",
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
  "Ativa": "Active",
  "Cancelada": "Cancelled",
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
  "Análise reprovada": "Review rejected",
  "Página não encontrada": "Page not found",
  "Imóveis cadastrados": "Registered properties",
  "Novo investimento": "New investment",
  "Histórico": "History",
  "Resultado": "Result",
  "Total": "Total",
  "Patrimônio próprio": "Owned equity",
  "desde o primeiro investimento": "since the first investment",
  "Em uma frase": "In one sentence",
  "Em 3 passos": "In 3 steps",
  "Em 4 passos": "In 4 steps",
  "Perguntas frequentes": "Frequently asked questions",
  "A partir de poucos centésimos de SOL.": "Starting from a few hundredths of SOL.",
  "Onde os contratos da u-estate estão publicados.": "Where u-estate contracts are published.",
  "Testnet recomendada": "Recommended testnet",
  "Desenvolvimento local": "Local development",
  "Em breve": "Coming soon",
  "Perfil": "Profile",
  "Apenas para uso na interface.": "Only used in the interface.",
  "Nome amigável": "Friendly name",
  "Email para notificações (opcional)": "Notification email (optional)",
  "Notificações": "Notifications",
  "Análise concluída": "Review completed",
  "Resumo semanal": "Weekly summary",
  "Tipo": "Type",
  "Valor": "Value",
  "Data": "Date",
  "Hash": "Hash",
  "Todas": "All",
  "Cadastro": "Registration",
  "Oferta publicada": "Offer published",
  "Investimento": "Investment",
  "Verificação": "Verification",
  "Tokenização": "Tokenization",
  "Marketplace": "Marketplace",
  "Receba": "Receive",
  "Acompanhe": "Track",
  "Documentos são auditados pelo verificador autorizado da rede.": "Documents are audited by the network's authorized verifier.",
  "A proprietária registra o imóvel, envia documentos e gera hashes determinísticos on-chain.": "The owner registers the property, submits documents, and generates deterministic on-chain hashes.",
  "O imóvel é representado por dois direitos: o direito de uso e o direito sobre o valor.": "The property is represented by two rights: the use right and the value right.",
  "A proprietária pode listar parte do direito sobre o valor para captar liquidez.": "The owner can list part of the value right to raise liquidity.",
  "A u-estate conecta quem quer captar liquidez sem vender a casa com quem quer investir em valor imobiliário a partir de pequenas frações.": "u-estate connects people who want to raise liquidity without selling their home with people who want to invest in real estate value through small fractions.",
  "Acesso a participação econômica em imóveis a partir de 0,001 SOL. Sem cartório, sem contrato em papel, sem precisar comprar o imóvel inteiro.": "Access economic participation in properties starting at 0.001 SOL. No notary office, no paper contract, no need to buy the whole property.",
  "Investimento mínimo a partir de R$ 50": "Minimum investment starting at R$ 50",
  "Histórico e documentos auditáveis on-chain": "Auditable on-chain history and documents",
  "Diversifique entre vários imóveis": "Diversify across multiple properties",
  "Você continua morando e mantém o controle do uso. Apenas a fração econômica que você quiser fica disponível para investidores.": "You keep living there and keep control of use. Only the economic fraction you choose becomes available to investors.",
  "O usufruto continua com você": "The usufruct remains with you",
  "Você decide quanto disponibilizar": "You decide how much to list",
  "Do imóvel à participação econômica em quatro passos.": "From property to economic participation in four steps.",
  "A u-estate destaca, de um mesmo imóvel, dois direitos que podem circular separadamente — mantendo a proprietária no controle do uso, enquanto a participação no valor pode ser ofertada a investidores.": "u-estate separates two rights from the same property so they can circulate independently: the owner keeps control of use while the value participation can be offered to investors.",
  "Pronto para tokenizar valor imobiliário?": "Ready to tokenize real estate value?",
  "Conecte sua carteira, cadastre seu imóvel e comece a operar. Toda a infraestrutura on-chain já está pronta para você.": "Connect your wallet, register your property, and start operating. The full on-chain infrastructure is ready for you.",
  "Hackathon prototype": "Hackathon prototype",
  "Seus documentos foram aprovados. Tokenize o imóvel para gerar o direito de uso e o direito sobre o valor antes de publicar uma oferta.": "Your documents were approved. Tokenize the property to generate the use right and value right before publishing an offer.",
  "Nossa equipe está validando os documentos. Acompanhe o status pela página do imóvel.": "Our team is validating the documents. Track the status on the property page.",
  "Validação documental obrigatória antes da tokenização.": "Document validation is required before tokenization.",
  "Aguardando validação": "Waiting for validation",
  "Validação documental obrigatória antes de tokenizar este imóvel.": "Document validation is required before this property can be tokenized.",
  "O registro do imóvel foi validado. Tokenize para gerar o direito de uso e o direito sobre o valor.": "Your property registration was validated. Tokenize it to generate the use right and value right.",
  "Depois do registro, o imóvel precisa ser validado antes da tokenização ficar disponível.": "After registration, the property must be validated before tokenization is available.",
  "Analise os documentos antes que proprietários possam tokenizar imóveis registrados.": "Review property documents before owners can tokenize registered properties.",
  "imóveis": "properties",
  "participações": "positions",
  "Sua participação": "Your stake",
  "Esta parte fica garantida pra você, junto com o direito de morar. Os outros": "This part stays guaranteed for you, together with the right to live there. The other",
  "% poderão ser ofertados a investidores.": "% can be offered to investors.",
  "até": "up to",
  "Documentação rejeitada pelo validador.": "Documentation rejected by the validator.",
  "Captação": "Raise",
  "100% captado.": "100% raised.",
  "% captado": "% raised",
  "Operação falhou.": "Operation failed.",
  "Operação falhou": "Operation failed",
  "Concluída": "Completed",
  "Matrícula": "Deed",
  "Detalhes técnicos do registro on-chain": "Technical details of the on-chain record",
  "Hash da localização": "Location hash",
  "Contrato de participações": "Participation contract",
  "Documentos ficam protegidos fora da blockchain. Apenas hashes determinísticos são registrados publicamente.": "Documents remain protected off-chain. Only deterministic hashes are publicly registered.",
  "Você mantém o direito de morar e uma parte garantida.": "You keep the right to live there and a guaranteed share.",
  "% (máximo disponível)": "% (maximum available)",
  "Investimento mínimo por pessoa": "Minimum investment per person",
  "1 mês": "1 month",
  "4 meses": "4 months",
  "1 ano": "1 year",
  "2 anos": "2 years",
  "Operações registradas e auditáveis": "Recorded and auditable operations",
  "Como investidores verão": "How investors will see it",
  "Duração": "Duration",
  "Solicite o código ao administrador do sistema.": "Ask the system administrator for the code.",
  "Acesso restrito à equipe de operações u-estate.": "Restricted access for the u-estate operations team.",
  "Não é uma página para clientes.": "This is not a customer page.",
  "Identidade do proprietário": "Owner identity",
  "Análise aprovada com sucesso.": "Review approved successfully.",
  "Análise reprovada. Proprietário será notificado.": "Review rejected. The owner will be notified.",
  "Justificativa da reprovação": "Rejection reason",
  "Descreva o que está incorreto ou faltando — esta mensagem será mostrada ao proprietário.": "Describe what is incorrect or missing. This message will be shown to the owner.",
  "Obrigatória. Seja claro para que o proprietário possa corrigir.": "Required. Be clear so the owner can correct it.",
  "Este imóvel já foi analisado.": "This property has already been reviewed.",
  "Análise de imóveis": "Property review",
  "Review property documents before owners can tokenize registered properties.": "Review property documents before owners can tokenize registered properties.",
  "Analisados nesta sessão": "Reviewed in this session",
  "Carregando imóveis…": "Loading properties...",
  "Nenhum imóvel aguardando análise.": "No properties waiting for review.",
  "Já analisados": "Already reviewed",
  "documento(s) · Enviado": "document(s) · Sent",
  "u-estate · Painel de Validadores": "u-estate · Validator Panel",
  "Listing não encontrado após sync.": "Listing not found after sync.",
  "Imóvel não encontrado.": "Property not found.",
  "Oferta não encontrada.": "Offer not found.",
  "Esta oferta não está vinculada ao registro on-chain local atual. Atualize os dados antes de comprar.": "This offer is not linked to the current local on-chain record. Refresh the data before buying.",
  "Pronto pra publicar": "Ready to publish",
  "Compra indisponível": "Purchase unavailable",
  "Modo de simulação local": "Local simulation mode",
  "Esta visualização não é aceite on-chain. O aceite final da demo exige assinaturas na Solana Devnet e reconciliação on-chain.": "This view is not on-chain acceptance. Final demo acceptance requires Solana Devnet signatures and on-chain reconciliation.",
  "Esta carteira não possui uma posição econômica para o ativo selecionado.": "This wallet does not hold an economic position for the selected asset.",
  "Dados básicos do imóvel e do token": "Basic property and token data",
  "Referências do token": "Token references",
  "Token de valor": "Value token",
  "Carteira do proprietário": "Owner wallet",
  "A troca de rede é gerenciada pelo Solana Wallet Adapter.": "Network switching is handled by the Solana wallet adapter.",
  "A carteira deve usar Solana Devnet": "Wallet must use Solana Devnet",
  "Usar Solana Devnet": "Use Solana Devnet",
  "Usufruto": "Usufruct",
  "Receba SOL direto na sua carteira": "Receive SOL directly to your wallet",
  "Gráfico de mercado": "Market chart",
  "% último tick": "% last tick",
  "Volume 24h": "24h volume",
  "Profundidade do pool": "Pool depth",
  "Valor do oráculo": "Oracle value",
  "Gráfico de preço do ativo": "Asset price chart",
  "Investimento não encontrado": "Investment not found",
  "Voltar ao portfólio": "Back to portfolio",
  "token de valor econômico": "economic value token",
  "Encontrar liquidez": "Find liquidity",
  "PnL não realizado": "Unrealized PnL",
  "Tamanho da posição": "Position size",
  "Fundamentos do ativo": "Asset fundamentals",
  "Avaliação de mercado": "Market valuation",
  "Oferta de valor livre": "Free-value supply",
  "Valor livre vendido": "Sold free value",
  "Sua posição": "Your position",
  "Custo de entrada": "Entry cost",
  "Adquirido": "Acquired",
  "Última tx": "Last tx",
  "Profundidade de mercado": "Market depth",
  "Liquidez ativa": "Active liquidity",
  "Unidades ativas": "Active units",
  "Modelo bid/ask": "Bid/ask model",
  "Apenas venda primária": "Primary sale only",
  "Não sincronizado": "Not synced",
  "Desconhecido": "Unknown",
  "Ver atividade": "View activity",
};

const reverseExactTranslations: Record<string, string> = Object.fromEntries(
  Object.entries(exactTranslations).map(([pt, en]) => [en, pt]),
);

const phraseTranslations: Array<[RegExp, string]> = [
  [/Disponibilize (.+)/g, "List $1"],
  [/^(.+) est[aá] em an[aá]lise$/g, "$1 is in review"],
  [/Seu im[oó]vel j[aá] est[aá] tokenizado\. Voc[eê] pode captar at[eé] ([0-9.,]+ SOL) liberando uma parte do im[oó]vel\./g, "Your property is already tokenized. You can raise up to $1 by releasing part of the property."],
  [/([0-9.,]+)% captado/g, "$1% raised"],
  [/([0-9.,]+)% do im[oó]vel/g, "$1% of the property"],
  [/([0-9.,]+) unidades/g, "$1 units"],
  [/Oferta de ([0-9.,]+)% · ([0-9.,]+) units/g, "$1% offer · $2 units"],
  [/Oferta de ([0-9.,]+)% · ([0-9.,]+) unidades/g, "$1% offer · $2 units"],
  [/Publicada em ([0-9/]+)/g, "Listed on $1"],
  [/O im[oó]vel j[aá] est[aá] tokenizado\. Em poucos cliques voc[eê] publica uma oferta para investidores\./g, "The property is already tokenized. In a few clicks you publish an offer for investors."],
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
  [/ visão do ativo/g, " asset view"],
  [/ - token de valor econômico/g, " - economic value token"],
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
  const normalized = normalizeText(value);
  if (!normalized) return value;
  if (locale === "pt") {
    const reverseExact = reverseExactTranslations[normalized];
    if (reverseExact) {
      return preserveEdges(value, localizeDecimalSeparators(reverseExact, locale));
    }
    return localizeDecimalSeparators(value, locale);
  }
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
  const current = node.nodeValue ?? "";
  if (!originalTextByNode.has(node)) {
    originalTextByNode.set(node, current);
  }
  let original = originalTextByNode.get(node) ?? "";
  let next = translateUiText(original, locale);
  if (current !== original && current !== next) {
    original = current;
    originalTextByNode.set(node, original);
    next = translateUiText(original, locale);
  }
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
