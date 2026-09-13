---
title: A short, specific title — not a listicle
description: One or two sentences. Shows in search results and on the blog index. Keep it under 155 characters.
date: 2026-09-20
tags: LangGraph, RAG, Production
draft: true
---

Open with the problem, not the preamble. What broke, what was at stake, why the
obvious fix didn't work.

## The constraint

Write the way you'd explain it to another engineer who has hit the same wall.

- Concrete beats general
- Numbers beat adjectives
- What you tried and abandoned is often the most useful part

## How it actually worked

```python
# code blocks render with syntax-friendly styling
def example():
    return "keep snippets short enough to read on a phone"
```

> A pull quote for the one line you want people to remember.

## What I'd do differently

Close with the transferable lesson — the thing a reader can apply tomorrow.

---

**Publishing checklist**

1. Set `draft: false` above
2. `python3 build.py`
3. `git add -A && git commit -m "post: <title>" && git push`
4. Wait for Google to crawl it (Search Console → URL Inspection → Request indexing)
5. Cross-post to Hashnode — tick *Add a canonical URL*, point at your URL
6. Cross-post to Medium via medium.com/p/import (sets canonical automatically)
