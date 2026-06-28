## Intended result
The homepage renders its Research list directly from the `papers` data source instead of requiring manual duplicate markdown edits when new papers are added.

## Scope
- Included: Replacing the hardcoded Research markdown section in `content/index.md` with the `papers` component.
- Excluded: Modifications to `content/_data/items.yaml` or any other pages.
- Preserved behavior: The `papers` component handler will continue to fetch data from `content/_data/items.yaml` under `papers`.

## GitHub tracking
- Target issue set / subtree: #4
- Milestone: None
- Closes on merge:
  - Closes #4
- References only:
  - None

## Implementation plan
- Replaced the markdown list in `index.md` with `::: {.component type="papers" items="papers" limit="3"}\n:::`

## Claim map
- [x] **#4 - Homepage Research should derive from papers data via the papers component**
  - Proof obligations claimed: Research list is loaded via the component.
  - Partial / not claimed: None.
  - Evidence required: Code inspection of `content/index.md`.
  - Current evidence: See commit `c71f761`.

## Automated gates
- Pandoc-SSG build checks (`pandoc-ssg check`, `pandoc-ssg build`, and orphan page checks) run successfully.
