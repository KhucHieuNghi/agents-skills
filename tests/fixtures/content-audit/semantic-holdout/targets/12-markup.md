# Supplied structured-data captures

Page /offer-a has complete raw AND rendered structured-data capture, both containing
exactly this script with type application/ld+json:
{"@context":"https://schema.org","@type":"Product","name":"Example",}
The trailing comma is present in the supplied bytes. Visible content correctly
names Example. No feature-eligibility or engine test result was supplied.

Page /offer-b has a syntactically valid JSON-LD Product object whose name and price
match the supplied visible content. The owner has not supplied the remaining
feature-specific eligibility evidence or observed search appearance.
Draft assertion about B: "Valid JSON syntax and matching price guarantee a rich result."

No HTTP fetching or live validator use is authorized in this fixture.
