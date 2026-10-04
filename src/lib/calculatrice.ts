/**
 * Moteur de calcul de la calculatrice flottante.
 *
 * Aucun import : ce module est utilisable tel quel par `node --test`, qui
 * exécute TypeScript nativement (strip-types) sous Node 22+.
 *
 * Sécurité : ni `eval`, ni `new Function`, ni `Function()`. L'analyseur est
 * écrit à la main — tokenizer → shunting-yard → RPN → évaluation.
 *
 * Arithmétique : virgule fixe sur `bigint`, jamais sur des flottants.
 *
 *   Chaque valeur est un entier multiplié par SCALE = 10^18. Les quatre
 *   opérations sont donc exactes, y compris sur des nombres que `number` ne peut
 *   plus distinguer : 16960.4 − 4245.3 vaut exactement 12715.1, là où le
 *   flottant ressort 12715.100000000002. Seules les divisions restent
 *   approximatives — tronquées à 18 décimales, l'affichage est arrondi à 12.
 *
 *   `0.1 + 0.2` vaut donc exactement 0.3, et `1/3 + 1/3 + 1/3` vaut 1.
 */

export type TokenType = 'nombre' | 'operateur' | 'parentheseGauche' | 'parentheseDroite' | 'pourcent'

export interface Token {
  type: TokenType
  valeur: string
  /** `pourcent` uniquement : le pourcentage est collant à un terme. */
  collant?: boolean
}

export type Operateur = '+' | '-' | '*' | '/'

export type ErreurCalcul =
  | { code: 'division_par_zero' }
  | { code: 'syntaxe'; position: number }
  | { code: 'parenthese_non_fermee'; position: number }

export type ResultatCalcul =
  | { ok: true; valeur: number; rpn: Token[] }
  | { ok: false; erreur: ErreurCalcul }

export const MESSAGES_ERREUR: Record<ErreurCalcul['code'], string> = {
  division_par_zero: 'Division par zéro',
  syntaxe: 'Expression incomplète',
  parenthese_non_fermee: 'Parenthèse non fermée',
}

const PRIORITE: Record<Operateur, number> = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
}

const OPERATEURS: readonly string[] = ['+', '-', '*', '/']

/**
 * Échelle interne : 18 décimales.
 *
 * Construit via le constructeur et non via le littéral `10n`, que la cible
 * ES2017 du projet refuse. Relever `target` globalement pour ce seul besoin
 * serait disproportionné.
 */
const SCALE = BigInt(`1${'0'.repeat(18)}`)

/** Décimales affichées. L'interne en garde 18, pour absorber les arrondis. */
export const MAX_DECIMALES = 12

const ZERO = BigInt(0)
const DEUX = BigInt(2)
const CENT = BigInt(100)

/** Arrondi à l'échelle interne, en `bigint`. */
function versEchelle(litteral: string): bigint {
  const [entier, decimal = ''] = litteral.split('.')
  const complet = `${entier}${decimal.padEnd(18, '0').slice(0, 18)}`
  return BigInt(complet === '' || complet === '-' ? '0' : complet)
}

/**
 * Retire l'échelle et rend un `number`, arrondi à MAX_DECIMALES.
 *
 * Le passage par `Number(bigint)` est proscrit : au-delà de 2^53 il arrondit au
 * multiple de 1024 le plus proche, et 12715.5 ressortirait 12715.499999999998.
 * On travaille donc sur la chaîne de chiffres, seule voie exacte.
 */
function horsEchelle(valeur: bigint): number {
  const signe = valeur < ZERO ? -1 : 1
  const absolu = valeur < ZERO ? -valeur : valeur

  // Arrondi demi-supérieur vers une échelle de 10^MAX_DECIMALES, en bigint.
  // Passer par Math.round serait faux : 12715.5 × 10^12 dépasse 2^53 et
  // ressortirait 12715.499999999998.
  const diviseur = BigInt(10) ** BigInt(18 - MAX_DECIMALES)
  const arrondi = ((absolu + diviseur / DEUX) / diviseur)
    .toString()
    .padStart(MAX_DECIMALES + 1, '0')

  return signe * Number(`${arrondi.slice(0, -MAX_DECIMALES)}.${arrondi.slice(-MAX_DECIMALES)}`)
}

/** Arrondit demi-supérieur à `decimales`. */
export function arrondir(valeur: number, decimales: number): number {
  if (!Number.isFinite(valeur)) return valeur
  const f = Math.pow(10, Math.min(decimales, MAX_DECIMALES))
  return Math.round(valeur * f) / f
}

/** Plafonne une valeur à MAX_DECIMALES décimales. */
export function plafonner(valeur: number, decimales = MAX_DECIMALES): number {
  return arrondir(valeur, decimales)
}

