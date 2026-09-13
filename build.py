#!/usr/bin/env python3
"""
Generates /blog from Markdown files in content/posts/.

    python3 build.py

Writes blog/index.html, blog/<slug>.html, blog/rss.xml, and refreshes
sitemap.xml. Commit the result and push — GitHub Pages serves it as-is.
"""
import html
import os
import re
import sys
from datetime import datetime, timezone

try:
    from markdown_it import MarkdownIt
except ImportError:
    sys.exit("markdown-it-py is required:  python3 -m pip install markdown-it-py")

SITE = "https://suyashdubey.com"
AUTHOR = "Suyash Dubey"
EMAIL = "dsuyash57@gmail.com"
ROOT = os.path.dirname(os.path.abspath(__file__))
POSTS_DIR = os.path.join(ROOT, "content", "posts")
OUT_DIR = os.path.join(ROOT, "blog")

md = MarkdownIt("commonmark", {"html": True, "linkify": True, "typographer": True})
md.enable(["table", "strikethrough"])


# ---------------------------------------------------------------- frontmatter
def parse_front_matter(raw):
    """Minimal YAML-subset parser — scalars and comma lists only, no deps."""
    if not raw.startswith("---"):
        return {}, raw
    end = raw.find("\n---", 3)
    if end == -1:
        return {}, raw
    block, body = raw[3:end], raw[end + 4:]
    meta = {}
    for line in block.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        key, _, val = line.partition(":")
        val = val.strip().strip('"').strip("'")
        key = key.strip()
        if key == "tags":
            meta[key] = [t.strip() for t in val.split(",") if t.strip()]
        elif val.lower() in ("true", "false"):
            meta[key] = val.lower() == "true"
        else:
            meta[key] = val
    return meta, body.lstrip("\n")


def reading_time(text):
    return max(1, round(len(text.split()) / 220))


def fmt_date(iso):
    try:
        return datetime.strptime(iso, "%Y-%m-%d").strftime("%-d %B %Y")
    except ValueError:
        return iso


def rfc822(iso):
    try:
        d = datetime.strptime(iso, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        return d.strftime("%a, %d %b %Y %H:%M:%S +0000")
    except ValueError:
        return ""


def esc(s):
    return html.escape(s or "", quote=True)


def strip_tags(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s)).strip()


# ---------------------------------------------------------------- page shell
def shell(title, description, canonical, body, extra_head="", og_type="website", og_image=None):
    og_image = og_image or f"{SITE}/assets/img/og.png"
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>document.documentElement.classList.add('js')</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(description)}">
<link rel="canonical" href="{canonical}">
<meta name="author" content="{AUTHOR}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="theme-color" content="#06060a">
<meta property="og:type" content="{og_type}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(description)}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{og_image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(description)}">
<meta name="twitter:image" content="{og_image}">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="{AUTHOR} — blog" href="{SITE}/blog/rss.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/styles.css">
{extra_head}</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="progress" aria-hidden="true"></div>
<header class="nav">
  <div class="wrap nav__in">
    <a class="brand" href="/" aria-label="{AUTHOR} — home">
      <span class="mono-badge" aria-hidden="true">SD</span>
      <span>{AUTHOR}<small>Applied AI Engineer</small></span>
    </a>
    <nav class="nav__links" aria-label="Primary">
      <a href="/#services">Services</a><a href="/#work">Work</a><a href="/blog/">Blog</a>
      <a href="/#about">About</a><a href="/#faq">FAQ</a>
    </nav>
    <div class="nav__cta">
      <span class="clock"><i aria-hidden="true"></i><span data-clock>India (IST)</span></span>
      <a class="btn btn--solid" href="/#contact"><span>Start a project</span><span class="arw" aria-hidden="true">↗</span></a>
      <button class="nav__toggle" type="button" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>
    </div>
  </div>
