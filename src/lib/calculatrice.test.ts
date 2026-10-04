import { test } from 'node:test'
import assert from 'node:assert/strict'

import { calculer, formater, messageErreur, plafonner, tokeniser, versRpn } from './calculatrice.ts'

/** Valeur d'une expression qui doit réussir. */
function valeur(expression: string): number {
  const r = calculer(expression)
  assert.equal(r.ok, true, `« ${expression} » aurait dû aboutir : ${JSON.stringify(r)}`)
  return (r as { ok: true; valeur: number }).valeur
}

/** Code d'erreur d'une expression qui doit échouer. */
function codeErreur(expression: string): string {
  const r = calculer(expression)
  assert.equal(r.ok, false, `« ${expression} » aurait dû échouer`)
  return (r as { ok: false; erreur: { code: string } }).erreur.code
}

// ─────────────────────────────── bases ───────────────────────────────

test('addition et soustraction', () => {
  assert.equal(valeur('2+3'), 5)
  assert.equal(valeur('10-4'), 6)
  assert.equal(valeur('2+3-1'), 4)
  assert.equal(valeur('100-20-30'), 50)
})

test('multiplication et division', () => {
  assert.equal(valeur('6*7'), 42)
  assert.equal(valeur('84/2'), 42)
  assert.equal(valeur('2*3+4'), 10)
  assert.equal(valeur('2+3*4'), 14)
  assert.equal(valeur('100/5/2'), 10)
})

test('priorité et parenthèses', () => {
  assert.equal(valeur('(2+3)*4'), 20)
  assert.equal(valeur('2*(3+4)'), 14)
  assert.equal(valeur('((1+2)*(3+4))'), 21)
  assert.equal(valeur('2*(3+(4-1))'), 12)
  assert.equal(valeur('-(5)'), -5)
})

// ─────────────────────────── virgule fixe ───────────────────────────

test('0.1 + 0.2 vaut exactement 0.3', () => {
  assert.equal(valeur('0.1+0.2'), 0.3)
  assert.ok(Object.is(valeur('0.1+0.2'), 0.3), 'le résultat doit être identique à 0.3')
})

test('0.1 + 0.2 avec la virgule française', () => {
  assert.ok(Object.is(valeur('0,1+0,2'), 0.3))
})

test('une longue somme décimale ne dérive pas', () => {
  assert.equal(valeur('0.1+0.2'), 0.3)
  assert.equal(valeur('1.1+2.2'), 3.3)
  assert.equal(valeur('0.7+0.1'), 0.8)
  assert.equal(valeur('1/3+1/3+1/3'), 1)
})

test('les nombres à décimales nombreux sont exacts', () => {
  assert.equal(valeur('1.005*100'), 100.5)
  assert.equal(valeur('19.99*3'), 59.97)
  assert.equal(valeur('0.07*100'), 7)
})

test('la division est la seule opération non exacte, et reste juste', () => {
  assert.equal(valeur('1/8'), 0.125)
  assert.equal(valeur('10/4'), 2.5)
  assert.equal(valeur('0.3/0.2'), 1.5)
  assert.equal(valeur('2/3'), 0.666666666667) // plafonné à 12 décimales
})

// ───────────────────────────── pourcent ─────────────────────────────

test('pourcentage postfixe : division par 100', () => {
  assert.equal(valeur('50%'), 0.5)
  assert.equal(valeur('200*10%'), 20)
  assert.equal(valeur('10%'), 0.1)
})

test('pourcentage collant : sur le terme de gauche', () => {
  assert.equal(valeur('200+10%'), 220)
  assert.equal(valeur('200-10%'), 180)
  assert.equal(valeur('200*10%'), 20)
  // Après « ÷ », le % est un simple /100 : 10 % vaut 0.1, et 200/0.1 = 2000.
  assert.equal(valeur('200/10%'), 2000)
})

test('le pourcentage se combine avec la priorité', () => {
  assert.equal(valeur('100+10%'), 110)
  assert.equal(valeur('2*50%'), 1)
  assert.equal(valeur('100+200*10%'), 120)
})

test('pourcentage sur parenthèse', () => {
  assert.equal(valeur('(200+10)%'), 2.1)
  assert.equal(valeur('(50+50)*10%'), 10)
})

test('plusieurs pourcentages', () => {
  // Chaque % se rattache au total courant : 100 + 10 % = 110, + 10 % = 121.
  assert.equal(valeur('100+10%+10%'), 121)
  // 10 % seul vaut 0.1 ; le 20 % qui suit « + » est collant au total courant,
  // soit 20 % de 0.1 = 0.02. Total 0.12.
  assert.equal(valeur('10%+20%'), 0.12)
})

// ────────────────────────────── erreurs ──────────────────────────────

