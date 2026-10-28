---
'@linkcharsoft/cms': patch
---

Adding, duplicating, removing or reordering an item of a list or blocks field marked the whole array as touched, which hid the errors shown on the items inside ("Ingresá una URL que empiece con https://" went away as soon as another item was added), and the opening hours input did the same with each day, so a wrong time ("25:00") never showed its error. Touched is now kept per item and moves with it, the time inputs mark themselves on blur, and a list change validates the form at once.

To update a project: nothing.
