# Schema.org vocabulary data attribution

`schema-vocabulary.json` is a derived data extract from the Schema.org contributors' version 30.1 vocabulary, downloaded from [the versioned all-terms JSON-LD](https://schema.org/version/30.1/schemaorg-all-https.jsonld). The exact input SHA-256 is recorded in its provenance and enforced by the offline builder.

Under the [Schema.org website terms](https://schema.org/docs/terms.html), the schema is provided under [Creative Commons Attribution-ShareAlike 3.0](https://creativecommons.org/licenses/by-sa/3.0/). This derived vocabulary data file is distributed under that same license; attribution and license metadata must travel with copies and adaptations. This notice concerns the data extract, not an assertion that independent NKSkills implementation code is upstream code. Schema.org does not endorse NKSkills.

Changes: only Schema.org namespace term names, RDF classification (class/property/individual), vocabulary section and supersession targets are retained. Descriptions, labels, examples, external vocabulary definitions and property relationships are omitted. The extraction and classifier code are original NKSkills implementation. The repository's separate software license must not be substituted for the website vocabulary's stated data license.

The [developer documentation](https://schema.org/docs/developers.html) distinguishes current/all vocabulary downloads; all includes retired terms. Both HTTP/HTTPS namespace forms are accepted. Pending, attic and superseded terms are preserved as metadata, not automatically labeled invalid. Vocabulary membership is not required-property validation, JSON-LD expansion, visible-content agreement or a guarantee of Google rich-result eligibility.

Reproduction (no network during the builder): download the versioned source separately, then run `node scripts/enterprise-technical-seo/schema-registry-build.mjs INPUT_JSONLD NEW_OUTPUT_JSON`. A changed source hash fails; no update is automatic. Review upstream license/provenance and extraction compatibility before changing the pin.
