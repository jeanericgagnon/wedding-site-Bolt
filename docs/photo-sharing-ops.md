# Photo Sharing Ops Quickcheck

Run this after deploys or before major merges:

```bash
scripts/photo-sharing-smoke.sh
```

If the project is not linked locally:

```bash
scripts/photo-sharing-smoke.sh <project-ref>
```

What it checks:

- Recent migration alignment
- Photo-sharing functions present in remote project
- Local typecheck + production build
