# ADR 0001: Separate files for draft copy

## Context
Generated content files (like `src/content/works/*.yaml`) are produced and completely overwritten by `npm run intake -- generate`. Modifying them directly to add Draft `TextBlock` content (e.g. `fragment`) means the copy will be lost on the next generation cycle.

## Decision
Instead of making the intake generator preserve manual edits in generated files, we will store the copy texts in a separate directory structure (`src/content/copy/works/<slug>.yaml`, `src/content/copy/territories/<slug>.yaml`, etc.). These files will be merged with the generated content at build or load time. 

## Considered & Rejected Alternatives
- **Make the generator read and preserve existing copy:** Rejected because it makes the generator complex and mixes manually curated text tightly with automated extractions in the same file.
