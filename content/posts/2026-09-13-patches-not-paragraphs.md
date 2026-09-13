---
title: "Patches, not paragraphs: constrained generation for clinical text"
description: A model that writes the whole document can fail in ways you cannot bound. Emitting a structured patch and rendering deterministically removes an entire class of failure.
date: 2026-09-13
tags: Constrained generation, Retrieval, Evaluation, Clinical NLP
cover: /assets/img/blog/constrained-generation.png
cover_alt: Abstract iridescent form of nested luminous rings, captioned "constrained generation · patch, render, audit"
---

I spent a week on a deceptively simple problem: turn a clinician's dictation into a
complete structured report by editing a supplied normal template. Nine or ten
experiments later, the thing that mattered most had nothing to do with the model.

This is a writeup of what I measured — including the four approaches that sounded
obviously correct and lost.

## The constraint that decided everything

The output was graded against a reference by **edit distance**, not by clinical
quality. Semantically reasonable paraphrases still took a penalty. Once that's true,
the job stops being "write a good report" and becomes "reproduce the expected wording
in the expected field."

That inverts a lot of instincts. Every mechanism that makes a model deliberate,
rewrite or *improve* actively hurt. The winning move was never to reason harder — it
was to show the model what the target looks like and get out of the way.

There's a second-order effect worth naming, because it's where most of the loss hid.
Perturbing a reference by a few percent of its words barely moved the score.
Emitting the **same text** with the line breaks collapsed — so field labels stopped
parsing as labels — was catastrophic, roughly thirty times worse.

**Structural discipline dominated wording.** That single observation drove the
architecture.

## Architecture: patch, then render deterministically

The model never writes a whole report. It emits a JSON patch naming only the fields
it changes:

```json
{
  "BONES": "Degenerative changes are present at L4-L5. No acute fracture.",
  "IMPRESSION": "Degenerative changes, most pronounced at L4-L5."
}
```

A deterministic renderer rebuilds the document from the template, substituting only
the patched fields:

```python
def render(template_fields, patch):
    """Rebuild the report from the template, substituting only patched fields.
    Everything untouched stays byte-identical — no model output involved."""
    out = []
    for label, original in template_fields:          # template order preserved
        value = patch.get(label, original)
        out.append(f"{label}: {value}")
    return "\n".join(out)
```

Eleven lines, and look at what becomes *structurally impossible*:

- Untouched fields stay byte-identical. Not "usually" — always.
- The label inventory and its order always match the template.
- Stray prose cannot leak into a findings section.
- The collapsed-line-structure failure that cost thirty times the score can't happen.

I checked the ceiling before trusting any of it: feeding each reference's own
*gold* patch through the renderer reproduced almost every reference exactly. The
architecture costs essentially nothing in achievable quality, and it deletes entire
failure classes. That asymmetry is the whole argument.

The full path was `retrieve exemplars → build prompt → generate patch → parse
tolerantly → render → repair → audit`. The parser has to be tolerant — models emit
fenced JSON, trailing commas, occasional prose preamble — and the audit is a
non-negotiable last gate:

```python
CRITICAL = re.compile(r"\b(left|right|no|without|mild|moderate|severe)\b|\d+(\.\d+)?\s*(mm|cm)")

def audit(dictation, rendered):
    """Flag dropped laterality, negation, severity or measurements.
    These are the tokens where an error is clinically meaningful."""
    said = set(CRITICAL.findall(dictation.lower()))
    kept = set(CRITICAL.findall(rendered.lower()))
    return said - kept        # non-empty => needs a human
```

Everything downstream is deterministic and inspectable. When output is wrong, you
can tell whether the model chose wrong or the renderer placed it wrong — and those
are very different bugs.

## What worked

**Retrieval, by a distance.** Going from one exemplar to four was the single
highest-leverage change in the project — worth about as much as doubling the model's
parameter count. It saturates fast: sixteen exemplars bought almost nothing over
four, at four times the prompt.

**A stronger model.** Moving from a mid-size open-weights model to a frontier one
was the second-biggest lever. No surprise, but worth quantifying before you pay for it.

**Lower reasoning effort.** This one I did not expect. Across three effort levels the
trend was monotone: **less deliberation scored better**, and ran faster. When the task
is faithful reproduction rather than problem-solving, thinking time is spent
introducing variation you're then penalised for.

## What didn't work — all measured, none of them obvious

