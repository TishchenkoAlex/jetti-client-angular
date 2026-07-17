# Jetti Client Migration Plan

## Stage 0: baseline, build reproducibility, migration blockers

- Keep Angular, PrimeNG and MSAL versions unchanged.
- Document current dependency versions and build status.
- Mark old `/api/BP/*` integration as legacy compatibility code.
- Prepare an isolated `src/app/business-process` frontend area without wiring it into routes or document forms.
- Fix only low-risk configuration/import issues that block diagnostics.

## Stage 1: cleanup before Angular upgrade

- Keep the app on Angular 8 while removing obvious upgrade blockers.
- Replace remaining imports from `primeng/components/...` with public PrimeNG APIs where available.
- Decide whether the local `p-table` replacement in `src/app/common/datatable/table.ts` will be removed, isolated, or maintained as a fork.
- Reduce `entryComponents` usage after confirming dynamic component loading requirements.
- Replace `toPromise()` usage incrementally with RxJS-compatible helpers during the Angular/RxJS upgrade path.
- Inventory and contain dynamic `new Function` execution used by dynamic forms.

## Stage 2: Angular upgrade step-by-step

- Upgrade one Angular major version at a time: 8 -> 9 -> 10 -> 11 -> 12 and onward.
- Run build and lint after each major upgrade.
- Do not combine Angular, PrimeNG, MSAL and workflow changes in one step.
- Use a Node version compatible with the active Angular CLI version for each step.

## Stage 3: MSAL migration

- Replace `msal` v1 and `@azure/msal-angular` v1 usage with modern `@azure/msal-browser` / current `@azure/msal-angular`.
- Move auth configuration out of the old v1 `Configuration` shape only after the Angular version supports the target MSAL package.
- Do not use JWT roles as the source of truth for workflow actions.

## Stage 4: PrimeNG migration

- Do not upgrade PrimeNG to the current version until the custom `p-table` and deep imports are resolved.
- Replace legacy `ui-*` CSS selectors with the PrimeNG class model required by the target version.
- Validate datatable behavior separately because it is a high-risk UI dependency.

## Stage 5: introduce business-process UI

- Implement new workflow UI only under `src/app/business-process`.
- Use `/api/business-process/*` endpoints only.
- Keep process objects separate from documents and catalogs: document/catalog item is the process object, not the process itself.
- Get available workflow actions from backend responses, not frontend roles.

## Stage 6: remove legacy BP usage from documents

- Replace old `/api/BP/*` usage in document forms with the new business-process API.
- Remove direct `workflowID` and `Status` workflow coupling from document forms after backend process tasks cover those transitions.
- Retire `BPApi` only after all old BP/K2 consumers are migrated or explicitly decommissioned.
