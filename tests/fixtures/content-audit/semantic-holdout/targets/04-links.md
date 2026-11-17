# Supplied internal graph and request observations

Inventory A is complete only for the publisher-owned reference section with four
HTML URLs: /guide, /setup, /troubleshoot, /glossary. The following list contains
ALL internal href targets from these four pages, including navigation/footer:
/guide -> /setup, /troubleshoot
/setup -> /guide
/troubleshoot -> /guide, /retired-check
/glossary -> /guide
No page in this declared section links to /glossary. Publisher intent is that all
four pages be discoverable from /guide through section links. This inventory says
nothing about backlinks from external websites or other publisher sections.

Captured /retired-check: HTTP 404. It is the target of "Run the current diagnostic"
on /troubleshoot. Approved replacement /diagnostic: HTTP 200, same needed diagnostic.
Both responses are supplied from the same current deployment.

Inventory B is a partial export of /faq and its body links. It has no link to
/help. Navigation, other pages, analytics and backlinks for B were not supplied.
The export does not claim /help is orphaned.