/**
 * Découpe l'expression en jetons.
 *
 * Virgule et point sont acceptés comme séparateurs décimaux : la virgule est la
 * convention française, mais un collage depuis une source américaine doit
 * fonctionner. Un second séparateur dans un même nombre est refusé.
 *
 * Le pourcentage est classé ici, son sort étant alors décidé :
 *   — collant quand le signe qui précède est `+` ou `-` : `200 + 10 %` = 220 ;
 *   — postfixe sinon : `50 %` = 0.5, `200 × 10 %` = 20, `(200+10) %` = 2.1.
 * Une parenthèse refermée annule tout effet du signe.
 *
 * Le signe moins unaire est réécrit `0 -` : il n'a de sens qu'en début
 * d'expression ou après un opérateur.
 */
export function tokeniser(expression: string): { ok: true; jetons: Token[] } | { ok: false; erreur: ErreurCalcul } {
  const jetons: Token[] = []
  let i = 0

  /** Vrai si un opérande est attendu : le `-` qui suit est alors unaire. */
  const attendOperande = (): boolean => {
    if (jetons.length === 0) return true
    const dernier = jetons[jetons.length - 1]
    return dernier.type === 'operateur' || dernier.type === 'parentheseGauche'
  }

  let signePrecedent: Operateur | null = null
  let collantPossible = false

  const lireNombre = (): void => {
    const debut = i
    let point = false
    while (i < expression.length) {
      const d = expression[i]
      if (d >= '0' && d <= '9') {
        i += 1
      } else if ((d === ',' || d === '.') && !point) {
        point = true
        i += 1
      } else {
        break
      }
    }
    jetons.push({ type: 'nombre', valeur: expression.slice(debut, i).replace(',', '.') })
    // Le nombre consomme le signe qui le précédait : un second `%` collé au
    // même nombre n'est plus collant.
    collantPossible = signePrecedent === '+' || signePrecedent === '-'
  }

  const pousserOperateur = (valeur: Operateur): void => {
    jetons.push({ type: 'operateur', valeur })
    signePrecedent = valeur
    collantPossible = false
  }

  while (i < expression.length) {
    const c = expression[i]

    if (c === ' ' || c === '\t' || c === '\n') {
      i += 1
      continue
    }

    if (c === '(') {
      jetons.push({ type: 'parentheseGauche', valeur: c })
      signePrecedent = null
      collantPossible = false
      i += 1
      continue
    }

    if (c === ')') {
      jetons.push({ type: 'parentheseDroite', valeur: c })
      signePrecedent = null
      collantPossible = false
      i += 1
      continue
    }

    if (c === '%') {
      jetons.push(collantPossible
        ? { type: 'pourcent', valeur: c, collant: true }
        : { type: 'pourcent', valeur: c, collant: false })
      collantPossible = false
      i += 1
      continue
    }

    if (OPERATEURS.includes(c)) {
      if (c === '-' && attendOperande()) {
        jetons.push({ type: 'nombre', valeur: '0' })
      }
      pousserOperateur(c as Operateur)
      i += 1
      continue
    }

    if (c >= '0' && c <= '9') {
      lireNombre()
      continue
    }

    // « .5 » et « ,5 » sont acceptés ; un séparateur isolé ne l'est pas.
    if ((c === ',' || c === '.') && expression[i + 1] >= '0' && expression[i + 1] <= '9') {
      lireNombre()
      continue
    }

    return { ok: false, erreur: { code: 'syntaxe', position: i } }
  }

  return { ok: true, jetons }
}

/**
 * Convertit l'infixe en RPN (algorithme de la gare de triage de Dijkstra).
 *
 * Un opérateur unaire, donc postfixe, sort immédiatement : sa portée est le
 * sommet de la pile, pas l'opérateur qui suit. Un `%` collant, lui, dépend de
 * l'opérateur qui le suit et reste donc empilé.
 */
export function versRpn(jetons: Token[]): { ok: true; rpn: Token[] } | { ok: false; erreur: ErreurCalcul } {
  const sortie: Token[] = []
  const pile: Token[] = []

  for (const jeton of jetons) {
    switch (jeton.type) {
      case 'nombre':
        sortie.push(jeton)
        break

      case 'operateur': {
        // Un % collant au sommet doit être émis AVANT cet opérateur : sa portée
        // est cet opérateur. Sans cela « 100 + 10 % + 10 % » produirait
        // 100 10 + 10 % + et le premier % serait absorbé par le second `+`.
        if (pile.length > 0 && pile[pile.length - 1].type === 'pourcent') {
          sortie.push(pile.pop() as Token)
        }
        const o1 = PRIORITE[jeton.valeur as Operateur]
        while (
          pile.length > 0 &&
          pile[pile.length - 1].type === 'operateur' &&
          PRIORITE[pile[pile.length - 1].valeur as Operateur] >= o1
        ) {
          sortie.push(pile.pop() as Token)
        }
        pile.push(jeton)
        break
      }

      case 'pourcent':
        if (jeton.collant) pile.push(jeton)
        else sortie.push(jeton)
        break

      case 'parentheseGauche':
        pile.push(jeton)
        break

      case 'parentheseDroite': {
        while (pile.length > 0 && pile[pile.length - 1].type !== 'parentheseGauche') {
          sortie.push(pile.pop() as Token)
        }
        if (pile.length === 0) return { ok: false, erreur: { code: 'syntaxe', position: 0 } }
        pile.pop()
        break
      }
    }
  }

  while (pile.length > 0) {
    const jeton = pile.pop() as Token
    if (jeton.type === 'parentheseGauche') return { ok: false, erreur: { code: 'parenthese_non_fermee', position: 0 } }
    sortie.push(jeton)
  }

  return { ok: true, rpn: sortie }
}

