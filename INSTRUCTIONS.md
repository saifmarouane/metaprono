this is the concept of the project to respect it : 

Aura-Link : Développement d'une plateforme d'entraide citoyenne intelligente avec Next.js 15, Gemini Flash (Streaming) et RAG (Pinecone). Le projet exploite la puissance du "Vibe Coding".

Chaque Ramadan, les associations caritatives de Casablanca sont submergées par l'afflux de demandes : distribution de paniers alimentaires (Quffat Ramadan), organisation des Iftars collectifs, coordination des bénévoles, et gestion des dons Zakat et Sadaqa.

L'association croule sous des milliers de messages, de PDFs de listes de familles nécessiteuses, de plannings de distribution et d'inventaires de denrées. Ils ne veulent pas d'un simple tableur. Ils ont besoin d'une interface "Aura-Sadaqa" adaptée au terrain : un assistant capable de répondre instantanément aux bénévoles et donateurs en se basant sur la base de connaissances de l'association (familles enregistrées, besoins prioritaires, calendrier de distribution, guides de Zakat).


La Stack Technique (Ramadan 2026)

Framework : Next.js 15+ (App Router).
Styling : Tailwind CSS v4 (Design épuré, inspiré des couleurs du Souss).
UI : Shadcn/ui (Accessibilité maximale pour tous les citoyens).
IA : Gemini Flash (Pour comprendre les requêtes en français).
Vector DB : Pinecone (Pour indexer les familles, les dons et les besoins par quartier de Casablanca)
Architecture & "Vibe" du Projet
Pour maintenir une base de code professionnelle, nous utiliserons strictement le format kebab-case pour tous les fichiers.

Structure des Répertoires :

src/
├── app/
│ └── dashboard/
│ ├── layout.tsx # Le wrapper principal pour les routes parallèles
│ ├── @chat/
│ │ └── page.tsx # L'interface de conversation IA (Assistant Sadaqa)
│ └── @explorer/
│ └── page.tsx # L'analyse visuelle des listes de familles et dons
├── components/
│ └── context/
│ └── sadaqa-context.tsx # Gestion de l'état global de la session Ramadan
├── actions/
│ ├── vector-action.ts # Server Action pour traiter et stocker les embeddings PDF
│ └── chat-action.ts # Server Action pour interroger Pinecone et générer les réponses Gemini
└── lib/
└── validators/
└── form-schema.ts # Schémas Zod pour le chat et l'upload
Fonctionnalités Cœurs Requises
A. Routage Parallèle & Slots

Le tableau de bord doit utiliser les slots @chat et @explorer. Cela permet aux utilisateurs de :

Afficher des états de chargement différents pour chaque section via des fichiers loading.tsx indépendants.
Permettre à l'utilisateur de discuter avec l'Assistant Sadaqa pendant que l'"explorer" de familles traite encore les données des listes.
B. RAG (Retrieval-Augmented Generation)

C’est ici que la magie de la "Vibe Coding" opère.

Ingestion : Utiliser une Server Action pour envoyer des segments de documents (listes de familles, inventaires Quffat) vers Pinecone.
Récupération (Retrieval) : Lorsqu'un utilisateur pose une question, l'application doit chercher le contexte le plus pertinent dans Pinecone.
Augmentation : Transmettre ce contexte à Gemini Flash 2.0 pour fournir une réponse "ancrée" (grounded).
C. Tailwind v4

Au lieu d'un fichier tailwind.config.js classique, les étudiants définiront la "vibe" directement dans leur fichier CSS via les nouvelles variables @theme.

Créer une couleur personnalisée (inspirée des lanternes du Ramadan).
Créer une couleur (bleu nuit profond).
D. Gestion des formulaires avec Zod

L'entrée du chat et les téléchargeurs de documents doivent être contrôlés par React Hook Form.

Utiliser zodResolver pour garantir que les messages vides ou les types de fichiers non supportés soient interceptés avant d'atteindre la Server Action.
Afficher les erreurs de validation en temps réel avec les composants Form de Shadcn.
E. Streaming & Expérience "Temps Réel"

