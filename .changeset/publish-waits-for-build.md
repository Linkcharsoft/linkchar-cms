---
'@linkcharsoft/cms': patch
---

Publishing while the site was still building the previous publish started another build of the same content: on Amplify the jobs piled up. Now `publishChanges` answers "El sitio todavía se está actualizando con la publicación anterior…" (`errors.publish.building`) while the latest publish is building, and the Publish screen says so ("El sitio se está actualizando con la publicación anterior (hace 3 minutos)…") with the button held until the build reports its end, or until the 30 minutes after which a build counts as unconfirmed.

To update a project: nothing. A project without the build webhook (no EventBridge rule) waits those 30 minutes between publishes: wire the webhook as the Amplify setup describes.
