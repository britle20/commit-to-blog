# 07 Frontend Selection Workflow

## Goal

Build the frontend repository, branch, and commit selection flow that prepares input for AI draft generation.

## Implementation Context

- Selection order is repository, branch, then commits.
- Repository, branch, and commit selectors share the desktop width as three equal columns.
- Each selector column keeps a stable desktop height and scrolls internally when its item list is long.
- Changing repository clears branch, commit, and generated draft state.
- Changing branch clears commit and generated draft state.
- Controls stay disabled until their required previous selection exists.
- Each API request has loading and error states.

## References

- Frontend flow: [docs/frontend-design.md](../frontend-design.md#state-flow)
- Components: [docs/frontend-design.md](../frontend-design.md#components)
- API routes: [docs/api-design.md](../api-design.md#github-api-proxy)
- Data shapes: [Repository](../data-model.md#repository), [Branch](../data-model.md#branch), [Commit](../data-model.md#commit)
- Task order: [docs/plan.md](../plan.md#7-frontend-selection-workflow)
- Verification: [Frontend Checks](../testing.md#frontend-checks)

## Acceptance Notes

- Users cannot choose a branch before choosing a repository.
- Users cannot choose commits before choosing a branch.
- Downstream state resets when upstream selection changes.