Chunk-by-Chunk Delivery : Ne pas attendre la fin de la génération complète de l'IA. La réponse doit être streamée directement depuis chat-action.ts vers le composant UI.
Sadaqa-Pulse Animation : Pendant que le stream est actif, un indicateur visuel (croissant de lune pulsant) dans sadaqa-context.tsx doit signaler que l'Assistant est en train de "réfléchir"..
Checklist d'implémentation pour les étudiants
Initialiser le projet avec Next.js 15 et opter pour le répertoire src/.
Configurer Tailwind v4 dans globals.css via la directive @import "tailwindcss";.
Définir les variables de thème Ramadan.
Configurer un index Pinecone (nommé casa-ramadan-2026) et stocker les clés API dans .env.local.
Créer le sadaqa-context.tsx pour suivre quel document/famille est actif dans les deux slots parallèles.
Développer une Server Action utilisant le SDK Gemini pour générer des réponses à partir des données des familles.
Implémenter le streaming des réponses pour une expérience temps réel.
Utiliser Framer Motion pour animer l'apparition des bulles de chat (crucial pour la "vibe" Ramadan — apparition douce comme une lanterne qui s'allume).

Modalités d'évaluation

1. Qualité du RAG (Retrieval)

L'assistant utilise-t-il réellement le contexte de Pinecone ?
Les réponses sont-elles "grounded" (ancrées) dans les documents fournis (listes de familles, inventaires Quffat) ou l'IA invente-t-elle des informations ?


2. Performance du Streaming

La réponse s'affiche-t-elle par "chunks" (mots par mots) sans latence excessive ?
L'utilisation des Server Actions pour le stream doit être fluide.


3. Précision de Gemini Flash

Le prompt système est-il optimisé pour que l'IA adopte un ton solidaire, bienveillant et spécifique au contexte marocain/Casablanca/Ramadan ?
L'assistant comprend-il les termes : Quffat, Iftar, Zakat Al-Fitr, Sadaqa ?


4. Maîtrise du Routage Parallèle

Les slots @chat et @explorer fonctionnent-ils de manière indépendante ?
Naviguer dans l'explorer ne doit pas couper le stream du chat.


5. Gestion des États (States)

Utilisation pertinente de sadaqa-context.tsx pour synchroniser le document/quartier sélectionné dans l'explorer avec la base de connaissance interrogée par le chat.


6. Validation Zod

Aucun message vide ou fichier corrompu ne doit passer.
Les erreurs doivent être élégamment gérées avec les composants Form de Shadcn.


7. Identité Visuelle Ramadan Casablanca

Utilisation correcte des variables @theme dans Tailwind v4 (--color-sadaqa-gold, --color-casa-night, etc.).
Le rendu doit être professionnel et évoquer l'ambiance des nuits de Ramadan — non "template par défaut".

8. Conventions de Code

Nommage : Respect strict du kebab-case pour tous les fichiers (ex: chat-action.ts et non chatAction.ts).
Structure : Respect de la spécification Casablanca 2026 (dossiers actions/, components/context/, lib/validators/).
Clean Code : Absence de commentaires inutiles, typage TypeScript strict (pas de any), et gestion propre des variables d'environnement.

Critères de performance
Répertoire src/ complet : Incluant les slots @chat et @explorer avec leur logique de loading.tsx et error.tsx.

Actions Serveur : Fichiers actions/vector-action.ts et actions/chat-action.ts fonctionnels avec implémentation du streaming.

Context & State : Le fichier components/context/aura-context.tsx gérant la synchronisation entre les PDF explorés et le chat.

Fichier globals.css : Configuration Tailwind v4 complète avec les variables de thème Ramadan.

Export de l'Index Pinecone : Une preuve de la structure de l'index (via screenshot ou script d'initialisation) montrant les métadonnées indexées (ex: quartier, type_de_besoin).

Set de Données de Test : Au moins 3 fichiers PDF de "Chartes de quartiers" ou "Listes de besoins" utilisés pour tester la précision du RAG.

Instructions d'installation (npm install, configuration des .env.local).

Explication de l'architecture des Parallel Routes utilisées.

Guide rapide sur la personnalisation des couleurs Souss dans le thème.

Schéma d'Architecture : Un diagramme simple montrant le flux de données : Utilisateur -> Server Action -> Pinecone -> Gemini Flash -> Stream UI.

Application Déployée : Un lien vers une instance fonctionnelle (Vercel, Netlify) avec les variables d'environnement configurées.

Vidéo Démo (Loom/MP4) : Une capture d'écran de 2 minutes montrant :

L'upload d'un nouveau document.

L'apparition du document dans le slot @explorer.

Une conversation fluide avec le slot @chat montrant le streaming en temps réel.
