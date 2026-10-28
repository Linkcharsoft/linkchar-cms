---
'@linkcharsoft/cms': patch
---

Opening hours accept a closing time past midnight (20:00 to 02:00): only the same opening and closing time is rejected ("El cierre no puede ser a la misma hora que la apertura"), and a day switched to closed keeps its hours without validating them. The switch's label is a fixed "Abierto" (the switch itself says whether the day is open), and a time typed halfway ("09:3") stays in the input on blur instead of being cleared.

To update a project: nothing. `openingHoursSpecification` passes the times through as entered, which is how schema.org expresses hours that end the next day.
