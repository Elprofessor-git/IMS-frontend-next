# IMS Frontend — Interface Next.js pour la Gestion d'Atelier Textile

Interface web moderne développée en **Next.js 15 (App Router)**, migrée depuis une ancienne application Angular vers une architecture plus légère et performante, consommant l'API [IMS Backend](#) via un proxy sécurisé.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss)
![TanStack Query](https://img.shields.io/badge/TanStack-Query-FF4154)

---

## 🎯 Contexte

Ce frontend remplace une ancienne application Angular pour un système de gestion d'atelier de confection textile. La migration a été pilotée module par module (13 domaines métier), avec pour chaque nouvelle fonctionnalité une phase de vérification des contrats d'API réels avant implémentation, afin d'éviter les suppositions incorrectes sur les schémas de données du backend.

---

## 🧱 Stack technique

| Composant | Choix | Pourquoi |
|---|---|---|
| Framework | Next.js 15, App Router | SSR/RSC, écosystème React actuel |
| Langage | TypeScript strict | Sécurité de type sur les échanges avec l'API |
| UI | Tailwind CSS 4 + shadcn/ui | Composants accessibles, personnalisables, pas de lock-in |
| Formulaires | React Hook Form + Zod | Validation typée de bout en bout |
| Données serveur | TanStack Query | Cache, invalidation, retry automatique |
| Tables | TanStack Table | Tri, filtres, pagination sur les listes métier |
| Graphiques | Recharts | Tableaux de bord et rapports |
| État global léger | Zustand | Uniquement où le contexte React ne suffit pas |

---

## 🏗️ Décisions d'architecture

### Proxy API interne plutôt qu'appel direct au backend

Toutes les requêtes du navigateur passent par `/api/proxy/[...path]`, qui tourne côté serveur Next.js. Deux raisons :
- Le token JWT reste dans un **cookie httpOnly**, jamais accessible en JavaScript côté navigateur
- L'appel réel vers le backend se fait serveur-à-serveur, sans dépendre d'une configuration CORS côté client

### Composants réutilisables pour les données métier

- **`ArticleSelect`** — recherche d'articles avec affichage `désignation (référence)`, jamais une référence brute, pour éviter toute ambiguïté dans les formulaires
- **`CommandeSelect`** — sélection de commande affichant client et plateforme associés
- **`ResponsiveTable`** — bascule automatiquement entre tableau classique et cartes empilées selon la largeur d'écran

### Permissions appliquées au niveau composant

Un composant `PermissionGate` (module, mode lecture/écriture) encapsule chaque section sensible de l'interface. Les permissions réelles sont récupérées une fois par session et mises en cache (`staleTime: Infinity`), avec un état optimiste pendant le chargement pour éviter un flash d'interface incohérent.

> ⚠️ Ces restrictions d'interface sont une couche de confort, pas une garantie de sécurité — la vérification faisant réellement autorité se trouve côté API (voir le [backend](#)).

### Assistant IA intégré

Un composant flottant, chargé dynamiquement (`next/dynamic`, `ssr: false`) pour ne pas alourdir le chargement initial du tableau de bord, avec vérification de disponibilité du service avant chaque session de conversation.

---

## 📦 Modules de l'interface

| Domaine | Fonctionnalités |
|---|---|
| Articles & Stock | Recherche, filtres, alertes visuelles, historique par article |
| Mouvements de stock | Filtres combinés, transferts, statistiques |
| Achats & Importations | Création multi-lignes en une soumission, destination par ligne (Commande / Marque / Plateforme / Stock libre), documents joints |
| Commandes clients | Configuration de tailles dynamique, nomenclature (BOM), badge de faisabilité en temps réel |
| Tâches de production | Vue Kanban, workflow d'état par action explicite |
| Partenaires | Plateformes, Marques/Clients, Fournisseurs, historique d'activité |
| Utilisateurs & Rôles | Matrice de permissions par module, création de compte réservée aux administrateurs |
| Rapports & Analytics | Agrégations par fournisseur/marque/plateforme, indicateurs clés, export |
| Assistant IA | Chat contextuel avec accès en lecture aux données, respectant les permissions de l'utilisateur |

---

## 🚀 Démarrage local

### Prérequis
- Node.js 20+
- L'[API backend](#) accessible (locale ou distante)

### Installation

```bash
git clone https://github.com/Elprofessor-git/IMS-frontend-next.git
cd IMS-frontend-next
npm install

cp .env.local.example .env.local
# renseigner API_URL avec l'URL du backend

npm run dev
```

L'application est disponible sur `http://localhost:3000`.

### Variables d'environnement

| Variable | Rôle |
|---|---|
| `API_URL` | URL du backend .NET (lue côté serveur uniquement, jamais exposée au navigateur) |

---

## 📱 Responsive

L'interface est pensée pour un usage confortable sur smartphone, pas seulement "fonctionnelle" :
- Navigation en tiroir (drawer) sous le seuil tablette
- Tableaux de données transformés en cartes empilées plutôt qu'en défilement horizontal
- Formulaires et fenêtres modales en plein écran sur petit écran

---

## 🗂️ Structure du projet

```
src/
├── app/                  # Routes (App Router)
│   ├── (auth)/           # Connexion
│   └── (dashboard)/      # Application principale, par domaine métier
├── components/
│   ├── ui/               # Composants shadcn/ui
│   ├── layout/           # Sidebar, topbar, assistant IA
│   ├── forms/            # Sélecteurs métier réutilisables
│   └── auth/             # Garde de permissions
├── hooks/                # Hooks TanStack Query par ressource
├── lib/                  # Client API, validations Zod
└── types/                # Types TypeScript alignés sur les DTOs backend
```

---

## 📄 Licence

Projet développé dans le cadre d'un Projet de Fin d'Études (PFE) — Licence en Technologie Informatique, ISET Sfax.
