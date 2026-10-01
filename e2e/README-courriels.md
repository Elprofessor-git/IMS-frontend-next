# Données de démonstration — module Courriels (E2E)

`e2e/lot-courriels.spec.ts` ne fait **que** piloter l'interface. Les messages qu'il affiche
proviennent d'une boîte Gmail factive insérée directement en base : la connexion OAuth
réelle n'est pas utilisable dans un test automatisé, et l'API Gmail ne doit pas être
sollicitée par une suite de tests.

## Pourquoi une graine plutôt qu'un appel API

Aucun endpoint ne permet de « fabriquer » une connexion Gmail : la seule voie est le
consentement OAuth de l'utilisateur. Injecter les lignes en base contourne ce problème
sans ajouter de endpoint réservé aux tests, qui resterait accessible en production.

## Ré-appliquer la graine

```bash
docker cp backend/e2e/graine-courriels.sql ims-pg-tests:/tmp/seed.sql
docker exec ims-pg-tests psql -U postgres -d postgres -f /tmp/seed.sql
```

Si les lignes existent déjà, la graine est ré-idempotente pour la connexion et les
séquences, mais pas pour les messages : dans ce cas, repartir d'une base de développement
vide, ou supprimer d'abord les lignes `e2e-msg-*`.

## Contenu

| Fil | Messages | Ce qu'il prouve |
|-----|----------|-----------------|
| `e2e-thread-1` | 3 | regroupement en un seul fil, ordre chronologique, HTML avec `<strong>` et image intégrée `cid:`, HTML **hostile** (`<script>`, `javascript:`, `<iframe>`), pièces « inline » qui ne doivent pas être proposées au téléchargement |
| `e2e-thread-2` | 1 | pièce jointe « classique » téléchargeable, lien proxy, conversation ouverte par lien profond |
| `e2e-thread-3` | 1 | état lu, base du filtre « non lus » |

## Nettoyage

```sql
DELETE FROM "GmailAttachments" WHERE "GmailMessageId" IN (SELECT "Id" FROM "GmailMessages" WHERE "GmailMessageId" LIKE 'e2e-msg-%');
DELETE FROM "GmailMessages" WHERE "GmailMessageId" LIKE 'e2e-msg-%';
DELETE FROM "GmailConnections" WHERE "GoogleUserId" = 'google-e2e';
```

## Rappel

Le jeton `RefreshTokenEncrypted` de cette connexion est factice : **aucune action
d'étiquette ne doit être déclenchée depuis l'interface** pendant la validation (lu,
étoile, archive, corbeille), sous peine d'aller toucher l'API Gmail Google avec un jeton
faux. Ce comportement est couvert par `GmailMessageActionTests`, qui intercepte l'API
Gmail par un double enregistreur.
