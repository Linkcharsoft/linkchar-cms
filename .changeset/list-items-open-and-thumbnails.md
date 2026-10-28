---
'@linkcharsoft/cms': minor
---

List and block items no longer start collapsed: they open while there are at most three, or when the item has an image field, and `list()`/`blocks()` take `open: true | false` to fix it. The legend gets "Expandir todo" / "Colapsar todo", items collapsed for a drag open again after the drop, and a collapsed item shows its image as a thumbnail (the item's first image field, or the one `thumbnail` names on `list()`; a block uses its own first image field) and a count of its fields with a problem. `list()` takes `singularLabel` ("servicio"): the button reads "Agregar servicio" and an untitled item "Servicio 3". With `min`, the legend reads "2 de 6, mínimo 1" and the last `min` items can't be removed; at `max`, "Agregar" and "Duplicar" stay disabled with the reason as their tooltip instead of disappearing. A block whose type left the schema used to be invisible but counted: it now shows as 'Bloque "x", que ya no existe en el esquema' with its remove button. `defineCmsConfig` rejects a `thumbnail` that is not an image field of the items.

To update a project: nothing; set `open: false` on lists that should keep starting collapsed, and `singularLabel` where "Agregar" should name the item.