**Fine-tuning lost to retrieval.** The references were consistent enough that style
cloning should have worked. A QLoRA fine-tune scored clearly *worse* than simply
prompting the same base model — and worse still when I added exemplars back on top.
A few hundred examples spread over dozens of templates is too thin to teach field
routing through weights, while retrieval supplies the same signal at inference time
without degrading the base model.

One process note that cost me real time: the fine-tune and its baseline were
initially measured on *different* dev subsets. The fine-tune looked competitive until
an exact same-subset control revealed the loss. **Always run the control.**

**Prompt engineering lost, three times.** Each revision came out of correct corpus
analysis — I'd verified the patterns held. All three scored worse. A fourth, written
to isolate prompt *length* as the variable, also lost.

The best explanation I have: replacing an unconditional rule with a conditional one
forces a per-case judgement the model gets wrong in both directions. **A simple rule
applied consistently beat a more accurate rule applied erratically.**

The humbling footnote — a generic prompt I had a mid-size model reverse-engineer from
a dozen examples landed within rounding distance of hours of hand-mined rules. Corpus
statistics do not translate directly into instructions.

**MBR decoding lost.** Sampling five candidates and keeping the one that minimises
mean distance to the others was *worse* than a single greedy pass, at five times the
latency. The consensus of five rewrites is more paraphrased than one first draft.

**Two-stage generation lost, instructively.** Generating findings first, then the
summary, produced the best findings of the entire project — and wrecked the summary.
The cause was mine: stage two only saw the rendered findings, not the original
dictation, so it re-summarised in its own words. Feeding the dictation back recovered
most of it but never caught single-stage.

**Withholding the source text to prevent hallucination cost more than the
hallucination would have.**

## Measurement discipline

Two thirds of the value here came from the scorer, not the pipeline. A local
reimplementation of the metric, validated to return exactly zero on every
self-comparison and to degrade monotonically under injected corruption, is what made
every comparison above trustworthy.

Some discipline worth stealing:

- **Local greedy runs are bit-reproducible.** An identical config reran to an
  identical score. Every local comparison is noise-free, which means small
  differences are real.
- **Sampled API runs were never variance-controlled.** I ran out of budget before the
  repeat runs. So the effort finding — monotone across three levels — is decent
  evidence, while sub-1% differences on that arm are *unresolved*, and I report them
  that way.
- **Anchor your local metric to ground truth at least once.** Mine predicted the real
  score to within about 1.5%, which is what earned it the right to drive decisions.

Knowing which of your numbers are noise-free and which aren't is not pedantry. It is
the difference between a finding and a coincidence.

## The failures that looked like progress

Four separate infrastructure problems burned hours, and every one of them resembled
normal operation:

- **Model downloads crawling at 0.5 MB/s** — a new storage backend hanging on
  connection reuse. Disabling it gave a 10x speedup.
- **A sweep script dying silently mid-run** — `grep` exits non-zero when it matches
  nothing, and `set -e` dutifully killed the script. It looked like the sweep had
  finished.
- **An API run hanging ~30 minutes at 0% CPU** — the client's default ten-minute
  timeout, multiplied by its default retries.
- **An inference process killed with no output** — OOM from long prompts times batch
  size. No traceback, just a missing file.
- **Every HTTPS call failing certificate verification** — a Python build shipping
  without a CA bundle.

The transferable lesson: **filter your logs for failure signatures, not just success
lines.** A silent stall and a working run look identical from the outside, and the
cheapest instrumentation you will ever write is the one that makes a hang loud.

## What transfers

Most of this generalises well beyond clinical text — to anything where output has to
land in a fixed structure and be checkable afterwards:

1. **Constrain the output surface.** Have the model emit the smallest possible
   structured delta and let deterministic code build the artefact. You trade a little
   flexibility for the elimination of whole failure classes.
2. **Verify the ceiling before you optimise.** Push gold-standard inputs through your
   pipeline first. If that doesn't score near-perfectly, you're tuning a model against
   a bug.
3. **Reach for retrieval before fine-tuning.** On a small corpus it was cheaper,
   stronger, and it didn't degrade the base model.
4. **Match effort to the task.** Reproduction is not reasoning. More deliberation made
   it worse.
5. **Own your evaluator.** A local scorer you trust, anchored to reality once, is worth
   more than any individual modelling idea.

The honest summary: the architecture was worth more than the model, retrieval was
worth more than the prompt, and the scorer was worth more than both. Four of the ideas
I was most confident about lost — which is the only reason I know the ones that won
actually did.
