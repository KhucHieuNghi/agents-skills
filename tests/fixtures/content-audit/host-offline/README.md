# Offline host workflow fixture

Four original synthetic files exercise English factual review, a Vietnamese clean
control, an unrendered JavaScript shell and an unavailable PDF. These are controlled
fixtures, not a real site or performance dataset. The PDF marker is intentionally
not a usable document; a host without extraction must retain it as unsupported.

Copy only targets/ into an installed host project's content/. Gold stays outside
host scope. Give the host the declared count/completeness, offline permissions,
missing capabilities and requested output location; do not supply the findings.
Run the actual installed package and independently validate persisted artifacts.
A prose-only response does not satisfy this fixture's workflow assertions.

This fixture covers a subset of the design classes. It does not cover live public
collection, full rendered DOM, semantic schema review, 1200-item host resume or
all multilingual relationships. See the research evaluation record for actual
runs and their configuration limitations.
