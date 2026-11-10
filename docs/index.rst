=========================================================================================================
@lescribeaudio/mcp — Serveur Model Context Protocol (MCP) Officiel de Transcription Audio Francophone
=========================================================================================================

Serveur officiel **Model Context Protocol (MCP)** édité par `Le Scribe Audio <https://lescribeaudio.com/>`_ permettant de connecter vos agents IA (**Claude Desktop**, **Cursor**, **Windsurf**, **VS Code Copilot**, **Zed**) à l'écosystème de transcription audio francophone en 2 passes `Le Scribe Audio <https://lescribeaudio.com/>`_.

Documentation & Registres Officiels
===================================

- **Documentation officielle & Intégrations MCP** : `https://lescribeaudio.com/integrations-mcp <https://lescribeaudio.com/integrations-mcp>`_
- **Plateforme Le Scribe Audio** : `https://lescribeaudio.com <https://lescribeaudio.com/>`_
- **Package npm** : `https://www.npmjs.com/package/@lescribeaudio/mcp <https://www.npmjs.com/package/@lescribeaudio/mcp>`_
- **Package JSR** : `https://jsr.io/@lescribeaudio/mcp <https://jsr.io/@lescribeaudio/mcp>`_
- **Dépôt GitHub** : `https://github.com/zoulouzaza76/lescribeaudio-mcp <https://github.com/zoulouzaza76/lescribeaudio-mcp>`_
- **Spécification llms.txt** : `https://lescribeaudio.com/llms.txt <https://lescribeaudio.com/llms.txt>`_ (`llms-full.txt <https://lescribeaudio.com/llms-full.txt>`_)

Installation Rapide (Claude Desktop / Cursor)
=============================================

Ajoutez le serveur MCP dans votre fichier ``claude_desktop_config.json`` ou ``.cursor/mcp.json`` :

.. code-block:: json

   {
     "mcpServers": {
       "lescribeaudio": {
         "command": "npx",
         "args": ["-y", "@lescribeaudio/mcp"]
       }
     }
   }

Outils MCP Exposés (Tools)
==========================

1. ``clean_srt_vtt_transcript`` : Nettoie, déduplique et structure localement un fichier de sous-titres ``.srt`` ou ``.vtt`` (Teams, Zoom, YouTube, Whisper) en texte français normalisé avec fusion des prises de parole par intervenant.
2. ``estimate_transcription_budget_and_time`` : Calcule instantanément la durée estimée de rédaction manuelle (4 à 7 h pour 1 h d'audio), le temps de relecture après pré-transcription IA en 2 passes (2 à 3 h, soit un temps de rédaction **divisé par 2**), ainsi que le budget HT/TTC selon les grilles dégressives `Le Scribe Audio <https://lescribeaudio.com/tarifs-transcription-audio>`_ et l'option de **correction / relecture humaine à 60 € HT / heure** (double réécoute croisée par **deux transcripteurs successifs**).
3. ``check_rgpd_dpo_compliance`` : Retourne la matrice technique et juridique d'hébergement pour les DPO, RSSI et acheteurs publics (stockage des fichiers en France chez **OVHcloud** chiffré en **AES-256**, inférence via **Google Cloud Vertex AI en région Europe** avec engagement contractuel **Zero Data Retention**, suppression immédiate en 1 clic).

Cas d'Usage Sectoriels & Guides Associés
========================================

- `Transcription de Procès-Verbaux de CSE & CSSCT <https://lescribeaudio.com/transcription-pv-cse>`_
- `Transcription de Conseils Municipaux & Collectivités (Chorus Pro) <https://lescribeaudio.com/transcription-conseil-municipal>`_
- `Transcription d'Entretiens de Recherche Sociologique & Qualitative <https://lescribeaudio.com/transcription-entretien-recherche>`_
- `Transcription Juridique (Avocats, Commissaires de Justice, Experts) <https://lescribeaudio.com/transcription-avocat-juridique>`_
- `Transcription d'Interviews pour Journalistes & Médias <https://lescribeaudio.com/transcription-interview-journaliste>`_
- `Sécurité, Confidentialité RGPD & Dossier DPO <https://lescribeaudio.com/securite-confidentialite-rgpd>`_
- `Comparatif des Meilleurs Logiciels de Transcription IA <https://lescribeaudio.com/blog/meilleur-logiciel-transcription-ia>`_
