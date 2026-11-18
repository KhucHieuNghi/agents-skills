# 0.1.38 absolute-helper evaluation

Status: evaluation candidate; no commercial acceptance or production deployment.

The 0.1.37 material-classification improvement is retained. Its Claude trace still
contains unwrapped directory changes and pipeline stages, followed by an inaccurate
blanket compliance claim. See the retained 0.1.37 TRACE-REVIEW.md.

## Change and hypothesis

The entrypoint and helper guide now recommend host file-reading tools where
available and absolute installed helper paths from the customer project. Helper
command examples no longer require changing into the package directory. The guide
also corrects its stale count of four report files to five base files, matching
the existing delivery-summary implementation. No runtime code or rule changed.

This addresses concrete command forms observed in the trace. It is not a claim
that prompting can enforce a shell policy. Existing per-executable conventions,
semantic thresholds, gold fixtures and independent-human gates remain unchanged.

## Frozen package and verification

- Component: `8410ebd40cea5cd2c6eac6ee043bc272a413b94a388ccc5e79f6b9c0e4da1c47`.
- Release: `19b170425b26cfc5a8749c76945a2305dcd3f62db4ee57a9c4c2d3d896b0bd30`.
- Archive: `5d0184f6a4c72498528cb85ec1573dd855755e22fd904289443b2b713f2d780f`.

Format, lint, typecheck, all 474 tests, build and diff checks passed. The
skill-creator validator passed in the existing isolated PyYAML environment.
Fresh archive installation succeeded for both hosts. From each fresh project
working directory, absolute-path `methods`, `start` and `validate` invocations
succeeded without directory changes. This checks the documented invocation, not
host compliance. Receipts are in `build/release-hardening-0138/`.

The same Expanded prompts and target bytes are running in fresh host projects;
no gold, suspected defect or prior conclusions are supplied. Results remain
pending. Earlier artifacts are retained unchanged. No 0.1.37 success is transferred
to this changed package, and no additional matrix is claimed complete.
