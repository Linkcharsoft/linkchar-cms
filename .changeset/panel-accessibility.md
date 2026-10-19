---
'@linkcharsoft/cms': patch
---

Accessibility fixes found with axe, now checked by the E2E suite: dropdowns hide their native select and their trigger from screen readers (the focusable input already names them), switches no longer nest a checkbox role around the switch input, the page outline title reaches AA contrast, and the account button, heading buttons and numbered list button include their visible text in their accessible name.
