---
'@linkcharsoft/cms': minor
---

The publish history tells a simulated build apart, and whoever publishes learns when the site never confirmed a build. A publish reported by the mock build (its `job_id` starts with `mock-`) carries a "Simulada" tag and `PublishRecordType.simulated`. `cms.queries.getPublishCircuit()` reads the log as `unused`, `unconfirmed` (publishes exist, but no success came from a real build) or `confirmed`; the publish page shows a warning to users who can publish while it is `unconfirmed`, and `doctor` warns with the same meaning, both pointing at `linkchar-cms publish:ping`.

To update a project: nothing.
