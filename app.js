// see https://github.com/mu-semtech/mu-javascript-template for more info
import { app, query, update, errorHandler, sparqlEscapeUri, sparqlEscapeDecimal, sparqlEscapeInt, sparqlEscapeDateTime, sparqlEscapeString, uuid } from 'mu';
import { exec } from 'child_process';
import { statSync, rmSync } from 'fs';

app.get('/', function( req, res ) {
  const shareUuid = uuid();
  const shareBasename = `${shareUuid}.png`;
  const shareUri = `share://${shareBasename}`;
  const virtualUuid = uuid();
  const virtualUri = `http://data.redpencil.io/file-data-objects/${virtualUuid}`;

  exec(`qrencode "${req.query.string.replace(/"/g,'\\"')}" -o /share/${shareBasename}; sync`)
    .on('exit', async () => {
    const baseFileDataProperties = `a nfo:FileDataObject;
          nfo:fileName ${sparqlEscapeString(shareBasename)};
          dct:format "image/png";
          nfo:fileSize ${sparqlEscapeInt(statSync(`/share/${shareBasename}`).size)};
          dbpedia:fileExtension ${sparqlEscapeString(`png`)};
          dct:created ${sparqlEscapeDateTime(new Date())}`;

    try {
      await update(`
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
      PREFIX dct: <http://purl.org/dc/terms/>
      PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
      PREFIX dbpedia: <http://dbpedia.org/resource/>
      PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
      PREFIX schema: <http://schema.org/>

      INSERT DATA {
        ${sparqlEscapeUri(shareUri)}
          ${baseFileDataProperties};
          mu:uuid ${sparqlEscapeString(shareUuid)};
          nie:dataSource ${sparqlEscapeUri(virtualUri)}.
        ${sparqlEscapeUri(virtualUri)}
          ${baseFileDataProperties};
          mu:uuid ${sparqlEscapeString(virtualUuid)};
          schema:embeddedTextCaption ${sparqlEscapeString(req.query.string)}.
      }`);

      res.send(JSON.stringify({ data: { type: "file-data-objects", attributes: { uri: virtualUri }}}));
    } catch (e) {
      console.error(`Something went wrong whilst writing out QR code: ${e}`);
      res
        .status(500)
        .send(JSON.stringify({errors: [{code: "500"}]}));
      rmSync(`/share/${shareBasename}`);
    }
  });
});

app.use(errorHandler);
