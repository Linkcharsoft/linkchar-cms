---
'@linkcharsoft/cms': minor
---

A build cancelled in Amplify now ends the publish as failed with its own reason, `build_cancelled` ("La actualización del sitio se canceló antes de terminar."), so the panel offers "Reintentar" instead of leaving it "sin confirmar" for 30 minutes. The webhook used to answer 400 to `CANCELLED` events. `mockBuild({ result: 'cancelled' })` reproduces it locally.
