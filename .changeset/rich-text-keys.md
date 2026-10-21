---
'@linkcharsoft/cms': patch
---

`RichText` gave two marked texts in the same paragraph the same React key (the index of their mark instead of their own), so React warned about duplicate keys and could drop or repeat one of them on a re-render. Each text now carries its own key.
