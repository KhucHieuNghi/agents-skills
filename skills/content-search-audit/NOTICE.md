# Content Search Audit attribution

This candidate contains original NKSkills coordination/helpers and adapted methods
from the sources below. Adaptations narrow write authority to read-only audit,
separate observations from inference, remove arbitrary scores and preserve
missing-data/coverage requirements. No upstream executable code is included.

- Corey Haines, Marketing Skills, copyright (c) 2025 Corey Haines.
  MIT license: [full text](licenses/corey-MIT.txt).
  Reviewed revision: `1f837447b20bb6f0e72d87b80ece1c221c362c7d`.
  Selected entrypoint sections from seo-audit and content-strategy only.
- Profound, Skills Marketing Library, copyright (c) 2026 Profound.
  MIT license: [full text](licenses/profound-MIT.txt).
  Reviewed revision: `80293f156c27d3f90aedebfb3c27309769b2eec6`.
  ai-answer-accuracy-auditor, ai-prompt-portfolio-builder and aeo-operator-2026.

The provenance lock maps adapted files to immutable source paths and folder
hashes. Source-folder hashes identify the reviewed baseline; they do not mean
that all upstream references, research statistics or related skills are bundled.
The selected source sections are described in each method. Upstream external
frameworks and derivative Jam/Profound references in Corey's ai-seo are excluded.

Official platform documentation is linked for verification, not bundled or
represented as an endorsement. This package makes no ranking or visibility
promise. Upstream MIT notices are retained unchanged.

## Bundled reference datasets

These are two data sources, not additional reused skills.

- Schema.org contributors, vocabulary 30.1: derived term classification data,
  distributed under [CC BY-SA 3.0](licenses/schema-org-CC-BY-SA-3.0.txt).
  [Attribution and changes](references/schema-vocabulary-notice.md). Recipients
  retain the rights granted by that license; commercial software terms must not
  restrict those dataset rights. Schema.org does not endorse this product.
- IANA/IETF Language Subtag Registry, 2026-11-18: derived hreflang subset,
  with applicable registry rights under [CC0 1.0](licenses/iana-CC0-1.0.txt).
  [Source and limitations](references/iana-language-registry-notice.md).

Dataset license terms apply to their respective data, separately from original
NKSkills implementation code. Schema-v2 provenance records use publication URLs
and original-byte digests, without invented Git revisions.

## Report typography

The offline HTML report embeds the Latin and Vietnamese WOFF2 subsets of
Fraunces (Fontsource 5.3.0, The Fraunces Project Authors) and Source Sans 3
(Fontsource 5.3.1, Adobe). The packaged
[Fraunces license](scripts/report-assets/fraunces-OFL.txt) and
[Source Sans 3 license](scripts/report-assets/source-sans-3-OFL.txt) reproduce
the SIL Open Font License notices distributed with the website fonts.
