# Corey copywriting local-reference review

Reviewed the three reference bodies and all ten evaluation cases at immutable
revision `1f837447b20bb6f0e72d87b80ece1c221c362c7d`. File hashes match the existing
[support-source inventory](content-search-audit-corey-support-review.json).
The entrypoint had already been reviewed. Evaluation cases were read, not executed.
This closes local body reading for copywriting only, not all support skills.

Decision: retain reference-only status; no new package inheritance or source pin.

| Material                                                 | Useful comparison                                                                                                 | Why it is not an audit rule                                                                                                                                                                                   |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ai-tells.md` — factual specificity and missing proof    | Retain supplied voice, preserve claim scope, identify missing support rather than inventing numbers or experience | The blacklist, punctuation caps, paragraph rhythm and proposed persona are editorial conventions. Their presence cannot prove AI authorship, search harm or task failure.                                     |
| `ai-tells.md` — rewriting examples                       | Examine whether a revision actually introduces unsupported claims                                                 | Example uptime, throughput, time-saving and customer-count numbers must remain examples; they are not evidence about an audited product.                                                                      |
| `natural-transitions.md` — qualification and attribution | Maintain necessary uncertainty and connect a claim to its source                                                  | Phrases implying causation or proof require actual support. A transition word is not evidence, and a preferred phrase does not establish snippet eligibility.                                                 |
| `natural-transitions.md` — audience/context distinctions | Differentiate a guide's orientation needs from sales-page copy                                                    | It also recommends announcement or takeaway language restricted by the blacklist. Resolve by declared task and brand requirements; do not combine both into universal prohibitions.                           |
| `copy-frameworks.md` — audience and intended action      | Check whether a specific page supports its declared reader task                                                   | Fixed benefit/FAQ counts, social-proof blocks, guarantees, a purchase CTA and a named narrative model are not requirements for every page. Technical references and policies may be complete without them.    |
| `copy-frameworks.md` — segment-specific framing          | Consider explicit audience needs when assessing clarity                                                           | Startup/enterprise reactions are illustrative hypotheses. Do not infer risk tolerance from a label or invent SOC 2, SLA, implementation-service or other product commitments.                                 |
| `copy-frameworks.md` — growth anecdotes                  | Potential research leads only                                                                                     | The SavvyCal conversion anecdote and four positioning metrics lack enough study detail here to become causal estimates or customer forecasts. The referenced book and primary measurements were not reviewed. |
| Evaluation cases                                         | Preserve user-provided voice and avoid fabricated statistics                                                      | Cases reward writing formats, mandatory CTA changes, another skill's invocation and style bans. These are not suitable gold labels for the custom audit's task-specific, one-skill contract.                  |

Specific evaluation issues: case 5 labels “Learn More” weak before establishing its
destination and role; case 6 routes to a second skill; case 8 rewards a particular
narrative and segment framing; cases 9–10 reward removing specified punctuation or
rhetoric. Case 10's preservation of voice and prohibition on invented customer proof
are useful comparison principles, but do not justify importing the whole evaluation.

External lineage remains open: Manchester Academic Phrasebank, Plain English Campaign,
Wikipedia's AI-writing guide, cited linguistic papers and benchmark work, trope and
writing essays, Profound humanizer/copywriting and Wispr writing, Mises and the
Founding Marketing book. Reading the local summaries does not verify these works,
their claims, license conditions or effectiveness. No external passage is copied into
the candidate on the basis of this review.

The existing audit already separates supported defects from style preferences and
retains uncertain origins. The support-method fixture's clean FAQ and technical
reference are relevant controls, but do not independently validate all editorial
judgments. No blanket authorship detector, score or rewrite requirement is added.
