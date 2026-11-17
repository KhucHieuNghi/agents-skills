# Supplied task journey and navigation

Approved customer task: compare plans, purchase a plan, then activate it.
Complete scoped inventory: /compare, /purchase, /activate, /units-reference.
/compare states "Select a plan to continue to purchase" but its only href is /units-reference.
/purchase contains the purchase form and links to /activate after purchase.
/activate contains all approved activation steps.
/units-reference defines measurement units. It is intentionally a standalone
reference, reached by direct links from many non-scoped documents.

Owner intent: /compare should provide a direct navigation action to /purchase.
No such link, button, form action, script handler or equivalent control exists
in its supplied complete HTML and rendered DOM. All four URLs return supplied HTTP 200.
No conversion, analytics, search or AI measurement data is available.
