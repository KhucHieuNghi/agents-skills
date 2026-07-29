# Reveal.js Usage Contract

## Required HTML structure

Every presentation must follow this container structure:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{TITLE}}</title>
    <!-- Base reveal.js CSS (local) -->
    <!-- Brand theme CSS (local) -->
  </head>
  <body>
    <div class="reveal">
      <div class="slides">
        <section><!-- slide content --></section>
      </div>
    </div>
    <!-- Local reveal.js script -->
    <!-- Local plugins -->
    <script>
      Reveal.initialize({...});
    </script>
  </body>
</html>
```

## Slide types

### Horizontal slides

```html
<section>Slide 1</section>
<section>Slide 2</section>
```

### Vertical slides (sub-topics)

```html
<section>
  <section>Parent topic</section>
  <section>Detail 1</section>
  <section>Detail 2</section>
</section>
```

Use vertical slides for deep-dives within a single topic. Limit to 3-4 vertical
slides per group.

### Markdown slides

```html
<section data-markdown>
  <textarea data-template>
## Heading
- Point one
- Point two
  </textarea>
</section>
```

## Fragments (progressive disclosure)

```html
<p class="fragment">Appears on click</p>
<p class="fragment fade-up">Slides up</p>
<p class="fragment highlight-blue">Highlights</p>
```

Allowed fragment styles: `fade-in`, `fade-out`, `fade-up`, `fade-down`,
`fade-left`, `fade-right`, `highlight-red`, `highlight-blue`,
`highlight-green`, `strike`, `grow`, `shrink`.

Use fragments sparingly: maximum 5 fragments per slide. Over-use reduces
readability.

## Code highlighting

```html
<pre><code data-trim data-line-numbers="1|3-4" class="language-javascript">
function example() {
  const x = 1;
  const y = 2;
  return x + y;
}
</code></pre>
```

- Always specify language class for syntax highlighting.
- Use `data-trim` to remove leading/trailing whitespace.
- Use `data-line-numbers` for progressive line highlighting.
- Ensure code font size is readable (configure via CSS, minimum 0.7em).

## Speaker notes

```html
<section>
  <h2>Title</h2>
  <p>Content</p>
  <aside class="notes">Speaker notes here. Press 'S' to view.</aside>
</section>
```

Include speaker notes on title slide, key content slides, and transitions.

## Backgrounds

Only use light backgrounds:

```html
<!-- Light solid color -->
<section data-background-color="#f5f8fb">
  <!-- Light gradient -->
  <section
    data-background-gradient="linear-gradient(to bottom, #ffffff, #f5f8fb)"
  ></section>
</section>
```

Do NOT use:

- Dark background colors
- Video backgrounds from remote URLs
- Image backgrounds that reduce text readability

## Configuration

```javascript
Reveal.initialize({
  controls: true,
  progress: true,
  slideNumber: true,
  hash: true,
  history: true,
  center: true,
  transition: "slide",
  width: 960,
  height: 700,
  margin: 0.04,
  plugins: [RevealHighlight, RevealNotes],
});
```

### Allowed transitions

`none`, `fade`, `slide`, `convex`, `concave`, `zoom`

Default: `slide`. Use `fade` for content-heavy presentations.

## Mermaid diagrams

When diagrams are needed, use Mermaid with branded theme:

```html
<section>
  <pre class="mermaid">
graph LR
  A[Input] --> B[Process] --> C[Output]
  </pre>
</section>
```

Initialize Mermaid with brand colors from CSS custom properties (same approach
as `html-docs-standard`).

## Disallowed features

- External plugins loaded from CDN or remote URLs
- Auto-slide with remote media
- Multiplex (requires server)
- Remote lazy-loaded media
- PDF export via external tools (use browser print instead)
- Custom JavaScript that makes network requests