test('division par zéro : erreur dédiée, jamais Infinity', () => {
  assert.equal(codeErreur('1/0'), 'division_par_zero')
  assert.equal(codeErreur('10/(5-5)'), 'division_par_zero')
  assert.equal(codeErreur('200/0%'), 'division_par_zero')
})

test('expression vide ou incomplète', () => {
  assert.equal(codeErreur(''), 'syntaxe')
  assert.equal(codeErreur('   '), 'syntaxe')
  assert.equal(codeErreur('2+'), 'syntaxe')
  assert.equal(codeErreur('*3'), 'syntaxe')
  assert.equal(codeErreur('2++3'), 'syntaxe')
})

test('parenthèse non fermée', () => {
  assert.equal(codeErreur('(2+3'), 'parenthese_non_fermee')
  assert.equal(codeErreur('2*(3+4'), 'parenthese_non_fermee')
})

test('parenthèse fermante en trop', () => {
  assert.equal(codeErreur('2+3)'), 'syntaxe')
})

test('caractère inattendu', () => {
  assert.equal(codeErreur('2+abc'), 'syntaxe')
  assert.equal(codeErreur('2&3'), 'syntaxe')
})

test('aucun résultat Infini ou NaN ne fuite', () => {
  for (const expression of ['1/0', '0/0', '999999999999/0', '2+', '(1']) {
    const r = calculer(expression)
    assert.equal(r.ok, false)
    const message = messageErreur(r)
    assert.ok(message && message.length > 0, 'un message doit être fourni')
    assert.ok(!/Infinity|NaN/.test(message), `« ${expression} » : message ${message}`)
  }
})

test('le message d’erreur est lisible', () => {
  assert.equal(messageErreur(calculer('1/0')), 'Division par zéro')
  assert.equal(messageErreur(calculer('(1')), 'Parenthèse non fermée')
  assert.equal(messageErreur(calculer('2+3')), null)
})

// ─────────────────────────── pipeline RPN ───────────────────────────

test('le tokenizer accepte la virgule et le point', () => {
  const a = tokeniser('1.5')
  const b = tokeniser('1,5')
  assert.equal(a.ok && b.ok, true)
  if (a.ok && b.ok) {
    assert.equal(a.jetons[0].valeur, '1.5')
    assert.equal(b.jetons[0].valeur, '1.5')
  }
})

test('le tokenizer refuse un second séparateur décimal', () => {
  const r = tokeniser('1.2.3')
  assert.equal(r.ok, true) // lu comme 1.2 puis .3 → syntaxe à l'évaluation
  assert.equal(codeErreur('1.2.3'), 'syntaxe')
})

test('la RPN respecte les priorités', () => {
  const t = tokeniser('2+3*4')
  assert.equal(t.ok, true)
  if (t.ok) {
    const r = versRpn(t.jetons)
    assert.equal(r.ok, true)
    if (r.ok) {
      const suite = r.rpn.map((j) => (j.type === 'nombre' ? j.valeur : j.valeur)).join(' ')
      assert.equal(suite, '2 3 4 * +')
    }
  }
})

test('la RPN place le % collant avant son opérateur', () => {
  const t = tokeniser('200+10%')
  assert.equal(t.ok, true)
  if (t.ok) {
    const r = versRpn(t.jetons)
    assert.equal(r.ok, true)
    if (r.ok) {
      assert.equal(r.rpn.map((j) => j.type === 'nombre' ? j.valeur : j.valeur).join(' '), '200 10 % +')
    }
  }
})

// ───────────────────────────── formatage ─────────────────────────────

test('plafonnement à 12 décimales', () => {
  assert.equal(plafonner(1 / 3), 0.333333333333)
  assert.equal(plafonner(2 / 3), 0.666666666667)
  assert.equal(plafonner(1.23456789012345), 1.234567890123)
  assert.equal(plafonner(5), 5)
})

test('formatage français', () => {
  assert.equal(formater(1234.5), '1 234,5')
  assert.equal(formater(0.5), '0,5')
  assert.equal(formater(3), '3')
  assert.equal(formater(NaN), '—')
  assert.equal(formater(Infinity), '—')
})

// ─────────────────────────── cas réels ───────────────────────────

test('enchaînements réels', () => {
  assert.equal(valeur('1200*0,9'), 1080)
  assert.equal(valeur('348-347'), 1)
  assert.equal(valeur('(1050/3)*3'), 1050)
  assert.equal(valeur('15%*2000'), 300)
  assert.equal(valeur('250+250*15%'), 287.5)
})

test('référence OVITA : total planifié 4717, conso 0,9', () => {
  // Cas réel du dossier : le reste en tissu vaut 12715,1 — pas 12711,5, qui
  // correspondait au total 4721 erroné repris du classeur.
  assert.equal(valeur('16960,4-(4717*0,9)'), 12715.1)
})
