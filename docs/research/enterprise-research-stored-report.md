# Research report assembly from persisted review state

Status: development; customer artifacts remain in memory, not persisted/delivered.

The new entrypoint reads the encrypted control store at an expected revision,
rejects known retired source/candidate/receipt hashes before content access, and
passes only the persisted registrations to revision-aware projection. Original
research/review content is validated again. JSON is canonical; Markdown/HTML and
manifest derive from the same customer model. A second authenticated store read
rejects changed revisions before returning artifacts. Private storage/generation
metadata stays outside the customer formats.

Seven synthetic integration cases cover complete artifact creation and privacy,
stale revision before getters, stored retirement through deny/regrant, a competing
real storage transaction, substituted receipt bytes, missing storage authority and
a retired artifact relabeled as a source. Store operations use real local encrypted
SQLite; the competing-write test wraps the actual reader to schedule a real update
between the two reads, rather than substituting an in-memory fake database.

The author reproduced a missing retired-source gate with a getter regression:
source text was read before schema rejection. Registration, stored acquisition
planning and report assembly now share the retirement hash guard. The red result
is a pre-acquisition failure, not evidence that a report leaked to a customer.

Independent source reviewer `enterprise_contract_review` found no additional
material defect beyond that correction in progress. It inspected expected revision,
persisted registration selection, projection, canonical rendering and final reread.
No tests or independent runtime checks were performed by the reviewer.

The final reread is optimistic output consistency only. It neither prevents CPU
analysis while another process revokes access nor authorizes a later delivery.
Current authority, trusted clock, anti-rollback storage, retention/secure deletion,
raw-evidence storage and synchronized distribution remain open. No real participant
material or customer artifact was persisted or delivered in this checkpoint.
