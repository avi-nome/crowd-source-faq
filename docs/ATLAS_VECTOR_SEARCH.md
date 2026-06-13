# Atlas Vector Search — research notes

Researched via the MongoDB official docs (via context7 /mongodb/docs) and
MongoDB community forum. Saved so the next person doesn't repeat the
type-name confusion.

---

## TL;DR

There are **TWO valid JSON shapes** for a vector search index. They use
**different `type` values**. Mixing them up causes Atlas to reject the
index or store it without a queryable field.

| Shape | `type` | When to use |
|---|---|---|
| **Modern `fields` array** | `"vector"` | This is what Atlas UI generates today. |
| **Legacy `mappings.fields` map** | `"knnVector"` | Older createSearchIndex-style. Still works. |

---

## The correct modern shape (what we want)

```json
{
  "name": "vector_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      {
        "type": "vector",            // <-- IMPORTANT: "vector", NOT "knnVector"
        "path": "embedding",
        "numDimensions": 1024,
        "similarity": "dotProduct"
      }
    ]
  }
}
```

**Key fields** (from official MongoDB docs, `/mongodb/docs`):

```js
{
  "type": "vector" | "filter",   // vector = the embedding field, filter = metadata filter
  "path": "<field-to-index>",
  "numDimensions": <int>,
  "similarity": "euclidean" | "cosine" | "dotProduct"
}
```

## The legacy shape (also valid)

```json
{
  "name": "vector_index",
  "type": "vectorSearch",
  "definition": {
    "mappings": {
      "dynamic": false,
      "fields": {
        "embedding": {
          "type": "knnVector",        // <-- "knnVector" here
          "dimensions": 1024,         // <-- "dimensions" (plural) here, NOT "numDimensions"
          "similarity": "dotProduct"
        }
      }
    }
  }
}
```

## Common mistakes

| Mistake | Symptom |
|---|---|
| `type: "knnVector"` in the **fields array** | Atlas rejects with "validation failed" / stores an index with no queryable field |
| `type: "vector"` in the **`mappings.fields` map** | Same — wrong type for that shape |
| `mappings.vectorSearch.dimensions` (no `fields`) | Atlas creates the index but `$vectorSearch` returns empty — there's no field to query against |
| Wrong `numDimensions` | Error: "The indexed field's type doesn't match the index definition" |
| `path` doesn't match a field in the schema | `$vectorSearch` returns empty |

## How `$vectorSearch` uses the index

```js
db.collection.aggregate([
  {
    $vectorSearch: {
      index: "vector_index",       // matches the `name` above
      path: "embedding",           // matches the `path` above
      queryVector: [...],          // the embedding to compare against
      numCandidates: 100,         // how many candidates to consider
      limit: 10,                  // how many results to return
    }
  }
])
```

## Sources

- MongoDB official docs (via context7):
  `https://github.com/mongodb/docs/blob/main/content/manual/manual/source/reference/command/createSearchIndexes.txt`
- Define a Vector Search Index (same repo):
  `https://github.com/mongodb/docs/blob/main/content/manual/manual/source/includes/atlas-search-commands/vector-search-index-definition-fields.rst`
- OpenAI cookbook example (legacy `mappings.fields` format, uses `knnVector`):
  `https://cookbook.openai.com/examples/vector_databases/mongodb_atlas/semantic_search_using_mongodb_atlas_vector_search`
- MongoDB community forum thread on the `createSearchIndex` command:
  `https://www.mongodb.com/community/forums/t/can-i-create-a-vectorsearch-index-with-createsearchindex-command/265546`