</header>
<main id="main">
{body}
</main>
<footer>
  <div class="wrap">
    <div class="foot">
      <a class="brand" href="/"><span class="mono-badge" aria-hidden="true">SD</span><span>{AUTHOR}<small>Applied AI Engineer</small></span></a>
      <nav aria-label="Footer">
        <a href="/#services">Services</a><a href="/#work">Work</a><a href="/blog/">Blog</a>
        <a href="/#about">About</a><a href="/#contact">Contact</a>
        <a href="/blog/rss.xml">RSS</a>
        <a href="https://www.linkedin.com/in/suyash-kumar-dubey-410533211" rel="me noopener" target="_blank">LinkedIn</a>
        <a href="https://github.com/suyashdube" rel="me noopener" target="_blank">GitHub</a>
      </nav>
      <small><span data-clock>India (IST)</span></small>
    </div>
    <div class="foot" style="margin-top:26px">
      <small>© <span id="yr">2026</span> {AUTHOR}. Built from scratch — no template, no cookies, no ad tech.</small>
      <small><a href="#main">Back to top ↑</a></small>
    </div>
  </div>
</footer>
<script>document.getElementById('yr').textContent=new Date().getFullYear();</script>
<script src="/assets/js/main.js" defer></script>
<script src="/assets/js/analytics.js" defer></script>
</body>
</html>
"""


# ---------------------------------------------------------------- load posts
def load_posts():
    posts = []
    if not os.path.isdir(POSTS_DIR):
        return posts
    for fn in sorted(os.listdir(POSTS_DIR)):
        if not fn.endswith(".md") or fn.startswith("_"):
            continue
        raw = open(os.path.join(POSTS_DIR, fn), encoding="utf-8").read()
        meta, body = parse_front_matter(raw)
        if meta.get("draft"):
            continue
        slug = meta.get("slug") or re.sub(r"^\d{4}-\d{2}-\d{2}-", "", fn[:-3])
        if not meta.get("title"):
            print(f"  ! skipped {fn}: missing 'title'")
            continue
        if not meta.get("date"):
            print(f"  ! skipped {fn}: missing 'date'")
            continue
        posts.append({
            "slug": slug,
            "title": meta["title"],
            "description": meta.get("description", ""),
            "date": meta["date"],
            "tags": meta.get("tags", []),
            "body_md": body,
            "html": md.render(body),
            "cover": meta.get("cover", ""),
            "cover_alt": meta.get("cover_alt", ""),
            "mins": reading_time(body),
            "url": f"{SITE}/blog/{slug}.html",
        })
    posts.sort(key=lambda p: p["date"], reverse=True)
    return posts


# ---------------------------------------------------------------- renderers
def render_post(post, prev_post, next_post):
    tags = "".join(f'<span class="tag">{esc(t)}</span>' for t in post["tags"])
    schema = f"""<script type="application/ld+json">
{{"@context":"https://schema.org","@graph":[
 {{"@type":"BreadcrumbList","itemListElement":[
  {{"@type":"ListItem","position":1,"name":"Home","item":"{SITE}/"}},
  {{"@type":"ListItem","position":2,"name":"Blog","item":"{SITE}/blog/"}},
  {{"@type":"ListItem","position":3,"name":{js_str(post['title'])},"item":"{post['url']}"}}]}},
 {{"@type":"BlogPosting","headline":{js_str(post['title'])},
  "description":{js_str(post['description'])},
  "datePublished":"{post['date']}","dateModified":"{post['date']}",
  "author":{{"@type":"Person","name":"{AUTHOR}","url":"{SITE}/"}},
  "publisher":{{"@type":"Person","name":"{AUTHOR}"}},
  "mainEntityOfPage":"{post['url']}",
  "image":"{SITE}{post['cover']}" if post['cover'].startswith('/') else "{SITE}/assets/img/og.png",
  "keywords":{js_str(', '.join(post['tags']))},
  "inLanguage":"en"}}]}}
</script>
"""
    nav_more = ""
    cards = []
    if next_post:
        cards.append(f'<a class="card card--tilt" href="/blog/{next_post["slug"]}.html">'
                     f'<em>Newer</em><h4>{esc(next_post["title"])} ↗</h4></a>')
    if prev_post:
        cards.append(f'<a class="card card--tilt" href="/blog/{prev_post["slug"]}.html">'
                     f'<em>Older</em><h4>{esc(prev_post["title"])} ↗</h4></a>')
    cards.append('<a class="card card--tilt" href="/#contact"><em>Working on something like this?</em>'
                 '<h4>Send me the brief ↗</h4></a>')
    nav_more = f'<div class="next-cs">{"".join(cards[:2])}</div>' if len(cards) > 1 else ""

    body = f"""<article>
