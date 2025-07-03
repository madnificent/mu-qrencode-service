// see https://github.com/mu-semtech/mu-javascript-template for more info
import { app, query, errorHandler } from 'mu';
import { exec } from 'child_process';

app.get('/', function( req, res ) {
  exec(`qrencode "${req.query.string.replace(/"/g,'\\"')}" -o /share/qrcode.png; sync`, (_err, stdout, _stderr) => {
    res.send(stdout);
  });
});

app.use(errorHandler);
