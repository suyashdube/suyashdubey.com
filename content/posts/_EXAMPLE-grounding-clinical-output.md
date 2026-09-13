---
title: Grounding clinical output so a physician will sign it
description: A retrieval layer is not there to make generated text sound better. It is the mechanism that decides what the model is allowed to assert at all.
date: 2026-09-13
tags: RAG, Healthcare, LangGraph
---

Most scribe products win the demo and lose the third week. The interesting
engineering was never the transcription — it was everything that had to be true
before a physician would let a generated sentence into a patient record.

## The constraint

Three things had to hold. Every clinical claim had to trace back to something
said in the encounter or recorded in history. Nothing identifiable could reach a
model that had no business seeing it. And when the output was wrong — it would
sometimes be wrong — we had to reconstruct exactly which prompt version, which
retrieved context and which model call produced it.

- Concrete beats general
- `retrieval` decides what may be asserted
- Redaction happens at the **boundary**, not per call

> A demo needs the model to be right. A clinical system needs you to prove why it
> was right, and to notice quickly when it stops being.

## Code

```python
def assertable(claim, retrieved):
    """A generation node may only assert what retrieval supplied."""
    return any(claim.source_id == doc.id for doc in retrieved)
```

| Layer | Job |
|---|---|
| Redaction | Strip PHI before inference |
| Retrieval | Gate what can be asserted |
| Tracing | Reconstruct any past run |

## What I'd do differently

Decide what the system is allowed to assert, and make retrieval — not the
prompt — the thing that enforces it.