/**
 * Évalue la RPN sur des entiers `bigint` mis à l'échelle par SCALE.
 *
 * Sémantique du `%` collant, alignée sur la calculatrice Windows :
 *   200 + 10 %  → 220      200 − 10 %  → 180
 *   200 × 10 %  → 20       200 ÷ 10 %  → 10
 * Un `%` collant est consommé par l'opérateur qui le suit ; un `%` postfixe
 * divise le sommet par 100.
 */
function evaluer(rpn: Token[]): ResultatCalcul {
  const pile: bigint[] = []
  const cent = CENT * SCALE

  for (let i = 0; i < rpn.length; i++) {
    const jeton = rpn[i]

    if (jeton.type === 'nombre') {
      pile.push(versEchelle(jeton.valeur))
      continue
    }

    if (jeton.type === 'pourcent') {
      // Le collant est laissé au fond : c'est l'opérateur suivant qui l'applique
      // au terme de gauche.
      if (jeton.collant) continue
      if (pile.length === 0) return { ok: false, erreur: { code: 'syntaxe', position: i } }
      pile.push((pile.pop() as bigint) / CENT)
      continue
    }

    if (jeton.type !== 'operateur') return { ok: false, erreur: { code: 'syntaxe', position: i } }

    // Un % collant juste avant consomme l'opérande de droite : il ne reste que
    // le terme de gauche sur la pile. « 200 + 10 % » → a = 200, collant = 10.
    const collant = rpn[i - 1]?.type === 'pourcent' && rpn[i - 1].collant === true

    if (pile.length < (collant ? 1 : 2)) return { ok: false, erreur: { code: 'syntaxe', position: i } }

    const droite = pile.pop() as bigint
    const a = pile.pop() as bigint
    const b = collant ? ZERO : droite

    switch (jeton.valeur) {
      case '+':
        // « 200 + 10 % » : le pourcentage est pris sur le terme de gauche.
        pile.push(collant ? a + (droite * a) / cent : a + b)
        break
      case '-':
        pile.push(collant ? a - (droite * a) / cent : a - b)
        break
      case '*':
      case '/': {
        // Après « × » et « ÷ », le pourcentage est un simple /100 : « 200 × 10 % »
        // vaut 20, et « 200 ÷ 10 % » vaut 2000.
        const b2 = collant ? droite / cent : b
        if (jeton.valeur === '*') {
          pile.push((a * b2) / SCALE)
        } else {
          if (b2 === ZERO) return { ok: false, erreur: { code: 'division_par_zero' } }
          pile.push((a * SCALE) / b2)
        }
        break
      }
    }
  }

  if (pile.length !== 1) return { ok: false, erreur: { code: 'syntaxe', position: rpn.length } }
  return { ok: true, valeur: horsEchelle(pile[0] as bigint), rpn }
}

/** Calcule une expression. Aucun effet de bord, jamais d'exception. */
export function calculer(expression: string): ResultatCalcul {
  const texte = expression.trim()
  if (texte === '') return { ok: false, erreur: { code: 'syntaxe', position: 0 } }

  const tok = tokeniser(texte)
  if (!tok.ok) return { ok: false, erreur: tok.erreur }

  const rpnResult = versRpn(tok.jetons)
  if (!rpnResult.ok) return { ok: false, erreur: rpnResult.erreur }
  if (rpnResult.rpn.length === 0) return { ok: false, erreur: { code: 'syntaxe', position: 0 } }

  return evaluer(rpnResult.rpn)
}

/** Message utilisateur pour un résultat, ou null si le calcul est valide. */
export function messageErreur(resultat: ResultatCalcul): string | null {
  return resultat.ok ? null : MESSAGES_ERREUR[resultat.erreur.code]
}

/** Formate un nombre pour l'affichage français, sans zéros inutiles. */
export function formater(valeur: number, decimales = 10): string {
  if (!Number.isFinite(valeur)) return '—'
  const texte = arrondir(valeur, Math.min(decimales, MAX_DECIMALES)).toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.min(decimales, MAX_DECIMALES),
  })
  // ICU varie selon les versions : espace fine insécable (U+202F) ou insécable
  // (U+00A0). On uniformise, sinon l'affichage change d'un runtime à l'autre.
  return texte.replace(/[\u00a0\u202f\u2009]/g, ' ')
}
