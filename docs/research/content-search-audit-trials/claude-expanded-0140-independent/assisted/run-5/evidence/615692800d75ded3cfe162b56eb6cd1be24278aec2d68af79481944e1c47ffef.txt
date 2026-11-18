# Supplied capture B

Synthetic fixture. Publisher intent: /old should redirect once to an accessible /new product page.
Captured redirect responses from the same deployment/time:
GET https://store.example.invalid/old -> 301 Location: https://store.example.invalid/new
GET https://store.example.invalid/new -> 301 Location: https://store.example.invalid/old
An older sitemap export lists /new as the preferred URL. No final successful response or engine-selected canonical is available.
