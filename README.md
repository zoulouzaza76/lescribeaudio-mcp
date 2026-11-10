# `lescribeaudio-mcp` — Connecteur Officiel Model Context Protocol (MCP)

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](./LICENSE)
[![Node.js >= 18](https://img.shields.io/badge/Node.js-%3E%3D18.0-339933.svg)](https://nodejs.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-4f46e5.svg)](./package.json)
[![Benchmark DOI](https://img.shields.io/badge/Benchmark%20DOI-10.5281%2Fzenodo.24087383-blue.svg)](https://doi.org/10.5281/zenodo.24087383)

**FR** · Pont open-source léger (`0` dépendance externe, Node.js `>= 18`) reliant tout client **Model Context Protocol (MCP)** en mode `STDIO` (**Claude Desktop**, **Cursor**, **Windsurf**, **Claude Code**, **Antigravity**) au serveur MCP **Streamable HTTP** officiel de [**Le Scribe Audio**](https://lescribeaudio.com/integrations-mcp) (`https://lescribeaudio.com/api/mcp`).

**EN** · Zero-dependency open-source Node.js (`>= 18`) `STDIO ⇄ Streamable HTTP` bridge connecting **Model Context Protocol (MCP)** clients to the official [**Le Scribe Audio MCP Server**](https://lescribeaudio.com/integrations-mcp) (`https://lescribeaudio.com/api/mcp`).

---

## Pourquoi utiliser le Serveur MCP Le Scribe Audio ?

Au lieu de copier-coller des dizaines de pages de procès-verbaux ou d'entretiens dans une fenêtre de discussion, votre assistant IA interroge directement et de manière cloisonnée vos dossiers vérifiés :

- **Architecture de pré-transcription en 2 passes** évaluée à **72,0 révisions moyennes** sous Microsoft Word (`Révision > Comparer`) sur corpus académiques français, permettant de **diviser par 2 le temps de rédaction** (2 à 3 h de réécoute intégrale et mise en forme pour 1 h d'audio, contre 4 à 7 h en frappe manuelle complète au casque) — voir le [Benchmark officiel ouvert 2026](https://lescribeaudio.com/benchmarks-precision-transcription-ia-francais) (DOI : [`10.5281/zenodo.24087383`](https://doi.org/10.5281/zenodo.24087383)).
- **Option de relecture humaine professionnelle** disponible à **60 € HT / heure** (`1,00 € HT / min`) assurée par **deux transcripteurs successifs** (double réécoute croisée).
- **Conformité RGPD & Sécurité** : stockage des fichiers audio et transcriptions en **France chez OVHcloud (chiffrés en AES-256)** avec suppression définitive immédiate en 1 clic, et inférence via **Google Cloud Vertex AI (en région Europe)** sans conservation ni entraînement sur vos données (*Zero Data Retention*) — détails complets sur [Sécurité & RGPD](https://lescribeaudio.com/securite-rgpd).

---

## Les 6 Outils MCP Exposés (`tools/call`)

| Outil MCP | Mode | Paramètres | Description fonctionnelle |
| :--- | :---: | :--- | :--- |
| **`list_transcriptions`** | Lecture seule | `limit` *(1–50)*, `status` *(`all`, `completed`, `processing`, `failed`)* | Liste vos enregistrements récents (`file_id`, titre, durée `HH:MM:SS`, statut, date et disponibilité d'une synthèse). |
| **`search_transcriptions`** | Lecture seule | `query` *(requis)*, `limit` *(1–20)* | Recherche plein texte un thème, mot-clé ou intervenant dans vos titres, synthèses et transcriptions avec extraits horodatés. |
| **`get_transcription_text`** | Lecture seule | `file_id` *(requis)*, `include_timecodes`, `max_chars`, `offset_chars` | Récupère le texte intégral diarisé par intervenant (`[00:14:20] M. Martin : …`) avec pagination jusqu'à 10 h d'audio. |
| **`get_transcription_summary`** | Lecture seule | `file_id` *(requis)* | Retourne la **synthèse exécutive suivie du développement chrono-thématique** générée sur le dossier. |
| **`rename_speaker_label`** | Écriture ciblée | `file_id`, `old_speaker`, `new_speaker` *(requis)* | Applique le **renommage / codage global d'une étiquette d'intervenant (diarisation)** (ex. `Intervenant 1` → `Enquêté P1` ou `Mme Dubois`) sur toutes ses prises de parole et met à jour le fichier Word (`.docx`) 100 % modifiable. |
| **`get_export_urls`** | Lecture seule | `file_id` *(requis)* | Fournit le lien du lecteur interactif Studio et les URLs d'export : document **Word (`.docx`) standard 100 % modifiable**, `.pdf`, sous-titres `.srt` / `.vtt`, `.txt` et corpus `IRaMuTeQ`. |

---

## Démarrage Rapide (FR)

### 1. Générer votre clé personnelle MCP (`lsa_mcp_...`)
Rendez-vous sur [**lescribeaudio.com/integrations-mcp**](https://lescribeaudio.com/integrations-mcp#mcp-config-builder) pour générer en 1 clic votre jeton personnel signé HMAC-SHA256 à durée de vie bornée (**30, 90 ou 180 jours**).

### 2. Connexion directe Streamable HTTP (Cursor, Windsurf, Claude Code)
Si votre client supporte nativement le transport **Streamable HTTP** (`2025-06-18` / `2025-03-26`), aucune installation locale n'est requise :

```json
{
  "mcpServers": {
    "lescribeaudio": {
      "url": "https://lescribeaudio.com/api/mcp",
      "headers": {
        "Authorization": "Bearer lsa_mcp_VOTRE_CLE_PERSONNELLE"
      }
    }
  }
}
```

Avec **Claude Code** :
```bash
claude mcp add --transport http lescribeaudio https://lescribeaudio.com/api/mcp \
  --header "Authorization: Bearer lsa_mcp_VOTRE_CLE_PERSONNELLE"
```

### 3. Pont local `STDIO` via `lescribeaudio-mcp` (Claude Desktop & clients STDIO)
Ajoutez dans `claude_desktop_config.json` :

```json
{
  "mcpServers": {
    "lescribeaudio": {
      "command": "npx",
      "args": ["-y", "lescribeaudio-mcp"],
      "env": {
        "LESCRIBEAUDIO_MCP_TOKEN": "lsa_mcp_VOTRE_CLE_PERSONNELLE"
      }
    }
  }
}
```

### 4. Diagnostic en ligne de commande (`--info` & `--check`)
```bash
# Afficher la fiche locale des 6 outils MCP
npx lescribeaudio-mcp --info

# Vérifier la connectivité HTTPS avec https://lescribeaudio.com/api/mcp
npx lescribeaudio-mcp --check

# Vérifier à la fois la découverte publique et votre jeton personnel (ping JSON-RPC 2.0)
LESCRIBEAUDIO_MCP_TOKEN="lsa_mcp_..." npx lescribeaudio-mcp --check
```

---

## English Summary & Quickstart (EN)

`lescribeaudio-mcp` is a lightweight, zero-dependency Node.js (`>= 18`) STDIO-to-Streamable-HTTP bridge for the official **Le Scribe Audio MCP Server** (`https://lescribeaudio.com/api/mcp`).

### Key Capabilities & Architecture
1. **6 Authenticated Tools**: `list_transcriptions`, `search_transcriptions`, `get_transcription_text`, `get_transcription_summary` (executive summary followed by chrono-thematic development), `rename_speaker_label` (global speaker diarization label coding, e.g., `Enquêté P1`, `M. Martin`, `Mme Dubois`, automatically refreshing the 100% editable `.docx` export), and `get_export_urls`.
2. **Strict Tenant Isolation & Bounded-TTL Tokens**: Uses HMAC-SHA256 Personal Access Tokens (`lsa_mcp_...`) expiring after **30, 90, or 180 days**, scoped strictly to the user's own workspace and shared team transcripts (admin privileges are never granted over MCP).
3. **GDPR & European Cloud Architecture**: Audio and transcript storage in **France on OVHcloud (AES-256)** with 1-click permanent deletion; speech-to-text inference via **Google Cloud Vertex AI (Europe region)** under contractual *Zero Data Retention* ([Security & GDPR documentation](https://lescribeaudio.com/securite-rgpd)).
4. **Reproducible Accuracy Benchmark**: Evaluated on public French academic corpora using Microsoft Word `Review > Compare` ([Open Benchmark & 60 PDF Proofs](https://lescribeaudio.com/benchmarks-precision-transcription-ia-francais), Zenodo DOI [`10.5281/zenodo.24087383`](https://doi.org/10.5281/zenodo.24087383)), cutting human drafting time in half (`2–3 h` of full ear-checked editing per audio hour vs. `4–7 h` of manual typing from scratch).

### Discovery Endpoints
- Streamable HTTP Endpoint: `https://lescribeaudio.com/api/mcp`
- Well-Known MCP Discovery: `https://lescribeaudio.com/.well-known/mcp.json`
- Well-Known MCP Server Card: `https://lescribeaudio.com/.well-known/mcp/server-card.json`

### Running Tests Locally
```bash
node --test test/test.mjs
```

---

## Éditeur, Support & Licence

- **Éditeur** : **LE SCRIBE AUDIO** (EURL immatriculée au RCS de Rennes sous le n° 890 049 927)
- **Documentation officielle** : [https://lescribeaudio.com/integrations-mcp](https://lescribeaudio.com/integrations-mcp)
- **Sécurité & RGPD** : [https://lescribeaudio.com/securite-rgpd](https://lescribeaudio.com/securite-rgpd)
- **Benchmarks de précision** : [https://lescribeaudio.com/benchmarks-precision-transcription-ia-francais](https://lescribeaudio.com/benchmarks-precision-transcription-ia-francais)
- **Téléphone** : `09 61 44 46 64` (`+33 9 61 44 46 64`)
- **Contact** : `contact@lescribeaudio.com`
- **Licence** : [MIT](./LICENSE)
