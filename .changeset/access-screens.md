---
'@linkcharsoft/cms': patch
---

Sign-in and account forms: the invitation screen shows the invited address ("Tu usuario", read-only, `autocomplete="username"`) and the password rules under the field; the password reset and change-password forms carry a hidden `username` input with the account's address, so password managers pair the new password with the right account; a submit button stays in its loading state after a successful sign-in, invitation, reset or code until the navigation completes instead of re-enabling itself for a moment; a wrong current password in "Cambiar contraseña" is shown under that field, with the focus on it, instead of only as a toast; after a failed submit, every field re-checks itself while typing (`validateOnChange`), so a corrected value drops its error without another submit; and the two-step verification screen has "No tengo el celular", which explains that an administrator can reset the verification from Users.

To update a project: nothing.
