import { app, errorHandler } from 'mu';
import qrEncode from "./lib/qr-encode";
import delta from './config/delta';

app.post('/generate', async (req, res) => {
  try {
    const { uri, uuid } = await qrEncode(req.query.string);
    res.send(JSON.stringify({ data: { type: "file-data-objects", attributes: { uri, uuid } } }));
  } catch (e) {
    console.error(`Something went wrong whilst writing out QR code: ${e}`);
    res
      .status(500)
      .send(JSON.stringify({ errors: [{ code: "500" }] }));
  }
});

app.post('/delta', (req, res) => {
  delta(req, res);
});

app.use(errorHandler);