<section class="cs-hero">
  <div class="wrap">
    <p class="crumbs"><a href="/">Home</a> <span>/</span> <a href="/blog/">Blog</a> <span>/</span> <span>{esc(post['title'])}</span></p>
    <p class="eyebrow rv">{fmt_date(post['date'])} · {post['mins']} min read</p>
    <h1 class="display rv rv-d1" style="font-size:clamp(2.1rem,5vw,4.4rem)">{esc(post['title'])}</h1>
    {f'<p class="lead rv rv-d2" style="margin-top:24px">{esc(post["description"])}</p>' if post['description'] else ''}
    {f'<div class="tags rv rv-d3" style="margin-top:26px">{tags}</div>' if tags else ''}
    {f'<figure class="post-cover rv rv-d4"><img src="{esc(post["cover"])}" alt="{esc(post["cover_alt"])}" width="1600" height="840" loading="eager"></figure>' if post['cover'] else ''}
  </div>
</section>
<section style="padding-top:0">
  <div class="wrap">
    <div class="prose post-body rv">
{post['html']}
    </div>

    <aside class="post-cta rv">
      <p class="eyebrow">Who wrote this</p>
      <p>I'm <strong>{AUTHOR}</strong> — an applied AI engineer. I build agentic systems and
      RAG pipelines that survive production, mostly in healthcare and other places where a wrong
      model output has a real cost.</p>
      <div class="btn-row">
        <a class="btn btn--solid" href="/#contact"><span>Start a project</span><span class="arw" aria-hidden="true">↗</span></a>
        <a class="btn btn--ghost" href="/#work"><span>See the work</span></a>
      </div>
    </aside>
    {nav_more}
  </div>
</section>
</article>"""
    desc = post["description"] or strip_tags(post["html"])[:155]
    og = f"{SITE}{post['cover']}" if post["cover"].startswith("/") else (post["cover"] or f"{SITE}/assets/img/og.png")
    return shell(f"{post['title']} — {AUTHOR}", desc, post["url"], body, schema, "article", og)


def js_str(s):
    return '"' + (s or "").replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ") + '"'


def render_index(posts):
    if posts:
        items = []
        for i, p in enumerate(posts):
            tags = "".join(f'<span class="tag">{esc(t)}</span>' for t in p["tags"][:3])
            thumb = (f'<span class="post-row__thumb"><img src="{esc(p["cover"])}" alt="" loading="lazy"></span>'
                     if p["cover"] else '')
            items.append(f"""      <a class="post-row{' post-row--img' if p['cover'] else ''} rv{' rv-d' + str(min(i,4)) if i else ''}" href="/blog/{p['slug']}.html">
        <span class="post-row__meta">{fmt_date(p['date'])} · {p['mins']} min</span>
        <span class="post-row__body">
          <h2>{esc(p['title'])}</h2>
          {f"<p>{esc(p['description'])}</p>" if p['description'] else ''}
          {f'<span class="tags">{tags}</span>' if tags else ''}
        </span>
        {thumb}
      </a>""")
        listing = f'<div class="post-list">\n{chr(10).join(items)}\n    </div>'
    else:
        listing = """<div class="card" style="padding:clamp(30px,4vw,52px)">
      <p class="eyebrow">Nothing published yet</p>
      <p class="lead" style="margin:0">First piece is in progress. In the meantime, the
      <a href="/#work" style="text-decoration:underline">case studies</a> go into the same
      depth on systems that actually shipped.</p>
    </div>"""

    schema = f"""<script type="application/ld+json">
{{"@context":"https://schema.org","@type":"Blog","@id":"{SITE}/blog/#blog",
 "name":"Blog — {AUTHOR}","url":"{SITE}/blog/",
 "description":"Notes on building LLM systems that survive production.",
 "author":{{"@type":"Person","name":"{AUTHOR}","url":"{SITE}/"}},
 "inLanguage":"en"}}
