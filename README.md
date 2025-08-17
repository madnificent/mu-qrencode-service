# QR Encode service

Generates QR codes based on `qrencode`

## Tutorials

### Allow users to generate QR codes

QR codes are generated as files with all available metadata.

In docker-compose.yml add

```yaml
  qrencode:
    image: madnificent/qrencode-service
    volumes:
      - ./data/files/:/share/
```

In the dispatcher allow users to generate QR codes:

```elixir
  match "/qr/generate", _ do
    Proxy.forward conn, path, "http://qrencode/generate"
  end
```

Up the service and restart the dispatcher:

```bash
  docker compose up qrencode;
  docker compose restart dispatcher;
```

Generate a QR code like:

```bash
  curl "http://localhost/qr/generate?text=hello%20world"
```

Find the QR code generated in your `./data/files/` folder.  The file service will allow you to download the image from the stack.

## How-to guides

### Enrich each entity of a type with a QR code

We can use "effective changes" to only generate QR codes for entities for which we did not find a QR code yet.  We can attach the QR code to the resource when we first see it.

#### Add qrencode service

The following snippet will run the service in your stack:

```yaml
  qrencode:
    image: madnificent/qrencode-service
    volumes:
      - ./data/files/:/share/
      - ./config/qrencode/delta.js:/config/delta.js
    environment:
      DEFAULT_MU_AUTH_SCOPE: "http://services.semantic.works/qrencode"
```

#### Implement the delta.js configuration

We can scan for the assignment of the type resource.  We should then search the triplestore to discover if there already is a QR code for this URI.  If not, the QR code can be generated.

```js
    import { query, sparqlEscapeUri, update } from "mu";
    import qrEncode from "../lib/qr-encode";

    export default async function delta(req, res) {
      for( const {inserts} of req.body ) {
        for( const triple of inserts ) {
          const subjectUri = triple.subject.value;
          console.log(`Subject URI: ${subjectUri}`);
          if ( isBookTriple(triple) && ! await hasQrCode( subjectUri )) {
            const { uri: qrCodeUri } = await qrEncode(subjectUri);
            await update(`
            PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
            INSERT DATA {
              ${sparqlEscapeUri(subjectUri)} ext:qrCode ${sparqlEscapeUri(qrCodeUri)}.
           }`);
          }
        }
      }

      res.status(204).send();
    }

    async function hasQrCode(uri) {
      return (
        await query(
          `PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
          ASK { ${sparqlEscapeUri(uri)} ext:qrCode ?code }`
        )
      ).boolean;
    }

    function isBookTriple({predicate,object}) {
      return predicate.value === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        && object.type === "uri"
        && object.value === "http://schema.org/Book"
    }
```

#### Wire delta-notifier

The delta-notifier has to forward all book creations.

```js
  {
    match: {
      predicate: { type: "uri", value: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" },
      object: { type: "uri", value: "http://schema.org/Book" }
    },
    callback: {
      url: "http://qrencode/delta", method: "POST"
    },
    options: {
      resourceFormat: "v0.0.1",
      gracePeriod: 1000,
      foldEffectiveChanges: true,
      retry: true,
      retryTimeout: 2000
    }
  }
```

#### Configure sparql-parser

Configure sparql-parser so the necessary information can be written:

##### Used prefixes
    
```lisp
      :mu "http://mu.semte.ch/vocabularies/core/"
      :ext "http://mu.semte.ch/vocabularies/ext/"
      :rdf "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
      :session "http://mu.semte.ch/vocabularies/session/"
      :dct "http://purl.org/dc/terms/"
      :nfo "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#"
      :dbpedia "http://dbpedia.org/resource/"
      :nie "http://www.semanticdesktop.org/ontologies/2007/01/19/nie#"
      :schema "http://schema.org/"
```

##### qr-codes graph

Will contain all generated QR codes and the link to the URI they describe.

```lisp
    (define-graph qr-codes ("http://mu.semte.ch/graphs/qr-codes")
      ("nfo:FileDataObject"
       -> "mu:uuid"
       -> "rdf:type"
       -> "nfo:fileName"
       -> "dct:format"
       -> "nfo:fileSize"
       -> "dbpedia:fileExtension"
       -> "dct:created"
       -> "nie:dataSource"
       -> "schema:embeddedTextCaption"
       <- "ext:qrCode"))
```

##### Access grants

We assume public is a given right, which leads to the following configuration:

```lisp
    (with-scope "service:qrencode"
      (grant (read write)
             :to qr-codes
             :for "public"))
```

#### Extensions

This is all configuration necessary.  As an extension, you may choose to check all books on service startup and generate a QR code for all books which currently lack one.

## Explanation

This service wraps the `qrencode` command.  It provides an easy way to generate QR codes and store them so they can be hosted by the file service.  An additional approach is provided such that QR codes can be generated automatically based on incoming delta messages.

## Reference

### POST /generate

Supply a `string` query parameter to generate a new QR code.  A single json-api object is returned with `uuid` and `uri` attributes.  It has the type `file-data-objects`.

### POST /delta

Processes a delta message by forwarding it to the default export of `/config/delta.js`

### `/config/delta.js`

The default export of this function receives the delta message and can process them to generate QR codes.

### `./lib/qr-encode`

The default export from this file can be used to generate a QR code and store it in the triplestore.

Returns a promise which returns an object containing the `uri` and `uuid` of the logical file containing the generated QR code.

When called from `/config/delta.js` it should be imported as `import qrEncode from '../lib/qr-encode'` (note the two dots).