</script>
"""
    body = f"""<section class="cs-hero">
  <div class="wrap">
    <p class="crumbs"><a href="/">Home</a> <span>/</span> <span>Blog</span></p>
    <p class="eyebrow rv">Blog</p>
    <h1 class="display rv rv-d1" style="font-size:clamp(2.4rem,6.4vw,5.6rem)">Notes from<br>production</h1>
    <p class="lead rv rv-d2" style="margin-top:26px">What actually breaks when LLM systems meet
    real users, real data and real regulation — written up properly, with the reasoning left in.
    <a href="/blog/rss.xml" style="text-decoration:underline">RSS</a>.</p>
  </div>
</section>
<section style="padding-top:0">
  <div class="wrap">
    {listing}
  </div>
</section>"""
    return shell(
        f"Blog — {AUTHOR}",
        "Notes on building LLM systems that survive production — agents, retrieval, evaluation and the parts that break under real load.",
        f"{SITE}/blog/", body, schema, "website")


def render_rss(posts):
    items = []
    for p in posts[:20]:
        items.append(f"""    <item>
      <title>{esc(p['title'])}</title>
      <link>{p['url']}</link>
      <guid isPermaLink="true">{p['url']}</guid>
      <pubDate>{rfc822(p['date'])}</pubDate>
      <description>{esc(p['description'] or strip_tags(p['html'])[:300])}</description>
    </item>""")
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>{AUTHOR} — Blog</title>
    <link>{SITE}/blog/</link>
    <atom:link href="{SITE}/blog/rss.xml" rel="self" type="application/rss+xml"/>
    <description>Notes on building LLM systems that survive production.</description>
    <language>en</language>
    <managingEditor>{EMAIL} ({AUTHOR})</managingEditor>
    <lastBuildDate>{datetime.now(timezone.utc).strftime('%a, %d %b %Y %H:%M:%S +0000')}</lastBuildDate>
{chr(10).join(items)}
  </channel>
</rss>
"""


def write_sitemap(posts):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    urls = [(f"{SITE}/", today, "monthly", "1.0"),
            (f"{SITE}/blog/", today, "weekly", "0.9")]
    for slug in ["clinical-documentation-agent", "agentic-content-engine",
                 "national-health-subscription-service"]:
        urls.append((f"{SITE}/work/{slug}.html", "2026-09-13", "yearly", "0.8"))
    for p in posts:
        urls.append((p["url"], p["date"], "yearly", "0.7"))
    rows = "\n".join(
        f"  <url>\n    <loc>{u}</loc>\n    <lastmod>{m}</lastmod>\n"
        f"    <changefreq>{c}</changefreq>\n    <priority>{pr}</priority>\n  </url>"
        for u, m, c, pr in urls)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{rows}\n</urlset>\n'


def main():
    posts = load_posts()
    os.makedirs(OUT_DIR, exist_ok=True)

    # Remove HTML for posts that no longer exist (renamed, deleted or set to
    # draft) — otherwise the orphan stays live and indexable.
    keep = {f"{p['slug']}.html" for p in posts} | {"index.html"}
    for fn in os.listdir(OUT_DIR):
        if fn.endswith(".html") and fn not in keep:
            os.remove(os.path.join(OUT_DIR, fn))
            print(f"  - removed stale blog/{fn}")

    for i, p in enumerate(posts):
        prev_post = posts[i + 1] if i + 1 < len(posts) else None
        next_post = posts[i - 1] if i > 0 else None
        path = os.path.join(OUT_DIR, f"{p['slug']}.html")
        open(path, "w", encoding="utf-8").write(render_post(p, prev_post, next_post))
        print(f"  · blog/{p['slug']}.html")
    open(os.path.join(OUT_DIR, "index.html"), "w", encoding="utf-8").write(render_index(posts))
    open(os.path.join(OUT_DIR, "rss.xml"), "w", encoding="utf-8").write(render_rss(posts))
    open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8").write(write_sitemap(posts))
    print(f"  · blog/index.html\n  · blog/rss.xml\n  · sitemap.xml")
    print(f"\n  {len(posts)} post(s) built.")


if __name__ == "__main__":
    main()
